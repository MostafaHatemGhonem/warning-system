import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import Member from "@/models/member";
import Warning from "@/models/warning";
import Committee from "@/models/committee";
import AuditLog from "@/models/audit-log";
import Session from "@/models/session";

export async function GET(req: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Strict role check: Admin & Super Admin ONLY
    const isAuthorized = currentMember.role === "Super Admin" || currentMember.role === "Admin";
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Administration hub is restricted to Administrators and Super Administrators.",
        },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const now = new Date();

    const [
      totalMembers,
      activeMembers,
      membersList,
      activeSessionsCount,
      totalAuditLogs,
      overridesCount,
      tiedCommittees,
      activeCommitteesCount,
      clause14Referrals,
      activeSuspensions,
      criticalWarnings,
      recentOverrides,
      recentAdminActions,
    ] = await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ isActive: true }),
      Member.find({}).select("name email role avatar isActive isCommitteeMember createdAt").sort({ createdAt: -1 }).lean(),
      Session.countDocuments({ expiresAt: { $gt: now } }),
      AuditLog.countDocuments({}),
      AuditLog.countDocuments({ authorizationResult: "SUPER_ADMIN_OVERRIDE" }),
      Committee.find({ status: "TIED" })
        .populate("members.memberId", "name email role avatar")
        .populate("createdBy", "name email role")
        .populate("resourceId", "level type status member points")
        .lean(),
      Committee.countDocuments({ status: "ACTIVE" }),
      Warning.find({
        "review.disciplinaryRecommendation": "Refer_To_Formal_Removal_Review",
      })
        .populate("member", "name email role avatar")
        .populate("issuedBy", "name email role")
        .populate("project", "name")
        .lean(),
      Warning.find({ "suspension.isSuspended": true })
        .populate("member", "name email role avatar")
        .populate("issuedBy", "name email role")
        .populate("project", "name")
        .lean(),
      Warning.find({
        $or: [
          { level: "Final Warning" },
          { points: { $gte: 7 } },
        ],
        status: { $in: ["Active", "Pending_Approval"] },
      })
        .populate("member", "name email role avatar")
        .populate("issuedBy", "name email role")
        .lean(),
      AuditLog.find({ authorizationResult: "SUPER_ADMIN_OVERRIDE" })
        .sort({ timestamp: -1 })
        .limit(6)
        .lean(),
      AuditLog.find({ "actor.role": { $in: ["Super Admin", "Admin"] } })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // Calculate role breakdown
    const roleBreakdown = {
      superAdmin: 0,
      admin: 0,
      hr: 0,
      committee: 0,
      teamLeader: 0,
      member: 0,
      committeeSeats: 0,
    };

    for (const m of membersList) {
      if (m.role === "Super Admin") roleBreakdown.superAdmin++;
      else if (m.role === "Admin") roleBreakdown.admin++;
      else if (m.role === "HR") roleBreakdown.hr++;
      else if (m.role === "Committee") roleBreakdown.committee++;
      else if (m.role === "Team Leader") roleBreakdown.teamLeader++;
      else if (m.role === "Member") roleBreakdown.member++;

      if (m.isCommitteeMember) {
        roleBreakdown.committeeSeats++;
      }
    }

    // Process suspensions with remaining SLA
    const suspensionsWithSLA = activeSuspensions.map((w: any) => {
      const suspendedUntil = w.suspension?.suspendedUntil ? new Date(w.suspension.suspendedUntil) : null;
      const hoursLeft = suspendedUntil
        ? Math.max(0, Math.round(((suspendedUntil.getTime() - now.getTime()) / (1000 * 60 * 60)) * 10) / 10)
        : null;
      return {
        ...w,
        hoursLeft,
        isExpired: hoursLeft !== null && hoursLeft <= 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        viewerRole: currentMember.role,
        isSuperAdmin: currentMember.role === "Super Admin",
        systemHealth: {
          database: "Connected",
          activeSessions: activeSessionsCount,
          totalAuditLogs,
          totalMembers,
          activeMembers,
          inactiveMembers: totalMembers - activeMembers,
        },
        kpis: {
          totalMembers,
          activeMembers,
          tiedCommitteesCount: tiedCommittees.length,
          activeCommitteesCount,
          clause14ReferralsCount: clause14Referrals.length,
          activeSuspensionsCount: activeSuspensions.length,
          criticalWarningsCount: criticalWarnings.length,
          overridesCount,
        },
        roleBreakdown,
        escalations: {
          tiedCommittees,
          clause14Referrals,
          suspensions: suspensionsWithSLA,
          criticalWarnings,
        },
        recentOverrides,
        recentAdminActions,
        members: membersList,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error fetching admin overview data." },
      { status: 500 }
    );
  }
}
