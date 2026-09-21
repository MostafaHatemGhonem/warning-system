import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Task from "@/models/task";
import Project from "@/models/project";
import Member from "@/models/member";
import { verifyPermission } from "@/lib/permissions";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendDiscordTaskStatusUpdateNotification } from "@/lib/discord";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/tasks/[id] ─────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("VIEW_TASKS");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message, error: auth.message },
      { status: auth.status },
    );
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const task = await Task.findById(id)
      .populate("projectId", "name")
      .populate("assignedTo", "name email role avatar isActive")
      .lean();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

// ─── PATCH /api/tasks/[id] ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("EDIT_TASK");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message, error: auth.message },
      { status: auth.status },
    );
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const previousState = existingTask.toObject();
    const body = await req.json();

    const allowedFields = ["title", "description", "status", "priority", "assignedTo", "dueDate"];
    const update: Record<string, unknown> = {};

    // 1. Validate assignedTo if provided
    if ("assignedTo" in body) {
      if (body.assignedTo === null || body.assignedTo === "") {
        update.assignedTo = null;
      } else {
        if (!mongoose.isValidObjectId(body.assignedTo)) {
          return NextResponse.json({ error: "Invalid assignedTo member ID format" }, { status: 400 });
        }
        const member = await Member.findOne({ _id: body.assignedTo, isActive: true });
        if (!member) {
          return NextResponse.json(
            { error: "Assigned member not found or is currently inactive" },
            { status: 400 },
          );
        }

        // Verify member is enrolled in this task's project
        const project = await Project.findById(existingTask.projectId);
        if (project) {
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
        }

        update.assignedTo = member._id;
      }
    }

    // 2. Validate dueDate: ONLY when dueDate is being changed to a new date!
    if ("dueDate" in body) {
      const newDueDate = body.dueDate ? new Date(body.dueDate) : null;
      const oldDueDate = existingTask.dueDate ? new Date(existingTask.dueDate) : null;

      // Determine if dueDate was modified
      const isDueDateChanged =
        (newDueDate === null && oldDueDate !== null) ||
        (newDueDate !== null && oldDueDate === null) ||
        (newDueDate !== null && oldDueDate !== null && newDueDate.getTime() !== oldDueDate.getTime());

      if (isDueDateChanged && newDueDate !== null) {
        if (isNaN(newDueDate.getTime())) {
          return NextResponse.json({ error: "Invalid date format for dueDate" }, { status: 400 });
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (newDueDate < startOfToday) {
          return NextResponse.json(
            { error: "Due date cannot be in the past" },
            { status: 400 }
          );
        }
      }
      update.dueDate = newDueDate;
    }

    // Assign remaining allowed fields
    for (const key of allowedFields) {
      if (key !== "assignedTo" && key !== "dueDate" && key in body) {
        update[key] = body[key];
      }
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate("projectId", "name")
      .populate("assignedTo", "name email role avatar isActive");

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const newState = task.toObject();

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "tasks.update",
      resource: {
        type: "Task",
        id: task._id,
        identifier: task.title,
      },
      previousState,
      newState,
      decisionReason: (body.decisionReason as string) || `Updated task '${task.title}'`,
      authorizationResult: "STANDARD_GRANT",
    });

    // 1. If assignedTo changed and is not null
    const oldAssigneeId = previousState.assignedTo?.toString();
    const newAssigneeId = newState.assignedTo?.toString();
    if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== auth.member._id.toString()) {
      await createNotification({
        recipientId: newAssigneeId,
        title: "Task Assigned to You",
        message: `Task "${task.title}" was assigned to you by ${auth.member.name}`,
        type: "task_assigned",
        link: `/dashboard/projects/${task.projectId?._id || task.projectId}`,
        actor: {
          _id: auth.member._id,
          name: auth.member.name,
          role: auth.member.role,
        },
        metadata: { taskId: task._id, projectId: task.projectId },
      });
    }

    // 2. If status changed
    if (body.status && body.status !== previousState.status) {
      const projectDoc = await Project.findById(task.projectId);

      // Notify the assignee if updater is not the assignee
      if (newAssigneeId && newAssigneeId !== auth.member._id.toString()) {
        await createNotification({
          recipientId: newAssigneeId,
          title: "Task Status Updated",
          message: `Status of "${task.title}" was changed to "${body.status}" by ${auth.member.name}`,
          type: "task_status",
          link: `/dashboard/projects/${task.projectId?._id || task.projectId}`,
          actor: {
            _id: auth.member._id,
            name: auth.member.name,
            role: auth.member.role,
          },
          metadata: { taskId: task._id, projectId: task.projectId },
        });
      }

      // Also notify project lead if updater is not the project lead
      const leadIdStr = projectDoc?.leadId ? projectDoc.leadId.toString() : "";
      if (leadIdStr && leadIdStr !== auth.member._id.toString() && leadIdStr !== newAssigneeId) {
        await createNotification({
          recipientId: projectDoc.leadId,
          title: "Project Task Updated",
          message: `Task "${task.title}" was changed to "${body.status}" by ${auth.member.name}`,
          type: "task_status",
          link: `/dashboard/projects/${projectDoc._id}`,
          actor: {
            _id: auth.member._id,
            name: auth.member.name,
            role: auth.member.role,
          },
          metadata: { taskId: task._id, projectId: projectDoc._id },
        });
      }

      // Dispatch Discord ClickUp-style notification for task status change (fail-safe)
      if (projectDoc) {
        await sendDiscordTaskStatusUpdateNotification({
          task: {
            _id: task._id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
          },
          oldStatus: previousState.status,
          newStatus: body.status,
          project: {
            _id: projectDoc._id,
            name: projectDoc.name,
            discordWebhookUrl: (projectDoc as any).discordWebhookUrl,
          },
          assignedMember: task.assignedTo
            ? {
                name: (task.assignedTo as any).name,
                email: (task.assignedTo as any).email,
              }
            : null,
          updater: {
            name: auth.member.name,
            role: auth.member.role,
          },
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://infinity-explorers.vercel.app",
        });
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// ─── DELETE /api/tasks/[id] ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("DELETE_TASK");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message, error: auth.message },
      { status: auth.status },
    );
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const previousState = existingTask.toObject();

    await Task.findByIdAndDelete(id);

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "tasks.delete",
      resource: {
        type: "Task",
        id: existingTask._id,
        identifier: existingTask.title,
      },
      previousState,
      newState: null,
      decisionReason: `Deleted task '${existingTask.title}'`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
