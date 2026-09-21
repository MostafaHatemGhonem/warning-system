import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import DelayReport from "@/models/delay-report";
import Project from "@/models/project";
import Task from "@/models/task";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

// ─── PATCH /api/delay-reports/[id] ───────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const allowedReviewers = ["Super Admin", "Admin", "Team Leader"];
  if (!allowedReviewers.includes(currentMember.role)) {
    return NextResponse.json(
      { success: false, message: "Only Team Leaders and Admins can review delay requests" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid delay report id" },
      { status: 400 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const report = await DelayReport.findById(id);
    if (!report) {
      return NextResponse.json(
        { success: false, message: "Delay report not found" },
        { status: 404 },
      );
    }

    const previousState = report.toObject();
    const body = await req.json();
    const { status, reviewNotes = "" } = body;

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Decision status must be 'Approved' or 'Rejected'" },
        { status: 400 },
      );
    }

    report.status = status;
    report.reviewNotes = reviewNotes.trim();
    report.reviewedBy = currentMember._id;
    report.reviewedAt = new Date();

    await report.save();

    // If Approved, extend target task or project due date
    if (status === "Approved") {
      if (report.task) {
        await Task.findByIdAndUpdate(report.task, {
          $set: { dueDate: report.proposedNewDueDate },
        });
      } else if (report.project) {
        await Project.findByIdAndUpdate(report.project, {
          $set: { dueDate: report.proposedNewDueDate.toISOString().slice(0, 10) },
        });
      }
    }

    const updated = await DelayReport.findById(id)
      .populate("project", "name lead status dueDate")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .populate("reviewedBy", "name email role avatar")
      .lean();

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "delay_reports.update",
      resource: {
        type: "DelayReport",
        id: report._id,
        identifier: `Delay Decision: ${status}`,
      },
      previousState,
      newState: updated,
      decisionReason: `${status} delay extension request to ${new Date(report.proposedNewDueDate).toISOString()}: ${reviewNotes}`,
      authorizationResult: "STANDARD_GRANT",
    });

    // Notify the reporter
    await createNotification({
      recipientId: report.reportedBy,
      title: status === "Approved" ? "✅ Delay Request Approved" : "❌ Delay Request Rejected",
      message: `Your delay request has been ${status.toLowerCase()} by ${currentMember.name}. Notes: ${reviewNotes || "No notes provided"}`,
      type: "system",
      link: `/dashboard/projects/${report.project}`,
      actor: {
        _id: currentMember._id,
        name: currentMember.name,
        role: currentMember.role,
      },
      metadata: { delayReportId: report._id, projectId: report.project },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/delay-reports/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process delay report review" },
      { status: 500 },
    );
  }
}
