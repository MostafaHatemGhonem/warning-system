import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Meeting from "@/models/meeting";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/meetings/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid meeting id" },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const meeting = await Meeting.findById(id)
      .populate("project", "name lead status")
      .populate("createdBy", "name role avatar")
      .populate("attendees.member", "name email role avatar")
      .lean();

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    console.error("GET /api/meetings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch meeting" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/meetings/[id] ────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid meeting id" },
      { status: 400 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    // Permission check: Creator, Team Leader, or Admin
    const isCreator = meeting.createdBy.toString() === currentMember._id.toString();
    const isLeadership = ["Super Admin", "Admin", "Team Leader"].includes(
      currentMember.role,
    );

    if (!isCreator && !isLeadership) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to update this meeting" },
        { status: 403 },
      );
    }

    const previousState = meeting.toObject();
    const body = await req.json();

    const allowedFields = [
      "title",
      "description",
      "status",
      "scheduledAt",
      "durationMinutes",
      "meetingLink",
      "location",
      "minutesOfMeeting",
      "agenda",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "scheduledAt") {
          meeting[field] = new Date(body[field]);
        } else {
          meeting[field] = body[field];
        }
      }
    }

    await meeting.save();

    const updated = await Meeting.findById(id)
      .populate("project", "name lead status")
      .populate("createdBy", "name role avatar")
      .populate("attendees.member", "name email role avatar")
      .lean();

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "meetings.update",
      resource: {
        type: "Meeting",
        id: meeting._id,
        identifier: meeting.title,
      },
      previousState,
      newState: updated,
      decisionReason: `Updated meeting details: ${meeting.title}`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/meetings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update meeting" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/meetings/[id] ───────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid meeting id" },
      { status: 400 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    const isCreator = meeting.createdBy.toString() === currentMember._id.toString();
    const isLeadership = ["Super Admin", "Admin"].includes(currentMember.role);

    if (!isCreator && !isLeadership) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to cancel or delete this meeting" },
        { status: 403 },
      );
    }

    const previousState = meeting.toObject();
    await Meeting.findByIdAndDelete(id);

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "meetings.delete",
      resource: {
        type: "Meeting",
        id: meeting._id,
        identifier: meeting.title,
      },
      previousState,
      newState: null,
      decisionReason: `Deleted meeting: ${meeting.title}`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/meetings/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete meeting" },
      { status: 500 },
    );
  }
}
