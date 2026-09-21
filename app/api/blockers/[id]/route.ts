import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Blocker from "@/models/blocker";
import { getCurrentMember } from "@/lib/auth";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

// ─── PATCH /api/blockers/[id] ────────────────────────────────────────────────
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
      { success: false, message: "Invalid blocker id" },
      { status: 400 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const blocker = await Blocker.findById(id);
    if (!blocker) {
      return NextResponse.json(
        { success: false, message: "Blocker not found" },
        { status: 404 },
      );
    }

    const previousState = blocker.toObject();
    const body = await req.json();

    const allowedFields = [
      "status",
      "severity",
      "assignedTo",
      "resolutionNotes",
      "impactDescription",
      "title",
      "description",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "assignedTo") {
          blocker.assignedTo =
            body.assignedTo && mongoose.isValidObjectId(body.assignedTo)
              ? new mongoose.Types.ObjectId(body.assignedTo)
              : null;
        } else {
          blocker[field] = body[field];
        }
      }
    }

    // If resolving
    if (body.status === "Resolved") {
      blocker.resolvedAt = new Date();
      blocker.resolvedBy = currentMember._id;
    } else if (body.status === "Open" || body.status === "In_Progress") {
      blocker.resolvedAt = null;
      blocker.resolvedBy = null;
    }

    await blocker.save();

    const updated = await Blocker.findById(id)
      .populate("project", "name lead status")
      .populate("task", "title status priority dueDate")
      .populate("reportedBy", "name email role avatar")
      .populate("assignedTo", "name email role avatar")
      .populate("resolvedBy", "name email role avatar")
      .lean();

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "blockers.update",
      resource: {
        type: "Blocker",
        id: blocker._id,
        identifier: blocker.title,
      },
      previousState,
      newState: updated,
      decisionReason: `Updated blocker: ${blocker.title} (Status: ${blocker.status})`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/blockers/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update blocker" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/blockers/[id] ───────────────────────────────────────────────
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
      { success: false, message: "Invalid blocker id" },
      { status: 400 },
    );
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();
    const blocker = await Blocker.findById(id);
    if (!blocker) {
      return NextResponse.json(
        { success: false, message: "Blocker not found" },
        { status: 404 },
      );
    }

    const previousState = blocker.toObject();
    await Blocker.findByIdAndDelete(id);

    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "blockers.delete",
      resource: {
        type: "Blocker",
        id: blocker._id,
        identifier: blocker.title,
      },
      previousState,
      newState: null,
      decisionReason: `Deleted blocker: ${blocker.title}`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({
      success: true,
      message: "Blocker deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/blockers/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete blocker" },
      { status: 500 },
    );
  }
}
