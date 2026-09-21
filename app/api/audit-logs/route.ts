import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/models/audit-log";
import type { MemberRole } from "@/models/member";

export async function GET(req: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const isAuthorized =
      currentMember.role === "Super Admin" || currentMember.role === "Admin";

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Activity logs are strictly restricted to Admin and Super Admin only.",
        },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const category = searchParams.get("category");
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");
    const actorId = searchParams.get("actorId");
    const authorizationResult = searchParams.get("authorizationResult");
    const requestId = searchParams.get("requestId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Standard filters
    if (action) {
      filter.action = action;
    } else if (category && category !== "all") {
      filter.action = { $regex: new RegExp(`^${category}\\.`, "i") };
    }

    if (resourceType && resourceType !== "all") {
      filter["resource.type"] = resourceType;
    }
    if (resourceId) filter["resource.id"] = resourceId;
    if (actorId) filter["actor._id"] = actorId;
    if (authorizationResult && authorizationResult !== "all") {
      filter.authorizationResult = authorizationResult;
    }
    if (requestId) filter.requestId = requestId;

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          dateFilter.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          if (endDate.length === 10) end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    // Free-text search filter across actor, resource identifier, reason, requestId
    if (search && search.trim()) {
      const clean = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(clean, "i");
      filter.$or = [
        { "actor.name": regex },
        { "actor.email": regex },
        { "resource.identifier": regex },
        { decisionReason: regex },
        { overrideReason: regex },
        { requestId: regex },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      viewerScope: "ORGANIZATION_WIDE",
    });
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
