import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { evaluateImprovementPlanOutcome } from "@/lib/warning-rules";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_DECISIONS = ["Accepted", "Extended", "Rejected"] as const;

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

    const finalDecision = body.finalDecision as "Accepted" | "Extended" | "Rejected";
    if (!finalDecision || !VALID_DECISIONS.includes(finalDecision)) {
      return NextResponse.json(
        {
          success: false,
          message: `finalDecision must be one of: ${VALID_DECISIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const finalNotes = typeof body.finalNotes === "string" ? body.finalNotes.trim() : "";
    if (!finalNotes) {
      return NextResponse.json(
        {
          success: false,
          message: "Detailed final evaluation notes are required to document the outcome.",
        },
        { status: 400 },
      );
    }

    const extensionDays = body.extensionDays !== undefined ? Number(body.extensionDays) : undefined;

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
    const authCheck = can(currentMember, "improvement_plans.manage", warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // Conflict of interest: member cannot evaluate their own improvement plan
    const memberIdStr = (
      warning.member && typeof warning.member === "object" && "_id" in warning.member
        ? (warning.member as { _id: unknown })._id
        : warning.member
    )?.toString();

    if (memberIdStr === currentMember._id.toString() && !authCheck.isOverride) {
      return NextResponse.json(
        { success: false, message: "Conflict of interest: Cannot evaluate your own improvement plan." },
        { status: 403 },
      );
    }

    const evaluation = evaluateImprovementPlanOutcome(
      warning,
      finalDecision,
      finalNotes,
      extensionDays,
      new Date(),
    );

    if (!evaluation.isValid) {
      return NextResponse.json(
        { success: false, message: evaluation.error },
        { status: evaluation.status || 400 },
      );
    }

    const previousState = warning.toObject();

    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "improvement_plans.evaluate",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: finalNotes,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    await warning.populate([
      { path: "member", select: "name email role avatar" },
      { path: "improvementPlan.supervisor", select: "name email role" },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: `Improvement plan evaluated as '${finalDecision}' successfully`,
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/improvement-plan/evaluate error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to evaluate improvement plan outcome" },
      { status: 500 },
    );
  }
}
