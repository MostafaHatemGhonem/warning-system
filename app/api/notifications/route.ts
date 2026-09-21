import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import Notification from "@/models/notification";

// ─── GET /api/notifications ──────────────────────────────────────────────────
export async function GET() {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({
        recipient: currentMember._id,
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({
        recipient: currentMember._id,
        read: false,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/notifications ────────────────────────────────────────────────
// Mark a specific notification or all notifications as read
export async function PATCH(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany(
        { recipient: currentMember._id, read: false },
        { $set: { read: true } },
      );

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    }

    if (notificationId && mongoose.isValidObjectId(notificationId)) {
      const updated = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: currentMember._id },
        { $set: { read: true } },
        { new: true },
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "Notification not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid request payload" },
      { status: 400 },
    );
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update notification" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/notifications ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get("id");
    const clearRead = searchParams.get("clearRead");

    if (clearRead === "true") {
      await Notification.deleteMany({
        recipient: currentMember._id,
        read: true,
      });
      return NextResponse.json({
        success: true,
        message: "Read notifications cleared",
      });
    }

    if (id && mongoose.isValidObjectId(id)) {
      await Notification.findOneAndDelete({
        _id: id,
        recipient: currentMember._id,
      });
      return NextResponse.json({
        success: true,
        message: "Notification deleted",
      });
    }

    return NextResponse.json(
      { success: false, message: "Missing id or clearRead parameter" },
      { status: 400 },
    );
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete notification" },
      { status: 500 },
    );
  }
}
