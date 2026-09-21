import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Meeting from "@/models/meeting";
import Project from "@/models/project";
import Member from "@/models/member";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";
import { sendDiscordMeetingNotification } from "@/lib/discord";

// ─── GET /api/meetings ───────────────────────────────────────────────────────
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
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming");

    const query: Record<string, unknown> = {};

    if (projectId && mongoose.isValidObjectId(projectId)) {
      query.project = projectId;
    }

    if (status) {
      query.status = status;
    }

    if (upcoming === "true") {
      query.scheduledAt = { $gte: new Date() };
    }

    // Role-based scoping: regular members see meetings they are invited to or global meetings
    if (currentMember.role === "Member") {
      query.$or = [
        { "attendees.member": currentMember._id },
        { createdBy: currentMember._id },
        { project: null },
      ];
    }

    const meetings = await Meeting.find(query)
      .populate("project", "name lead status")
      .populate("createdBy", "name role avatar")
      .populate("attendees.member", "name email role avatar")
      .sort({ scheduledAt: 1 })
      .lean();

    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    console.error("GET /api/meetings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch meetings" },
      { status: 500 },
    );
  }
}

// ─── POST /api/meetings ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const allowedRoles = ["Super Admin", "Admin", "Team Leader"];
  if (!allowedRoles.includes(currentMember.role)) {
    return NextResponse.json(
      { success: false, message: "Only Team Leaders and Admins can schedule meetings" },
      { status: 403 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      title,
      description,
      project: projectId,
      type = "Sprint_Sync",
      scheduledAt,
      durationMinutes = 45,
      meetingLink = "",
      location = "Online",
      agenda = [],
      attendeeIds = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Meeting title is required" },
        { status: 400 },
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, message: "Scheduled date and time are required" },
        { status: 400 },
      );
    }

    let projectDoc = null;
    if (projectId && mongoose.isValidObjectId(projectId)) {
      projectDoc = await Project.findById(projectId);
    }

    // Build attendees array
    let attendeeObjectIds: mongoose.Types.ObjectId[] = [];
    if (Array.isArray(attendeeIds) && attendeeIds.length > 0) {
      attendeeObjectIds = attendeeIds
        .filter((id: string) => mongoose.isValidObjectId(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
    } else if (projectDoc) {
      // Auto-invite all project members (teamMembers, memberRoster, leadId) if not explicitly specified
      const foundIds = new Set<string>();

      if (Array.isArray(projectDoc.teamMembers)) {
        projectDoc.teamMembers.forEach((m: any) => {
          const id = typeof m === "object" && m?._id ? m._id.toString() : m?.toString();
          if (id && mongoose.isValidObjectId(id)) foundIds.add(id);
        });
      }

      if (Array.isArray(projectDoc.memberRoster)) {
        projectDoc.memberRoster.forEach((r: any) => {
          const id = typeof r?.memberId === "object" && r?.memberId?._id 
            ? r.memberId._id.toString() 
            : r?.memberId?.toString();
          if (id && mongoose.isValidObjectId(id)) foundIds.add(id);
        });
      }

      if (projectDoc.leadId) {
        const leadStr = typeof projectDoc.leadId === "object" && projectDoc.leadId?._id
          ? projectDoc.leadId._id.toString()
          : projectDoc.leadId.toString();
        if (leadStr && mongoose.isValidObjectId(leadStr)) foundIds.add(leadStr);
      }

      attendeeObjectIds = Array.from(foundIds).map((id) => new mongoose.Types.ObjectId(id));
    }

    // Ensure creator is an attendee
    const creatorIdStr = currentMember._id.toString();
    if (!attendeeObjectIds.some((id) => id.toString() === creatorIdStr)) {
      attendeeObjectIds.push(new mongoose.Types.ObjectId(creatorIdStr));
    }

    const attendees = attendeeObjectIds.map((memberId) => ({
      member: memberId,
      status: memberId.toString() === creatorIdStr ? "present" : "pending",
      excuseReason: "",
      notes: "",
    }));

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description?.trim() || "",
      project: projectDoc ? projectDoc._id : null,
      type,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: Number(durationMinutes) || 45,
      meetingLink: meetingLink.trim(),
      location: location.trim(),
      status: "Scheduled",
      createdBy: currentMember._id,
      agenda: Array.isArray(agenda) ? agenda : [],
      attendees,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("project", "name lead status")
      .populate("createdBy", "name role avatar")
      .populate("attendees.member", "name email role avatar")
      .lean();

    // Dispatch Discord meeting notification (ClickUp/Calendar style, fail-safe)
    const discordResult = await sendDiscordMeetingNotification({
      meeting,
      project: projectDoc,
      creator: {
        name: currentMember.name,
        role: currentMember.role,
      },
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://infinity-explorers.vercel.app",
    });

    // Audit Log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "meetings.create",
      resource: {
        type: "Meeting",
        id: meeting._id,
        identifier: meeting.title,
      },
      previousState: null,
      newState: populatedMeeting,
      decisionReason: `Scheduled meeting "${meeting.title}" on ${meeting.scheduledAt.toISOString()}`,
      authorizationResult: "STANDARD_GRANT",
      metadata: {
        discordNotification: {
          attempted: discordResult.attempted,
          delivered: discordResult.delivered,
          scope: discordResult.scope,
        },
      },
    });

    // Notify attendees (except creator)
    const otherAttendees = attendeeObjectIds.filter(
      (id) => id.toString() !== creatorIdStr,
    );

    if (otherAttendees.length > 0) {
      await createBulkNotifications({
        recipientIds: otherAttendees,
        title: "New Meeting Scheduled",
        message: `You have been invited to "${meeting.title}" on ${new Date(
          meeting.scheduledAt,
        ).toLocaleString("en-GB")}`,
        type: "system",
        link: `/dashboard/meetings`,
        actor: {
          _id: currentMember._id,
          name: currentMember.name,
          role: currentMember.role,
        },
        metadata: {
          meetingId: meeting._id,
          projectId: projectDoc ? projectDoc._id : undefined,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: populatedMeeting },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/meetings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create meeting" },
      { status: 500 },
    );
  }
}
