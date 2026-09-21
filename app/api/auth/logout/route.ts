import { NextRequest, NextResponse } from "next/server";

import { destroyCurrentSession, getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const member = await getCurrentMember();
    const requestId = getOrCreateRequestId(req);

    if (member) {
      await recordAuditLog({
        requestId,
        actor: {
          _id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          isCommitteeMember: Boolean(member.isCommitteeMember),
        },
        action: "members.logout",
        resource: {
          type: "Member",
          id: member._id,
          identifier: `${member.name} (${member.email})`,
        },
        previousState: { isActive: member.isActive },
        newState: null,
        decisionReason: "User terminated web session (logout)",
        authorizationResult: "STANDARD_GRANT",
      });
    }

    await destroyCurrentSession();

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to log out",
      },
      { status: 500 },
    );
  }
}
