import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/warnings/[id]/refer-removal
 * Submits a formal referral to the Governance Committee for Project Removal
 * under Clause 14 of the Infinity Explorers Disciplinary & Governance Policy.
 *
 * Rule (Clause 14):
 * - Project Lead / Team Leader cannot remove members unilaterally.
 * - Facts, evidence, and removal recommendation must be submitted to the Committee.
 * - This endpoint sets disciplinaryRecommendation = "Refer_To_Formal_Removal_Review"
 *   and creates an immutable audit trail.
 */
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

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const evidenceNotes = typeof body.evidenceNotes === "string" ? body.evidenceNotes.trim() : "";
    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    if (!reason || reason.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "A substantiated rationale of at least 10 characters is required to refer for Project Removal (Clause 14).",
        },
        { status: 400 },
      );
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

    // Contextual Authorization via can()
    const authCheck = can(currentMember, "cases.refer_removal", warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const previousState = warning.toObject();

    // Enact Clause 14 referral
    if (!warning.review) {
      warning.review = {
        status: "None",
        disciplinaryRecommendation: "Refer_To_Formal_Removal_Review",
      } as any;
    } else {
      warning.review.disciplinaryRecommendation = "Refer_To_Formal_Removal_Review";
      if (reason) {
        warning.review.decisionNotes = warning.review.decisionNotes
          ? `${warning.review.decisionNotes}\n\n[Project Removal Referral]: ${reason}`
          : `[Project Removal Referral]: ${reason}`;
      }
    }

    if (evidenceNotes) {
      warning.evidence = warning.evidence || [];
      warning.evidence.push(`[Removal Referral Evidence]: ${evidenceNotes}`);
    }

    await warning.save();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "cases.refer_removal",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} Warning (${warning.level}) - Project Removal Referral`,
      },
      previousState,
      newState: warning.toObject(),
      decisionReason: `Project Removal referred under Clause 14: ${reason}`,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
      metadata: {
        evidenceNotes: evidenceNotes || undefined,
        referredByRole: currentMember.role,
      },
    });

    const populated = await Warning.findById(warning._id)
      .populate("member", "name email role avatar")
      .populate("project", "name")
      .populate("issuedBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Case formally referred for Committee Project Removal review under Clause 14.",
      data: populated,
    });
  } catch (error) {
    console.error("POST /api/warnings/[id]/refer-removal error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to refer for project removal" },
      { status: 500 },
    );
  }
}
