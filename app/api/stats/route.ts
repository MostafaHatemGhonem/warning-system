import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Task from "@/models/task";
import Member from "@/models/member";

export async function GET() {
  try {
    await connectToDatabase();

    const [
      totalProjects,
      totalTasks,
      totalMembers,
      activeProjects,
      completedProjects,
      doneTasks,
      inProgressTasks,
      activeMembers,
      recentProjects,
      recentTasks,
    ] = await Promise.all([
      Project.countDocuments(),
      Task.countDocuments(),
      Member.countDocuments(),
      Project.countDocuments({ status: "Active" }),
      Project.countDocuments({ status: "Completed" }),
      Task.countDocuments({ status: "done" }),
      Task.countDocuments({ status: "in-progress" }),
      Member.countDocuments({ isActive: true }),
      Project.find().sort({ createdAt: -1 }).limit(5).lean(),
      Task.find({ status: { $ne: "done" } })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProjects,
          totalTasks,
          totalMembers,
          activeProjects,
          completedProjects,
          doneTasks,
          inProgressTasks,
          activeMembers,
        },
        recentProjects,
        recentTasks,
      },
    });
  } catch (error: any) {
    console.error("GET /api/stats error:", error);
    const errorMessage = error?.message || "Failed to fetch stats";
    const isMissingMongoUri = !process.env.MONGODB_URI;

    return NextResponse.json(
      {
        success: false,
        message: isMissingMongoUri
          ? "Database configuration error: MONGODB_URI environment variable is missing in Vercel settings."
          : `Failed to fetch stats: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
