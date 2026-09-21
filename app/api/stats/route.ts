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
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
