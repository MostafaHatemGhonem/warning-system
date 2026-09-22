import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Task from "@/models/task";
import Project from "@/models/project";
import Member from "@/models/member";
import { verifyPermission } from "@/lib/permissions";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendDiscordTaskNotification } from "@/lib/discord";
import { sendTaskAssignedEmail } from "@/lib/email/send-email";
import { CANONICAL_APP_URL } from "@/lib/app-config";

// ─── GET /api/tasks ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyPermission("VIEW_TASKS");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message, error: auth.message },
      { status: auth.status },
    );
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const filter: Record<string, unknown> = {};
    if (projectId && projectId !== "all") filter.projectId = projectId;
    if (assignedTo && assignedTo !== "all") filter.assignedTo = assignedTo;
    if (status && status !== "all") filter.status = status;
    if (priority && priority !== "all") filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate("projectId", "name")
      .populate("assignedTo", "name email role avatar isActive")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// ─── POST /api/tasks ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifyPermission("CREATE_TASK");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message, error: auth.message },
      { status: auth.status },
    );
  }

  const requestId = getOrCreateRequestId(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const { projectId, title, description, status, priority, assignedTo, dueDate } = body;

    if (!projectId || !title?.trim()) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId format" }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Validate assignedTo member
    let validatedAssignedTo: mongoose.Types.ObjectId | null = null;
    let assignedMemberInfo: { name: string; email?: string } | null = null;
    if (assignedTo) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return NextResponse.json({ error: "Invalid assignedTo member ID format" }, { status: 400 });
      }
      const member = await Member.findOne({ _id: assignedTo, isActive: true });
      if (!member) {
        return NextResponse.json(
          { error: "Assigned member not found or is currently inactive" },
          { status: 400 },
        );
      }

      // Verify the member is enrolled in this project's team
      const teamMemberIds = (project.teamMembers || []).map((m: any) =>
        m?._id ? m._id.toString() : m.toString(),
      );
      const leadIdStr = project.leadId ? project.leadId.toString() : "";
      const isEnrolled =
        teamMemberIds.includes(member._id.toString()) ||
        leadIdStr === member._id.toString();

      if (!isEnrolled) {
        return NextResponse.json(
          {
            error: `Member "${member.name}" is not enrolled in project "${project.name}". Tasks can only be assigned to project team members.`,
          },
          { status: 400 },
        );
      }

      validatedAssignedTo = member._id;
      assignedMemberInfo = { name: member.name, email: member.email };
    }

    // 2. Validate dueDate (Prohibit Past Dates)
    let validatedDueDate: Date | null = null;
    if (dueDate) {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) {
        return NextResponse.json({ error: "Invalid date format for dueDate" }, { status: 400 });
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (due < startOfToday) {
        return NextResponse.json(
          { error: "Due date cannot be in the past" },
          { status: 400 },
        );
      }
      validatedDueDate = due;
    }

    const task = await Task.create({
      projectId,
      title:       title.trim(),
      description: description?.trim() || "",
      status:      status   || "todo",
      priority:    priority || "medium",
      assignedTo:  validatedAssignedTo,
      dueDate:     validatedDueDate,
    });

    const newState = task.toObject();

    // 3. Dispatch Discord ClickUp-style notification (isolated fail-safe)
    const discordResult = await sendDiscordTaskNotification({
      task,
      project,
      assignedMember: assignedMemberInfo,
      creator: {
        name: auth.member.name,
        role: auth.member.role,
      },
      appUrl: CANONICAL_APP_URL,
    });

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "tasks.create",
      resource: {
        type: "Task",
        id: task._id,
        identifier: `${project.name}: ${task.title}`,
      },
      previousState: null,
      newState,
      decisionReason: (body.decisionReason as string) || `Created task '${task.title}' in project '${project.name}'`,
      authorizationResult: "STANDARD_GRANT",
      metadata: {
        discordNotification: {
          attempted: discordResult.attempted,
          delivered: discordResult.delivered,
          scope: discordResult.scope,
        },
      },
    });

    // 1. If assigned to a member, notify them via in-app & email
    let emailSent = false;
    if (validatedAssignedTo) {
      const assigneeMember = await Member.findById(validatedAssignedTo).select("name email");
      if (assigneeMember?.email) {
        console.log(
          `[Tasks API] Sending task assignment email to ${assigneeMember.email} for task "${task.title}" (Project: ${project.name})...`,
        );
        const emailResult = await sendTaskAssignedEmail({
          email: assigneeMember.email,
          userName: assigneeMember.name,
          taskTitle: task.title,
          projectName: project.name,
          assignedBy: auth.member.name,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          priority: task.priority,
          taskId: task._id.toString(),
          projectId: project._id.toString(),
          isReassigned: false,
        });
        emailSent = Boolean(emailResult.delivered);
      }

      await createNotification({
        recipientId: validatedAssignedTo,
        title: "New Task Assigned",
        message: `You were assigned task "${task.title}" in project "${project.name}" by ${auth.member.name}`,
        type: "task_assigned",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: auth.member._id,
          name: auth.member.name,
          role: auth.member.role,
        },
        metadata: { taskId: task._id, projectId: project._id },
        emailSent,
      });
    }

    // 2. If creator is not the project lead, notify the project lead
    const leadIdStr = project.leadId ? project.leadId.toString() : "";
    if (leadIdStr && leadIdStr !== auth.member._id.toString() && leadIdStr !== validatedAssignedTo?.toString()) {
      await createNotification({
        recipientId: project.leadId,
        title: "Task Added to Your Project",
        message: `A new task "${task.title}" was added to project "${project.name}" by ${auth.member.name}`,
        type: "task_status",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: auth.member._id,
          name: auth.member.name,
          role: auth.member.role,
        },
        metadata: { taskId: task._id, projectId: project._id },
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate("projectId", "name")
      .populate("assignedTo", "name email role avatar isActive")
      .lean();

    return NextResponse.json(populatedTask, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
