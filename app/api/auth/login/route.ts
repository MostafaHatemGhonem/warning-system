import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/member";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let body: { email?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Fetch member and explicitly select passwordHash
    const member = await Member.findOne({ email }).select("+passwordHash");

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Safety check: if member has no password set yet
    if (!member.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: "No password has been set for this account yet. Please contact an administrator.",
        },
        { status: 401 },
      );
    }

    // Verify account is active
    if (!member.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Account is deactivated. Please contact an administrator.",
        },
        { status: 403 },
      );
    }

    // Compare password with stored hash
    const isMatch = await verifyPassword(password, member.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create session in MongoDB
    const { token, expiresAt } = await createSession(member._id);

    // Set secure HTTP-only cookie
    await setSessionCookie(token, expiresAt);

    const requestId = getOrCreateRequestId(req);

    // Record immutable audit log for authentication
    await recordAuditLog({
      requestId,
      actor: {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        isCommitteeMember: Boolean(member.isCommitteeMember),
      },
      action: "members.login",
      resource: {
        type: "Member",
        id: member._id,
        identifier: `${member.name} (${member.email})`,
      },
      previousState: null,
      newState: {
        role: member.role,
        email: member.email,
        name: member.name,
        isActive: member.isActive,
      },
      decisionReason: "User authenticated and initiated web session",
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Logged in successfully",
        data: {
          _id: member._id.toString(),
          name: member.name,
          email: member.email,
          role: member.role,
          avatar: member.avatar,
          isActive: member.isActive,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to log in" },
      { status: 500 },
    );
  }
}
