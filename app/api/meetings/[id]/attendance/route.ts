import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Meeting from "@/models/meeting";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

// ─── PATCH /api/meetings/[id]/attendance ─────────────────────────────────────
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

    const isCreator = meeting.createdBy.toString() === currentMember._id.toString();
    const isLeadership = ["Super Admin", "Admin", "Team Leader", "HR"].includes(
      currentMember.role,
    );

    if (!isCreator && !isLeadership) {
      return NextResponse.json(
        { success: false, message: "Only meeting organizers or leaders can record attendance" },
        { status: 403 },
      );
    }

    const previousState = meeting.toObject();
    const body = await req.json();

    // Support both single update { memberId, status, excuseReason, notes } or bulk { updates: [...] }
    const updates: Array<{
      memberId: string;
      status: "pending" | "present" | "absent" | "excused" | "late";
      excuseReason?: string;
      notes?: string;
    }> = Array.isArray(body.updates)
      ? body.updates
      : body.memberId && body.status
      ? [
          {
            memberId: body.memberId,
            status: body.status,
            excuseReason: body.excuseReason || "",
            notes: body.notes || "",
          },
        ]
      : [];

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No attendance updates provided" },
        { status: 400 },
      );
    }

    // Apply updates to attendees array
    for (const u of updates) {
      const attendee = meeting.attendees.find(
        (a: any) => a.member.toString() === u.memberId.toString(),
      );

      if (attendee) {
        attendee.status = u.status;
        if (u.excuseReason !== undefined) attendee.excuseReason = u.excuseReason.trim();
        if (u.notes !== undefined) attendee.notes = u.notes.trim();
        if ((u.status === "present" || u.status === "late") && !attendee.checkInAt) {
          attendee.checkInAt = new Date();
        }
      } else if (mongoose.isValidObjectId(u.memberId)) {
        // Add new attendee if not already in list
        meeting.attendees.push({
          member: new mongoose.Types.ObjectId(u.memberId),
          status: u.status,
          excuseReason: u.excuseReason?.trim() || "",
          notes: u.notes?.trim() || "",
          checkInAt: u.status === "present" || u.status === "late" ? new Date() : null,
        });
      }
    }

    // Auto-advance meeting status to In_Progress or Completed if all marked
    const allMarked = meeting.attendees.every(
      (a: any) => a.status !== "pending",
    );
    if (allMarked && meeting.status === "Scheduled") {
      meeting.status = "Completed";
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
      decisionReason: `Recorded attendance for meeting: ${meeting.title} (${updates.length} attendee(s) updated)`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Attendance recorded successfully",
    });
  } catch (error) {
    console.error("PATCH /api/meetings/[id]/attendance error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update attendance" },
      { status: 500 },
    );
  }
}
