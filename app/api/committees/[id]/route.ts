import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import Committee from "@/models/committee";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid committee ID format." },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const committee = await Committee.findById(id)
      .populate("members.memberId", "name email role avatar")
      .populate("votes.memberId", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    if (!committee) {
      return NextResponse.json(
        { success: false, message: "Committee not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: committee,
    });
  } catch (error) {
    console.error("GET /api/committees/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch committee details." },
      { status: 500 },
    );
  }
}
