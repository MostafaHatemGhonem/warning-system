import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Warning, { WARNING_SEVERITIES, WarningSeverity } from "@/models/warning";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { verifyPermission } from "@/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/warnings/[id] ───────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyPermission("VIEW_WARNINGS");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
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

    const warning = await Warning.findById(id)
      .populate("member", "name email role avatar")
      .populate("project", "name")
      .populate("issuedBy", "name email role")
      .lean();

    if (!warning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
      );
    }

    // Privacy rule: Standard Members can only view their own warnings
    const targetMemberId = typeof warning.member === "object" && warning.member !== null
      ? (warning.member as { _id: mongoose.Types.ObjectId })._id.toString()
      : (warning.member as mongoose.Types.ObjectId).toString();

    if (auth.member.role === "Member" && targetMemberId !== auth.member._id.toString()) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You cannot view warnings issued to other members" },
        { status: 403 },
      );
    }

    // Business rule: warnings past activeUntil transition to Pending_Review for formal review
    const now = new Date();
    if (
      (warning.status === "Active" || warning.status === "Extended") &&
      warning.activeUntil &&
      new Date(warning.activeUntil) < now
    ) {
      await Warning.findByIdAndUpdate(id, { $set: { status: "Pending_Review" } });
      warning.status = "Pending_Review";
    }

    return NextResponse.json({ success: true, data: warning }, { status: 200 });
  } catch (error) {
    console.error("GET /api/warnings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch warning" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/warnings/[id] ─────────────────────────────────────────────────
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
        { success: false, message: "Invalid warning id" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const existingWarning = await Warning.findById(id);
    if (!existingWarning) {
      return NextResponse.json(
        { success: false, message: "Warning not found" },
        { status: 404 },
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

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    // Authorization evaluation via can()
    const authCheck = can(currentMember, "warnings.edit", existingWarning, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const previousState = existingWarning.toObject();

    // ── Strictly Whitelisted Updates (Security Constraint) ────────────────────
    // Forbidden fields: member, issuedBy, approvedBy, approvedAt, activeFrom,
    // activeUntil, review, suspension, committee decisions, status.
    const updates: Record<string, unknown> = {};

    if ("description" in body && typeof body.description === "string") {
      const trimmed = body.description.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, message: "Description cannot be empty" },
          { status: 400 },
        );
      }
      updates.description = trimmed;
    }

    if ("evidence" in body && Array.isArray(body.evidence)) {
      updates.evidence = (body.evidence as unknown[]).filter(
        (e): e is string => typeof e === "string" && !!e.trim(),
      );
    }

    if ("severity" in body) {
      const sevNum = Number(body.severity) as WarningSeverity;
      if (WARNING_SEVERITIES.includes(sevNum)) {
        updates.severity = sevNum;
      }
    }

    if ("points" in body && typeof body.points === "number") {
      if (body.points >= 1 && body.points <= 3) {
        updates.points = body.points;
      }
    }

    if ("incidentDate" in body && body.incidentDate) {
      const parsedDate = new Date(body.incidentDate as string);
      if (!isNaN(parsedDate.getTime())) {
        updates.incidentDate = parsedDate;
      }
    }

    if ("directIssuanceReason" in body && typeof body.directIssuanceReason === "string") {
      updates.directIssuanceReason = body.directIssuanceReason.trim();
    }

    if ("memberResponse" in body && typeof body.memberResponse === "object" && body.memberResponse !== null) {
      const resp = body.memberResponse as { text?: string };
      updates.memberResponse = {
        text: typeof resp.text === "string" ? resp.text.trim() : "",
        submittedAt: new Date(),
      };
    }

    const updated = await Warning.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("member", "name email role avatar")
      .populate("project", "name")
      .populate("issuedBy", "name email role");

    if (updated) {
      const newState = updated.toObject();
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "warnings.edit",
        resource: {
          type: "Warning",
          id: existingWarning._id,
          identifier: `${existingWarning.type} - ${existingWarning.level}`,
        },
        previousState,
        newState,
        decisionReason: (body.decisionReason as string) || (body.description as string) || "Warning record updated",
        authorizationResult: authCheck.authorizationResult,
        overrideReason: authCheck.isOverride ? overrideReason : null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Warning updated successfully",
        data: updated,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("PATCH /api/warnings/[id] error:", error);

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
      { success: false, message: "Failed to update warning" },
      { status: 500 },
    );
  }
}
