import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Task from "@/models/task";
import Member from "@/models/member";

export async function GET() {
  try {
    await connectToDatabase();

    const [
      projectTotal,
      projectPlanning,
      projectActive,
      projectCompleted,
      taskTotal,
      taskCompleted,
      taskPending,
      memberTotal,
      memberActive,
      memberInactive,
    ] = await Promise.all([
      // Projects (status enum: "Planning" | "Active" | "Completed")
      Project.countDocuments(),
      Project.countDocuments({ status: "Planning" }),
      Project.countDocuments({ status: "Active" }),
      Project.countDocuments({ status: "Completed" }),

      // Tasks (status enum: "todo" | "in-progress" | "done")
      Task.countDocuments(),
      Task.countDocuments({ status: "done" }),
      Task.countDocuments({ status: { $in: ["todo", "in-progress"] } }),

      // Members (isActive: boolean)
      Member.countDocuments(),
      Member.countDocuments({ isActive: true }),
      Member.countDocuments({ isActive: false }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        projects: {
          total: projectTotal,
          planning: projectPlanning,
          active: projectActive,
          completed: projectCompleted,
        },
        tasks: {
          total: taskTotal,
          completed: taskCompleted,
          pending: taskPending,
        },
        members: {
          total: memberTotal,
          active: memberActive,
          inactive: memberInactive,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}
