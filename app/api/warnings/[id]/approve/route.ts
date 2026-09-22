import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import {
  checkApprovalEligibility,
  executeWarningApproval,
} from "@/lib/warning-rules";
import { createNotification } from "@/lib/notifications";
import { sendWarningIssuedEmail } from "@/lib/email/send-email";

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

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty on simple POST approve
      body = {};
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;
    const decisionReason =
      typeof body.decisionReason === "string" && body.decisionReason.trim()
        ? body.decisionReason.trim()
        : typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : "Warning formally approved and activated";

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const warning = await Warning.findById(id);
    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    const previousState = warning.toObject();

    // Strict State Machine Invariant: Only 'Pending_Approval' warnings can be approved
    if (warning.status !== "Pending_Approval") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot approve warning: Current status is '${warning.status}'. Only warnings in 'Pending_Approval' status can be approved.`,
        },
        { status: 400 },
      );
    }

    // 1. Contextual Authorization with COI and Override Guards
    const action =
      warning.type === "Global"
        ? "warnings.approve_global"
        : warning.level === "Final Warning"
          ? "warnings.approve_final"
          : "warnings.approve_standard";

    const authCheck = can(currentMember, action, warning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // 2. Business Rules & Eligibility Check (unless super admin override)
    if (!authCheck.isOverride) {
      const eligibility = checkApprovalEligibility(warning, currentMember);
      if (!eligibility.canApprove) {
        return NextResponse.json(
          { success: false, message: eligibility.error },
          { status: eligibility.status || 400 },
        );
      }
    }

    // Execute approval and compute validity window (activeFrom/activeUntil)
    executeWarningApproval(warning, currentMember._id, new Date());
    await warning.save();

    const newState = warning.toObject();

    // Record immutable audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "warnings.approve",
      resource: {
        type: "Warning",
        id: warning._id,
        identifier: `${warning.type} - ${warning.level}`,
      },
      previousState,
      newState,
      decisionReason,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    await warning.populate([
      { path: "member", select: "name email role avatar" },
      { path: "project", select: "name title" },
      { path: "issuedBy", select: "name email role" },
      { path: "approvedBy", select: "name email role" },
    ]);

    // ── Dispatch In-App & Email Notifications on Warning Approval ───────────
    const recipientMember = warning.member as any;
    const projectDoc = warning.project as any;
    const approverName = currentMember.name;
    const issuerName = (warning.issuedBy as any)?.name || approverName;

    try {
      await createNotification({
        recipientId: recipientMember?._id || recipientMember,
        title: `Warning Approved: ${warning.level}`,
        message:
          warning.type === "Project"
            ? `Your ${warning.level} for project "${projectDoc?.name || "Project"}" has been approved and activated.`
            : `Your global ${warning.level} has been approved and activated.`,
        type: "warning_issued",
        link: "/dashboard/warnings",
        actor: {
          _id: currentMember._id,
          name: currentMember.name,
          role: currentMember.role,
        },
        metadata: {
          warningId: warning._id.toString(),
          level: warning.level,
          status: "Active",
          type: warning.type,
          severity: warning.severity,
          points: warning.points,
        },
      });
    } catch (notifErr) {
      console.warn("[Notifications] Failed to create in-app notification on approval:", notifErr);
    }

    if (recipientMember && recipientMember.email) {
      sendWarningIssuedEmail({
        email: recipientMember.email,
        userName: recipientMember.name,
        warningLevel: warning.level,
        warningType: warning.type,
        projectName: projectDoc?.name || projectDoc?.title || "Global / Organization-wide",
        severity: warning.severity,
        points: warning.points,
        description: warning.description,
        incidentDate: warning.incidentDate,
        issuedBy: issuerName,
        warningId: warning._id.toString(),
        status: "Active",
      }).catch((emailErr) => {
        console.warn("[Email] Failed to dispatch warning approval email:", emailErr);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Warning approved and activated successfully",
        data: warning,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/warnings/[id]/approve error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to approve warning" },
      { status: 500 },
    );
  }
}
