import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning, {
  REVIEW_DECISIONS,
  ReviewDecision,
  WarningLevel,
  WarningSeverity,
  WARNING_LEVELS,
  WARNING_SEVERITIES,
} from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import {
  validateReviewDecisionEligibility,
  executeReviewDecision,
} from "@/lib/warning-rules";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid warning id" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    const decision = body.decision as ReviewDecision;
    if (!decision || !REVIEW_DECISIONS.includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          message: `Decision must be one of: ${REVIEW_DECISIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const decisionNotes = typeof body.decisionNotes === "string" ? body.decisionNotes.trim() : "";
    if (!decisionNotes) {
      return NextResponse.json(
        {
          success: false,
          message: "Detailed decision notes are required to document the review outcome.",
        },
        { status: 400 },
      );
    }

    // Optional options for Reduce decision
    let newLevel: WarningLevel | undefined;
    if (body.newLevel && WARNING_LEVELS.includes(body.newLevel as WarningLevel)) {
      newLevel = body.newLevel as WarningLevel;
    }

    let newPoints: number | undefined;
    if (typeof body.newPoints === "number" && body.newPoints >= 1 && body.newPoints <= 3) {
      newPoints = body.newPoints;
    }

    let newSeverity: WarningSeverity | undefined;
    if (body.newSeverity && WARNING_SEVERITIES.includes(Number(body.newSeverity) as WarningSeverity)) {
      newSeverity = Number(body.newSeverity) as WarningSeverity;
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const warning = await Warning.findById(id);
    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    // 1. Authorization check with COI, Neutrality and Override guards
    const authCheck = can(currentMember, "appeals.decide", warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // 2. Strict neutrality check (unless super admin override)
    if (!authCheck.isOverride) {
      const eligibility = validateReviewDecisionEligibility(warning, currentMember);
      if (!eligibility.canDecide) {
        return NextResponse.json(
          { success: false, message: eligibility.error },
          { status: eligibility.status || 400 },
        );
      }
    }

    const previousState = warning.toObject();

    // Execute review decision state transitions
    executeReviewDecision(warning, decision, decisionNotes, currentMember._id, {
      newLevel,
      newPoints,
      newSeverity,
    });

    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "appeals.decide",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: decisionNotes,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    await warning.populate([
      { path: "member", select: "name email role avatar" },
      { path: "project", select: "name title" },
      { path: "issuedBy", select: "name email role" },
      { path: "approvedBy", select: "name email role" },
      { path: "review.decidedBy", select: "name email role" },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: `Review decision '${decision}' executed successfully`,
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/review/decision error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to record review decision" },
      { status: 500 },
    );
  }
}
