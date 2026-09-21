import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Member, { MEMBER_ROLES, type MemberRole } from "@/models/member";
import { getCurrentMember, hashPassword } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_ROLES = MEMBER_ROLES;

// ─── GET /api/members/[id] ────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const canView =
      currentMember.role === "Super Admin" ||
      hasPermission(
        currentMember.role as MemberRole,
        "members.view",
        Boolean(currentMember.isCommitteeMember),
      );

    if (!canView) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not possess 'members.view' permission." },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid member id" }, { status: 400 });
    }

    await connectToDatabase();
    const member = await Member.findById(id).lean();

    if (!member) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("GET /api/members/[id] error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch member" }, { status: 500 });
  }
}

// ─── PATCH /api/members/[id] ──────────────────────────────────────────────────
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
      return NextResponse.json({ success: false, message: "Invalid member id" }, { status: 400 });
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const targetMember = await Member.findById(id);
    if (!targetMember) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    const authCheck = can(currentMember, "members.manage", targetMember, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const name: string = (body.name as string)?.trim() ?? targetMember.name;
    const email: string = (body.email as string)?.trim().toLowerCase() ?? targetMember.email;
    const role: MemberRole = body.role && VALID_ROLES.includes(body.role as MemberRole)
      ? (body.role as MemberRole)
      : targetMember.role;
    const avatar: string = typeof body.avatar === "string" ? body.avatar.trim() : targetMember.avatar || "";

    // ── Validation ────────────────────────────────────────────────────────────
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 },
      );
    }

    // ── Duplicate email check (exclude self) ──────────────────────────────────
    const conflict = await Member.findOne({ email, _id: { $ne: id } }).lean();
    if (conflict) {
      return NextResponse.json(
        { success: false, message: "Another member with this email already exists" },
        { status: 409 },
      );
    }

    // Only Super Admin can edit a Super Admin account
    if (targetMember.role === "Super Admin" && currentMember.role !== "Super Admin") {
      return NextResponse.json(
        { success: false, message: "Only Super Admins can modify Super Admin accounts." },
        { status: 403 },
      );
    }

    // Only Super Admin can assign Admin or Super Admin role
    if (
      (role === "Admin" || role === "Super Admin") &&
      role !== targetMember.role &&
      currentMember.role !== "Super Admin"
    ) {
      return NextResponse.json(
        { success: false, message: "Only Super Admins can assign the Admin or Super Admin role." },
        { status: 403 },
      );
    }

    // ── Privileged Committee Membership Lifecycle ─────────────────────────────
    let isCommitteeChanged = false;
    let newCommitteeValue = Boolean(targetMember.isCommitteeMember);

    if ("isCommitteeMember" in body) {
      const requestedCommittee = Boolean(body.isCommitteeMember);
      if (requestedCommittee !== Boolean(targetMember.isCommitteeMember)) {
        if (currentMember.role !== "Super Admin") {
          return NextResponse.json(
            {
              success: false,
              message: "Forbidden: Only Super Admins are authorized to grant or revoke Committee membership.",
            },
            { status: 403 },
          );
        }
        isCommitteeChanged = true;
        newCommitteeValue = requestedCommittee;
      }
    }

    const previousState = targetMember.toObject();

    const updateFields: Record<string, unknown> = {
      name,
      email,
      role,
      avatar,
      isCommitteeMember: newCommitteeValue,
    };

    // Optional password reset
    if (body.password && typeof body.password === "string" && body.password.trim().length >= 6) {
      updateFields.passwordHash = await hashPassword(body.password.trim());
    }

    const updated = await Member.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (updated) {
      const newState = updated.toObject();

      // Record standard member update audit log
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "members.update",
        resource: {
          type: "Member",
          id: targetMember._id,
          identifier: `${updated.name} (${updated.email})`,
        },
        previousState,
        newState,
        decisionReason: (body.reason as string) || "Updated member profile fields",
        authorizationResult: authCheck.authorizationResult,
        overrideReason: authCheck.isOverride ? overrideReason : null,
      });

      // Record dedicated committee grant/revoke audit log
      if (isCommitteeChanged) {
        await recordAuditLog({
          requestId,
          actor: currentMember,
          action: newCommitteeValue ? "committee.grant" : "committee.revoke",
          resource: {
            type: "Member",
            id: targetMember._id,
            identifier: `${updated.name} (${updated.email})`,
          },
          previousState: { isCommitteeMember: !newCommitteeValue },
          newState: { isCommitteeMember: newCommitteeValue },
          decisionReason:
            (body.committeeReason as string) ||
            (body.reason as string) ||
            (newCommitteeValue
              ? "Super Admin granted Committee authority"
              : "Super Admin revoked Committee authority"),
          authorizationResult: "STANDARD_GRANT",
        });
      }
    }

    return NextResponse.json({ success: true, message: "Member updated", data: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/members/[id] error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "Another member with this email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: false, message: "Failed to update member" }, { status: 500 });
  }
}
