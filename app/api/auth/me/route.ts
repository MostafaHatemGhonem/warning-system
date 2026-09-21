import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember, verifyPassword, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/member";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: member,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get current session",
      },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const memberDoc = await Member.findById(currentMember._id).select("+passwordHash");
    if (!memberDoc) {
      return NextResponse.json(
        { success: false, message: "Member record not found" },
        { status: 404 }
      );
    }

    const previousState = memberDoc.toObject();
    let isPasswordUpdated = false;
    let isProfileUpdated = false;

    // 1. Name update
    if (typeof body.name === "string") {
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { success: false, message: "Name must be at least 2 characters long." },
          { status: 400 }
        );
      }
      if (trimmedName !== memberDoc.name) {
        memberDoc.name = trimmedName;
        isProfileUpdated = true;
      }
    }

    // 2. Avatar update
    if (typeof body.avatar === "string") {
      memberDoc.avatar = body.avatar.trim();
      isProfileUpdated = true;
    }

    // 3. Password change
    if (body.currentPassword && body.newPassword) {
      const currentPassword = String(body.currentPassword);
      const newPassword = String(body.newPassword);

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      if (!memberDoc.passwordHash) {
        // First time setting password
        memberDoc.passwordHash = await hashPassword(newPassword);
        isPasswordUpdated = true;
      } else {
        const isValid = await verifyPassword(currentPassword, memberDoc.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { success: false, message: "Current password is incorrect." },
            { status: 400 }
          );
        }
        memberDoc.passwordHash = await hashPassword(newPassword);
        isPasswordUpdated = true;
      }
    }

    if (isProfileUpdated || isPasswordUpdated) {
      await memberDoc.save();
      const newState = memberDoc.toObject();
      delete newState.passwordHash;

      // Record immutable audit log
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "members.update",
        resource: {
          type: "Member",
          id: memberDoc._id,
          identifier: memberDoc.email,
        },
        previousState,
        newState,
        decisionReason: isPasswordUpdated && isProfileUpdated
          ? "Member updated profile details and changed password via Settings"
          : isPasswordUpdated
          ? "Member changed password via Settings"
          : "Member updated personal profile via Settings",
        authorizationResult: "STANDARD_GRANT",
      });
    }

    const updatedSafeMember = {
      _id: memberDoc._id.toString(),
      name: memberDoc.name,
      email: memberDoc.email,
      role: memberDoc.role,
      isCommitteeMember: Boolean(memberDoc.isCommitteeMember),
      avatar: memberDoc.avatar || "",
      isActive: Boolean(memberDoc.isActive),
      createdAt: memberDoc.createdAt,
      updatedAt: memberDoc.updatedAt,
    };

    return NextResponse.json({
      success: true,
      message: isPasswordUpdated
        ? "Password and profile updated successfully."
        : "Profile settings updated successfully.",
      data: updatedSafeMember,
    });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update settings." },
      { status: 500 }
    );
  }
}
