import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Blocker from "@/models/blocker";
import Project from "@/models/project";
import Task from "@/models/task";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification, createBulkNotifications } from "@/lib/notifications";

// ─── GET /api/blockers ───────────────────────────────────────────────────────
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
    const severity = searchParams.get("severity");

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
    if (severity) {
      query.severity = severity;
    }

    const blockers = await Blocker.find(query)
      .populate("project", "name lead status")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .populate("assignedTo", "name email role avatar")
      .populate("resolvedBy", "name email role avatar")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: blockers });
  } catch (error) {
    console.error("GET /api/blockers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch blockers" },
      { status: 500 },
    );
  }
}

// ─── POST /api/blockers ──────────────────────────────────────────────────────
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
      title,
      description,
      severity = "Medium",
      project: projectId,
      task: taskId,
      assignedTo,
      impactDescription = "",
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Blocker title is required" },
        { status: 400 },
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, message: "Blocker description is required" },
        { status: 400 },
      );
    }

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, message: "Valid project ID is required" },
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
    if (taskId && mongoose.isValidObjectId(taskId)) {
      taskDoc = await Task.findById(taskId);
    }

    const blocker = await Blocker.create({
      title: title.trim(),
      description: description.trim(),
      severity,
      status: "Open",
      project: project._id,
      task: taskDoc ? taskDoc._id : null,
      reportedBy: currentMember._id,
      assignedTo: assignedTo && mongoose.isValidObjectId(assignedTo) ? assignedTo : null,
      impactDescription: impactDescription.trim(),
    });

    const populated = await Blocker.findById(blocker._id)
      .populate("project", "name lead status")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .populate("assignedTo", "name email role avatar")
      .lean();

    // Audit log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "blockers.create",
      resource: {
        type: "Blocker",
        id: blocker._id,
        identifier: blocker.title,
      },
      previousState: null,
      newState: populated,
      decisionReason: `Reported blocker: "${blocker.title}" on project "${project.name}" (Severity: ${severity})`,
      authorizationResult: "STANDARD_GRANT",
    });

    // Notify Project Lead and Assignee
    const recipients: mongoose.Types.ObjectId[] = [];
    if (project.leadId && project.leadId.toString() !== currentMember._id.toString()) {
      recipients.push(project.leadId);
    }
    if (
      assignedTo &&
      assignedTo.toString() !== currentMember._id.toString() &&
      !recipients.some((r) => r.toString() === assignedTo.toString())
    ) {
      recipients.push(new mongoose.Types.ObjectId(assignedTo));
    }

    if (recipients.length > 0) {
      await createBulkNotifications({
        recipientIds: recipients,
        title: `🚨 Blocker Reported: ${blocker.title}`,
        message: `${currentMember.name} reported a ${severity} blocker on ${project.name}: "${blocker.description}"`,
        type: "system",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: currentMember._id,
          name: currentMember.name,
          role: currentMember.role,
        },
        metadata: { blockerId: blocker._id, projectId: project._id },
      });
    }

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/blockers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to report blocker" },
      { status: 500 },
    );
  }
}
