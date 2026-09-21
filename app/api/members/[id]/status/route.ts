import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/member";
import Session from "@/models/session";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

// ─── PATCH /api/members/[id]/status ──────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
        { success: false, message: "Invalid member id" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (typeof body?.isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "isActive must be a boolean value (true or false)" },
        { status: 400 },
      );
    }

    const isActive = body.isActive;
    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;
    const decisionReason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : !isActive
          ? ""
          : "Account status activated";

    // Deactivation requires explicit decision reason
    if (!isActive && !decisionReason) {
      return NextResponse.json(
        {
          success: false,
          message: "A documented reason is strictly mandatory when deactivating a member account.",
        },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const targetMember = await Member.findById(id);
    if (!targetMember) {
      return NextResponse.json(
        { success: false, message: "Member not found" },
        { status: 404 },
      );
    }

    // Contextual Authorization via can() with protected account checks
    const authCheck = can(currentMember, "members.manage_status", targetMember, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const previousState = targetMember.toObject();

    const updated = await Member.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true, runValidators: true },
    );

    // If deactivated, revoke active sessions immediately
    if (isActive === false) {
      await Session.deleteMany({ memberId: id });
    }

    if (updated) {
      const newState = updated.toObject();
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "members.status_change",
        resource: {
          type: "Member",
          id: targetMember._id,
          identifier: `${updated.name} (${updated.email})`,
        },
        previousState,
        newState,
        decisionReason,
        authorizationResult: authCheck.authorizationResult,
        overrideReason: authCheck.isOverride ? overrideReason : null,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Member ${isActive ? "activated" : "deactivated"} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/members/[id]/status error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update member status" },
      { status: 500 },
    );
  }
}
