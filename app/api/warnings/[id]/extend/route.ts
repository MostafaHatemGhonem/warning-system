import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { validateExtension } from "@/lib/warning-rules";

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
    const extensionDays = Number(body.extensionDays);
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

    // Contextual Authorization with COI and Override Guards
    const permCheck = can(currentMember, "warnings.extend", warning, { overrideReason });
    if (!permCheck.allowed) {
      return NextResponse.json(
        { success: false, message: permCheck.reason },
        { status: permCheck.status },
      );
    }

    // Business rule validation: single extension, max 30 days, required reason, active status
    if (!permCheck.isOverride) {
      const validation = validateExtension(warning, extensionDays, reason);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, message: validation.error },
          { status: 400 },
        );
      }
    }

    const previousState = warning.toObject();

    // Calculate extended date
    const baseDate = warning.activeUntil ? new Date(warning.activeUntil) : new Date();
    const newActiveUntil = new Date(baseDate);
    newActiveUntil.setDate(newActiveUntil.getDate() + (extensionDays || 30));

    warning.extension = {
      isExtended: true,
      extendedAt: new Date(),
      extendedUntil: newActiveUntil,
      extendedBy: new mongoose.Types.ObjectId(currentMember._id),
      reason,
    };
    warning.activeUntil = newActiveUntil;
    warning.status = "Extended";

    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "warnings.extend",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason: reason || "Warning extension granted",
      authorizationResult: permCheck.authorizationResult,
      overrideReason: permCheck.isOverride ? overrideReason : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Warning extended successfully",
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/extend error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to extend warning" },
      { status: 500 },
    );
  }
}
