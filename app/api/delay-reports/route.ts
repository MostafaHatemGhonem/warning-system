import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import DelayReport from "@/models/delay-report";
import Project from "@/models/project";
import Task from "@/models/task";
import Member from "@/models/member";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";

// ─── GET /api/delay-reports ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};

    if (projectId && mongoose.isValidObjectId(projectId)) {
      query.project = projectId;
    }
    if (taskId && mongoose.isValidObjectId(taskId)) {
      query.task = taskId;
    }
    if (status) {
      query.status = status;
    }

    const reports = await DelayReport.find(query)
      .populate("project", "name lead status dueDate")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .populate("reviewedBy", "name email role avatar")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error("GET /api/delay-reports error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch delay reports" },
      { status: 500 },
    );
  }
}

// ─── POST /api/delay-reports ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      project: projectId,
      task: taskId,
      originalDueDate,
      proposedNewDueDate,
      delayReasonCategory = "Technical_Dependency",
      reasonDetails,
      impactLevel = "Moderate",
      mitigationPlan = "",
    } = body;

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, message: "Valid project ID is required" },
        { status: 400 },
      );
    }

    if (!proposedNewDueDate) {
      return NextResponse.json(
        { success: false, message: "Proposed new due date is required" },
        { status: 400 },
      );
    }

    if (!reasonDetails || reasonDetails.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "A detailed explanation of the delay reason is required (at least 10 characters)",
        },
        { status: 400 },
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    let taskDoc = null;
    let computedOriginalDate = originalDueDate ? new Date(originalDueDate) : null;
    if (taskId && mongoose.isValidObjectId(taskId)) {
      taskDoc = await Task.findById(taskId);
      if (taskDoc && taskDoc.dueDate && !computedOriginalDate) {
        computedOriginalDate = taskDoc.dueDate;
      }
    }
    if (!computedOriginalDate) {
      computedOriginalDate = new Date();
    }

    const report = await DelayReport.create({
      project: project._id,
      task: taskDoc ? taskDoc._id : null,
      reportedBy: currentMember._id,
      originalDueDate: computedOriginalDate,
      proposedNewDueDate: new Date(proposedNewDueDate),
      delayReasonCategory,
      reasonDetails: reasonDetails.trim(),
      impactLevel,
      mitigationPlan: mitigationPlan.trim(),
      status: "Pending",
    });

    const populated = await DelayReport.findById(report._id)
      .populate("project", "name lead status dueDate")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .lean();

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "delay_reports.create",
      resource: {
        type: "DelayReport",
        id: report._id,
        identifier: `Delay: ${taskDoc ? taskDoc.title : project.name}`,
      },
      previousState: null,
      newState: populated,
      decisionReason: `Submitted delay report for ${taskDoc ? `task "${taskDoc.title}"` : `project "${project.name}"`}. Proposed extension to ${new Date(proposedNewDueDate).toISOString()}`,
      authorizationResult: "STANDARD_GRANT",
    });

    // Notify Project Lead and Admins
    const leaders = await Member.find({
      role: { $in: ["Super Admin", "Admin"] },
      isActive: true,
    }).select("_id");

    const recipientIds: mongoose.Types.ObjectId[] = leaders.map((l) => l._id);
    if (
      project.leadId &&
      !recipientIds.some((id) => id.toString() === project.leadId.toString())
    ) {
      recipientIds.push(project.leadId);
    }

    // Filter out self
    const filteredRecipients = recipientIds.filter(
      (id) => id.toString() !== currentMember._id.toString(),
    );

    if (filteredRecipients.length > 0) {
      await createBulkNotifications({
        recipientIds: filteredRecipients,
        title: "⏳ Delay Report Submitted",
        message: `${currentMember.name} reported a delay on ${taskDoc ? `task "${taskDoc.title}"` : `project "${project.name}"`}: "${reasonDetails.slice(0, 100)}"`,
        type: "system",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: currentMember._id,
          name: currentMember.name,
          role: currentMember.role,
        },
        metadata: { delayReportId: report._id, projectId: project._id },
      });
    }

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/delay-reports error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit delay report" },
      { status: 500 },
    );
  }
}
