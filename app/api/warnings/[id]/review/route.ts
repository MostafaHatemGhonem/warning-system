import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning, { calculateAppealDeadline } from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { validateAppealSubmission } from "@/lib/warning-rules";

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
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

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
    const authCheck = can(currentMember, "appeals.submit", warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // Validate 7-day appeal window, active state, single appeal, and subject authorization
    if (!authCheck.isOverride) {
      const validation = validateAppealSubmission(
        warning,
        currentMember._id,
        currentMember.role,
        reason,
        new Date(),
      );

      if (!validation.canAppeal) {
        return NextResponse.json(
          { success: false, message: validation.error },
          { status: validation.status || 400 },
        );
      }
    }

    const previousState = warning.toObject();

    const notificationDate = warning.notifiedAt || warning.approvedAt || warning.activeFrom;
    const deadline =
      warning.review?.appealDeadline ||
      (notificationDate ? calculateAppealDeadline(new Date(notificationDate)) : calculateAppealDeadline(new Date()));

    warning.status = "Under_Review";
    warning.review = {
      status: "Requested",
      requestedAt: new Date(),
      reason,
      appealDeadline: deadline,
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    };

    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "appeals.submit",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: reason || "Appeal submitted",
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    await warning.populate([
      { path: "member", select: "name email role avatar" },
      { path: "project", select: "name title" },
      { path: "issuedBy", select: "name email role" },
      { path: "approvedBy", select: "name email role" },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Review / appeal requested successfully",
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/review error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit review / appeal" },
      { status: 500 },
    );
  }
}
