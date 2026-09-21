import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning, { MAX_SUSPENSION_HOURS } from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import {
  validateSuspension,
  applyTemporarySuspension,
  liftTemporarySuspension,
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
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const hours = body.suspensionHours !== undefined ? Number(body.suspensionHours) : MAX_SUSPENSION_HOURS;

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const warning = await Warning.findById(id);
    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    // Full COI and Override checks
    const coiCheck = can(currentMember, "suspensions.issue", warning, { overrideReason });
    if (!coiCheck.allowed) {
      return NextResponse.json(
        { success: false, message: coiCheck.reason },
        { status: coiCheck.status },
      );
    }

    if (!coiCheck.isOverride) {
      const validation = validateSuspension(hours, reason);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, message: validation.error },
          { status: validation.status || 400 },
        );
      }
    }

    const previousState = warning.toObject();

    applyTemporarySuspension(warning, reason, hours, new Date());
    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "warnings.suspend",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: reason,
      authorizationResult: coiCheck.authorizationResult,
      overrideReason: coiCheck.isOverride ? overrideReason : null,
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
        message: "Temporary protective suspension applied successfully",
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/suspension error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to apply temporary suspension" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const warning = await Warning.findById(id);
    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    const permCheck = can(currentMember, "suspensions.issue", warning);
    if (!permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: permCheck.reason },
        { status: permCheck.status },
      );
    }

    const previousState = warning.toObject();

    liftTemporarySuspension(warning);
    await warning.save();

    const newState = warning.toObject();

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "warnings.suspend",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: "Temporary suspension lifted after review",
      authorizationResult: permCheck.authorizationResult,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Temporary suspension lifted successfully",
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/warnings/[id]/suspension error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to lift temporary suspension" },
      { status: 500 },
    );
  }
}
