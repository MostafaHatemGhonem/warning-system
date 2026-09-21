import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Member, { MEMBER_ROLES, type MemberRole } from "@/models/member";
import { getCurrentMember, hashPassword } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

const VALID_ROLES = MEMBER_ROLES;

// ─── GET /api/members ─────────────────────────────────────────────────────────
export async function GET() {
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

    await connectToDatabase();

    const members = await Member.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: members }, { status: 200 });
  } catch (error) {
    console.error("GET /api/members error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

// ─── POST /api/members ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const overrideReason = typeof body.overrideReason === "string" ? body.overrideReason.trim() : null;

    const authCheck = can(currentMember, "members.manage", undefined, { overrideReason });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const name:   string      = (body.name  as string)?.trim() ?? "";
    const email:  string      = (body.email as string)?.trim().toLowerCase() ?? "";
    const role:   MemberRole  = VALID_ROLES.includes(body.role as MemberRole) ? (body.role as MemberRole) : "Member";
    const avatar: string      = (body.avatar as string)?.trim() ?? "";
    const isCommitteeMember: boolean = Boolean(body.isCommitteeMember);

    // ── Super Admin role assignment check ─────────────────────────────────────
    if ((role === "Admin" || role === "Super Admin") && currentMember.role !== "Super Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only Super Admins are authorized to create members with Admin or Super Admin role.",
        },
        { status: 403 },
      );
    }

    // ── Privileged Committee Membership Check ─────────────────────────────────
    if (isCommitteeMember && currentMember.role !== "Super Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Only Super Admins are authorized to grant or revoke Committee membership.",
        },
        { status: 403 },
      );
    }

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

    await connectToDatabase();
    const requestId = getOrCreateRequestId(request);

    // ── Duplicate check ───────────────────────────────────────────────────────
    const existing = await Member.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A member with this email already exists" },
        { status: 409 },
      );
    }

    let passwordHash = "";
    if (body.password && typeof body.password === "string" && body.password.trim()) {
      passwordHash = await hashPassword(body.password.trim());
    } else {
      passwordHash = await hashPassword("password123");
    }

    const member = await Member.create({
      name,
      email,
      role,
      avatar,
      isCommitteeMember,
      isActive: true,
      passwordHash,
    });

    const newState = member.toObject();

    // Record immutable audit log for member creation
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "members.create",
      resource: {
        type: "Member",
        id: member._id,
        identifier: `${member.name} (${member.email})`,
      },
      previousState: null,
      newState,
      decisionReason: (body.reason as string) || `Created member profile ${name} (${role})`,
      authorizationResult: authCheck.authorizationResult,
      overrideReason: authCheck.isOverride ? overrideReason : null,
    });

    // If Committee membership granted at creation, record dedicated audit log
    if (isCommitteeMember) {
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "committee.grant",
        resource: {
          type: "Member",
          id: member._id,
          identifier: `${member.name} (${member.email})`,
        },
        previousState: { isCommitteeMember: false },
        newState: { isCommitteeMember: true },
        decisionReason: (body.reason as string) || "Appointed to Committee by Super Admin upon creation",
        authorizationResult: authCheck.authorizationResult,
      });
    }

    return NextResponse.json(
      { success: true, message: "Member created successfully", data: member },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/members error:", error);

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

    return NextResponse.json(
      { success: false, message: "Failed to create member" },
      { status: 500 },
    );
  }
}
