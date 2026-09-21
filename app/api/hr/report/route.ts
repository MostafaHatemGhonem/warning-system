import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/member";
import Warning from "@/models/warning";
import Meeting from "@/models/meeting";
import Project from "@/models/project";
import { getCurrentMember } from "@/lib/auth";

// ─── GET /api/hr/report ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const allowedRoles = ["HR", "Admin", "Super Admin"];
  if (!allowedRoles.includes(currentMember.role)) {
    return NextResponse.json(
      { success: false, message: "Forbidden: Only HR and Leadership can generate compliance reports" },
      { status: 403 },
    );
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const monthParam = searchParams.get("month"); // e.g. "2026-09"

    // Determine date range for the report
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      // Default: current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const monthLabel = startDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    // 1. Fetch Members
    const members = await Member.find().sort({ name: 1 }).lean();

    // 2. Fetch Meetings in this range
    const meetings = await Meeting.find({
      scheduledAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // 3. Fetch Warnings
    const warnings = await Warning.find({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { status: "Active" },
        { status: "Under_Review" },
      ],
    })
      .populate("member", "name email role")
      .populate("issuedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Compute Member Attendance & Compliance Roster
    const memberRosterReport = members.map((m) => {
      const memberIdStr = m._id.toString();

      // Attendance tally
      let totalInvited = 0;
      let presentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let absentCount = 0;

      meetings.forEach((mtg) => {
        const attendee = mtg.attendees?.find(
          (a: any) => a.member?.toString() === memberIdStr,
        );
        if (attendee) {
          totalInvited++;
          if (attendee.status === "present") presentCount++;
          else if (attendee.status === "late") lateCount++;
          else if (attendee.status === "excused") excusedCount++;
          else if (attendee.status === "absent") absentCount++;
        }
      });

      const effectivePresent = presentCount + lateCount;
      const attendanceRate =
        totalInvited > 0 ? Math.round((effectivePresent / totalInvited) * 100) : 100;

      // Warnings for this member
      const memberWarnings = warnings.filter(
        (w: any) =>
          (w.member?._id ? w.member._id.toString() : w.member?.toString()) ===
          memberIdStr,
      );

      const activeWarnings = memberWarnings.filter(
        (w: any) => w.status === "Active" || w.status === "Under_Review",
      );
      const totalPoints = activeWarnings.reduce((sum, w: any) => sum + (w.points || 0), 0);

      // Standing
      let complianceStanding = "Excellent (ممتاز)";
      if (totalPoints >= 3 || absentCount >= 3) {
        complianceStanding = "Critical / At Risk (حرج - تحت المتابعة)";
      } else if (totalPoints >= 1 || absentCount >= 1) {
        complianceStanding = "Needs Improvement (يحتاج تحسين)";
      }

      return {
        _id: memberIdStr,
        name: m.name,
        email: m.email,
        role: m.role,
        isActive: m.isActive,
        totalInvited,
        presentCount,
        lateCount,
        excusedCount,
        absentCount,
        attendanceRate,
        activeWarningsCount: activeWarnings.length,
        totalPoints,
        complianceStanding,
      };
    });

    // 5. Warnings & Appeals Log
    const warningsReport = warnings.map((w: any) => {
      const memberObj = w.member && typeof w.member === "object" ? w.member : null;
      const issuerObj = w.issuedBy && typeof w.issuedBy === "object" ? w.issuedBy : null;

      return {
        warningId: w._id.toString(),
        memberName: memberObj?.name || "Member",
        memberRole: memberObj?.role || "Member",
        issuedByName: issuerObj?.name || "Lead/Admin",
        level: w.level,
        type: w.type,
        status: w.status,
        points: w.points || 0,
        reason: w.reason,
        issuedAt: w.createdAt,
        activeUntil: w.activeUntil,
        appealStatus: w.review?.status || "None",
        appealDeadline: w.review?.appealDeadline,
        appealDecision: w.review?.decision || "Pending",
        appealDecisionNotes: w.review?.decisionNotes || "",
      };
    });

    // 6. Improvement Plans
    const improvementPlans = warnings
      .filter((w: any) => w.improvementPlan?.isActive || w.improvementPlan?.startDate)
      .map((w: any) => {
        const memberObj = w.member && typeof w.member === "object" ? w.member : null;
        return {
          warningId: w._id.toString(),
          memberName: memberObj?.name || "Member",
          problemSummary: w.improvementPlan?.problemSummary || "",
          desiredBehavior: w.improvementPlan?.desiredBehavior || "",
          actionSteps: w.improvementPlan?.actionSteps || [],
          durationDays: w.improvementPlan?.durationDays || 30,
          startDate: w.improvementPlan?.startDate,
          targetCompletionDate: w.improvementPlan?.targetCompletionDate,
          finalDecision: w.improvementPlan?.finalDecision || "Pending",
          finalNotes: w.improvementPlan?.finalNotes || "",
          isActive: Boolean(w.improvementPlan?.isActive),
        };
      });

    // 7. Executive Summary
    const overallTotalMeetings = meetings.length;
    const overallTotalInvited = memberRosterReport.reduce((acc, m) => acc + m.totalInvited, 0);
    const overallTotalPresent = memberRosterReport.reduce((acc, m) => acc + m.presentCount + m.lateCount, 0);
    const overallAttendanceRate =
      overallTotalInvited > 0
        ? Math.round((overallTotalPresent / overallTotalInvited) * 100)
        : 100;
    const overallUnexcusedAbsences = memberRosterReport.reduce((acc, m) => acc + m.absentCount, 0);

    const summary = {
      organization: "Infinity Explorers",
      reportTitle: `Official Monthly Compliance & HR Report (${monthLabel})`,
      monthLabel,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        name: currentMember.name,
        role: currentMember.role,
        email: currentMember.email,
      },
      stats: {
        totalMembers: members.length,
        activeMembersCount: members.filter((m) => m.isActive).length,
        totalMeetingsHeld: overallTotalMeetings,
        overallAttendanceRate,
        overallUnexcusedAbsences,
        activeWarningsCount: warnings.filter((w: any) => w.status === "Active").length,
        openAppealsCount: warnings.filter((w: any) => w.review?.status === "Requested" || w.review?.status === "In_Progress").length,
        activeImprovementPlansCount: improvementPlans.filter((p) => p.isActive).length,
      },
    };

    // ── CSV Export ──
    if (format === "csv") {
      let csv = "\uFEFF"; // UTF-8 BOM for Excel Arabic support

      // Header Section
      csv += `Infinity Explorers - Official Monthly Compliance Report\n`;
      csv += `Report Month: ${monthLabel}\n`;
      csv += `Generated By: ${currentMember.name} (${currentMember.role})\n`;
      csv += `Generated At: ${new Date().toLocaleString("en-GB")}\n\n`;

      // Summary Stats
      csv += `=== EXECUTIVE SUMMARY ===\n`;
      csv += `Total Members,Active Members,Meetings Held,Overall Attendance Rate,Unexcused Absences,Active Warnings,Open Appeals,Active PIPs\n`;
      csv += `${summary.stats.totalMembers},${summary.stats.activeMembersCount},${summary.stats.totalMeetingsHeld},${summary.stats.overallAttendanceRate}%,${summary.stats.overallUnexcusedAbsences},${summary.stats.activeWarningsCount},${summary.stats.openAppealsCount},${summary.stats.activeImprovementPlansCount}\n\n`;

      // Section 1: Member Attendance & Compliance Roster
      csv += `=== SECTION 1: MEMBER ATTENDANCE & DISCIPLINE ROSTER (كشف الحضور والانضباط) ===\n`;
      csv += `Member Name,Email,Role,Status,Meetings Invited,Present,Late,Excused,Unexcused Absent,Attendance Rate,Active Warnings,Penalty Points,Compliance Standing\n`;
      memberRosterReport.forEach((m) => {
        csv += `"${m.name}","${m.email}","${m.role}","${m.isActive ? "Active" : "Inactive"}",${m.totalInvited},${m.presentCount},${m.lateCount},${m.excusedCount},${m.absentCount},${m.attendanceRate}%,${m.activeWarningsCount},${m.totalPoints},"${m.complianceStanding}"\n`;
      });
      csv += `\n`;

      // Section 2: Warnings & Appeals Log
      csv += `=== SECTION 2: WARNINGS & APPEALS RECORD (التحذيرات والتظلمات) ===\n`;
      csv += `Member Name,Role,Issued By,Warning Level,Scope,Status,Points,Reason,Issue Date,Appeal Status,Appeal Decision,Notes\n`;
      warningsReport.forEach((w) => {
        const issueDate = w.issuedAt ? new Date(w.issuedAt).toLocaleDateString("en-GB") : "-";
        csv += `"${w.memberName}","${w.memberRole}","${w.issuedByName}","${w.level}","${w.type}","${w.status}",${w.points},"${(w.reason || "").replace(/"/g, '""')}","${issueDate}","${w.appealStatus}","${w.appealDecision}","${(w.appealDecisionNotes || "").replace(/"/g, '""')}"\n`;
      });
      csv += `\n`;

      // Section 3: Performance Improvement Plans
      csv += `=== SECTION 3: PERFORMANCE IMPROVEMENT PLANS (خطط تحسين الأداء) ===\n`;
      csv += `Member Name,Problem Summary,Duration (Days),Start Date,Target Due Date,Status,Outcome Decision,Evaluation Notes\n`;
      improvementPlans.forEach((p) => {
        const sDate = p.startDate ? new Date(p.startDate).toLocaleDateString("en-GB") : "-";
        const tDate = p.targetCompletionDate ? new Date(p.targetCompletionDate).toLocaleDateString("en-GB") : "-";
        csv += `"${p.memberName}","${p.problemSummary.replace(/"/g, '""')}",${p.durationDays},"${sDate}","${tDate}","${p.isActive ? "In Progress" : "Completed"}","${p.finalDecision}","${p.finalNotes.replace(/"/g, '""')}"\n`;
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Infinity_Explorers_Compliance_Report_${startDate.getFullYear()}_${startDate.getMonth() + 1}.csv"`,
        },
      });
    }

    // Default: JSON response for UI preview and PDF printing
    return NextResponse.json({
      success: true,
      summary,
      memberRoster: memberRosterReport,
      warnings: warningsReport,
      improvementPlans,
    });
  } catch (error) {
    console.error("GET /api/hr/report error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate compliance report" },
      { status: 500 },
    );
  }
}
