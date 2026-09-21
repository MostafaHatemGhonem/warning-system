import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning, {
  WARNING_LEVELS,
  WARNING_TYPES,
  WARNING_SEVERITIES,
  WarningLevel,
  WarningType,
  WarningSeverity,
  WarningStatus,
} from "@/models/warning";
import Member from "@/models/member";
import Project from "@/models/project";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { verifyPermission } from "@/lib/permissions";
import { calculateActivePeriod } from "@/lib/warning-rules";

// ─── GET /api/warnings ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPermission("VIEW_WARNINGS");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const filter: Record<string, unknown> = {};

    // Privacy rule: Standard Members only see warnings issued to themselves
    if (auth.member.role === "Member") {
      filter.member = auth.member._id;
    } else {
      const memberParam = searchParams.get("member");
      const projectParam = searchParams.get("project");
      const typeParam = searchParams.get("type");
      const statusParam = searchParams.get("status");

      if (memberParam && mongoose.isValidObjectId(memberParam)) {
        filter.member = memberParam;
      }
      if (projectParam && mongoose.isValidObjectId(projectParam)) {
        filter.project = projectParam;
      }
      if (typeParam && WARNING_TYPES.includes(typeParam as WarningType)) {
        filter.type = typeParam;
      }
      if (statusParam) {
        filter.status = statusParam;
      }
    }

    // Business rule: warnings past activeUntil transition to Pending_Review for formal review
    const now = new Date();
    await Warning.updateMany(
      {
        status: { $in: ["Active", "Extended"] },
        activeUntil: { $ne: null, $lt: now },
      },
      {
        $set: { status: "Pending_Review" },
      },
    );

    const warnings = await Warning.find(filter)
      .sort({ createdAt: -1 })
      .populate("member", "name email role avatar")
      .populate("project", "name")
      .populate("issuedBy", "name email role")
      .lean();

    return NextResponse.json({ success: true, data: warnings }, { status: 200 });
  } catch (error) {
    console.error("GET /api/warnings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch warnings" },
      { status: 500 },
    );
  }
}

// ─── POST /api/warnings ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(request);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    // ── Validate Target Member ────────────────────────────────────────────────
    const memberId = body.member as string;
    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return NextResponse.json(
        { success: false, message: "A valid member ID is required" },
        { status: 400 },
      );
    }

    const targetMember = await Member.findById(memberId).lean();
    if (!targetMember) {
      return NextResponse.json(
        { success: false, message: "Target member does not exist" },
        { status: 404 },
      );
    }

    // ── Validate Type & Project Correlation ───────────────────────────────────
    const type = (body.type as WarningType) || "Project";
    if (!WARNING_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: `Type must be one of: ${WARNING_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    let project: string | null = null;
    if (type === "Project") {
      const projectId = body.project as string;
      if (!projectId || !mongoose.isValidObjectId(projectId)) {
        return NextResponse.json(
          { success: false, message: "Project is required for Project Warnings" },
          { status: 400 },
        );
      }
      const targetProject = await Project.findById(projectId).lean();
      if (!targetProject) {
        return NextResponse.json(
          { success: false, message: "Target project does not exist" },
          { status: 404 },
        );
      }
      project = projectId;
    } else if (type === "Global") {
      if (body.project) {
        return NextResponse.json(
          { success: false, message: "Global Warnings cannot be tied to a specific project" },
          { status: 400 },
        );
      }
      project = null;
    }

    // ── Validate Level & Severity ─────────────────────────────────────────────
    const level = body.level as WarningLevel;
    if (!level || !WARNING_LEVELS.includes(level)) {
      return NextResponse.json(
        { success: false, message: `Level must be one of: ${WARNING_LEVELS.join(", ")}` },
        { status: 400 },
      );
    }

    // Authorization evaluation via can()
    const action = level === "Final Warning" ? "warnings.issue_final" : "warnings.issue_standard";
    const authCheck = can(
      currentMember,
      action,
      { member: targetMember, project, level, type },
      { overrideReason },
    );
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const severityNum = Number(body.severity) as WarningSeverity;
    const severity: WarningSeverity = WARNING_SEVERITIES.includes(severityNum)
      ? severityNum
      : 1;

    // ── Validate Direct Final Warning ─────────────────────────────────────────
    const isDirectFinalWarning = Boolean(body.isDirectFinalWarning);
    const directIssuanceReason = (body.directIssuanceReason as string)?.trim() ?? "";

    if (isDirectFinalWarning) {
      if (level !== "Final Warning") {
        return NextResponse.json(
          { success: false, message: "Direct Final Warning must be of level 'Final Warning'" },
          { status: 400 },
        );
      }
      if (severity !== 3) {
        return NextResponse.json(
          { success: false, message: "Direct Final Warning requires severe violation (Severity 3)" },
          { status: 400 },
        );
      }
      if (!directIssuanceReason) {
        return NextResponse.json(
          { success: false, message: "A justification reason is required when issuing a direct Final Warning" },
          { status: 400 },
        );
      }
    }

    // ── Validate Description ──────────────────────────────────────────────────
    const description = (body.description as string)?.trim();
    if (!description) {
      return NextResponse.json(
        { success: false, message: "Factual incident description is required" },
        { status: 400 },
      );
    }

    // Incident date
    let incidentDate = new Date();
    if (body.incidentDate) {
      const parsedDate = new Date(body.incidentDate as string);
      if (!isNaN(parsedDate.getTime())) {
        incidentDate = parsedDate;
      }
    }

    const evidence = Array.isArray(body.evidence)
      ? (body.evidence as unknown[]).filter((e): e is string => typeof e === "string" && !!e.trim())
      : [];

    // Points calculation (defaults to severity level: 1, 2, or 3)
    const points = typeof body.points === "number" && body.points >= 1 && body.points <= 3
      ? body.points
      : severity;

    // Security check: issuedBy is ALWAYS strictly taken from authenticated member
    const issuedBy = currentMember._id;

    // Normal progression: standard project warnings can become Active immediately upon issuance
    // Super Admin privilege: can directly activate ANY warning immediately (bypassing committee hold)
    const isSuperAdmin = currentMember.role === "Super Admin";
    const shouldAutoActivate =
      Boolean(body.autoActivate) &&
      (isSuperAdmin || (type === "Project" && !isDirectFinalWarning));
    const now = new Date();
    let initialStatus: WarningStatus = "Pending_Approval";
    let activeFrom: Date | null = null;
    let activeUntil: Date | null = null;
    let approvedBy: mongoose.Types.ObjectId | null = null;
    let approvedAt: Date | null = null;
    let notifiedAt: Date | null = null;

    if (shouldAutoActivate) {
      initialStatus = "Active";
      const { activeFrom: af, activeUntil: au } = calculateActivePeriod(level, now);
      activeFrom = af;
      activeUntil = au;
      approvedBy = new mongoose.Types.ObjectId(issuedBy);
      approvedAt = now;
      notifiedAt = now;
    }

    const warning = await Warning.create({
      member: memberId,
      project,
      type,
      level,
      severity,
      points,
      isDirectFinalWarning,
      directIssuanceReason,
      incidentDate,
      description,
      evidence,
      status: initialStatus,
      issuedBy,
      activeFrom,
      activeUntil,
      approvedBy,
      approvedAt,
      notifiedAt,
    });

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "warnings.issue",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState: null,
      newState: warning.toObject(),
      decisionReason: description,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Warning created successfully",
        data: warning,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/warnings error:", error);

    // Mongoose validation error handling
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: unknown }).name === "ValidationError"
    ) {
      const validationError = error as unknown as { message: string };
      return NextResponse.json(
        { success: false, message: validationError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create warning" },
      { status: 500 },
    );
  }
}
