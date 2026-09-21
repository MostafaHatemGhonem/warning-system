import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/models/audit-log";
import type { MemberRole } from "@/models/member";

export async function GET() {
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
          message: "Forbidden: Activity statistics are strictly restricted to Admin and Super Admin only.",
        },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const baseFilter: Record<string, unknown> = {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalEvents,
      todayEvents,
      governanceEvents,
      overridesCount,
      resourceTypeCounts,
      recentActivity,
    ] = await Promise.all([
      AuditLog.countDocuments(baseFilter),
      AuditLog.countDocuments({
        ...baseFilter,
        createdAt: { $gte: startOfToday },
      }),
      AuditLog.countDocuments({
        ...baseFilter,
        action: {
          $regex: /^(warnings|appeals|committee|cases|improvement_plans)\./i,
        },
      }),
      AuditLog.countDocuments({
        ...baseFilter,
        authorizationResult: "SUPER_ADMIN_OVERRIDE",
      }),
      AuditLog.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$resource.type", count: { $sum: 1 } } },
      ]),
      AuditLog.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const resourceTypeBreakdown: Record<string, number> = {
      Warning: 0,
      Member: 0,
      Project: 0,
      Task: 0,
      Committee: 0,
    };

    resourceTypeCounts.forEach((item: { _id: string; count: number }) => {
      if (item._id) {
        resourceTypeBreakdown[item._id] = item.count;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        todayEvents,
        governanceEvents,
        overridesCount,
        resourceTypeBreakdown,
        recentActivity,
        viewerScope: "ORGANIZATION_WIDE",
      },
    });
  } catch (error) {
    console.error("GET /api/audit-logs/stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch audit log stats" },
      { status: 500 },
    );
  }
}
