import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Member from "@/models/member";
import { verifyPermission } from "@/lib/permissions";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification, createBulkNotifications } from "@/lib/notifications";

const ELIGIBLE_LEADER_ROLES = ["Super Admin", "Admin", "Team Leader"];

export async function GET() {
  const auth = await verifyPermission("VIEW_PROJECTS");
  if (!auth.authorized) {
    return NextResponse.json(
      { message: auth.message },
      { status: auth.status },
    );
  }

  try {
    await connectToDatabase();

    const projects = await Project.find({
      workspaceId: "infinity-explorers",
    })
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive")
      .sort({ createdAt: -1 });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);

    return NextResponse.json(
      { message: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyPermission("CREATE_PROJECT");
  if (!auth.authorized) {
    return NextResponse.json(
      { message: auth.message },
      { status: auth.status },
    );
  }

  const creator = auth.member;
  const requestId = getOrCreateRequestId(request);

  try {
    await connectToDatabase();

    const body = await request.json();

    const { name, description, lead, leadId, dueDate } = body;

    if (!name?.trim() || (!lead?.trim() && !leadId && creator.role !== "Team Leader") || !dueDate) {
      return NextResponse.json(
        {
          message: "Name, Team Leader and due date are required",
        },
        { status: 400 },
      );
    }

    // Determine target leader member
    let leaderMember = null;

    // Rule 1: If creator is Team Leader, they are forced to be the Project Lead
    if (creator.role === "Team Leader") {
      leaderMember = await Member.findOne({ _id: creator._id, isActive: true });
      if (!leaderMember) {
        return NextResponse.json(
          { message: "Your Team Leader account was not found or is inactive." },
          { status: 403 },
        );
      }
      // If client supplied a different leadId, reject it
      if (leadId && leadId.toString() !== creator._id.toString()) {
        return NextResponse.json(
          { message: "Team Leaders can only create projects assigned to themselves as Project Lead." },
          { status: 403 },
        );
      }
    } else {
      // Creator is Admin or Super Admin
      if (leadId && mongoose.isValidObjectId(leadId)) {
        leaderMember = await Member.findOne({ _id: leadId, isActive: true });
      } else if (lead && mongoose.isValidObjectId(lead)) {
        leaderMember = await Member.findOne({ _id: lead, isActive: true });
      } else if (lead?.trim()) {
        leaderMember = await Member.findOne({ name: lead.trim(), isActive: true });
      }

      if (!leaderMember) {
        return NextResponse.json(
          {
            message: "Selected Team Leader was not found or is inactive. Please choose an active member.",
          },
          { status: 400 },
        );
      }

      // Rule 2: If creator is Admin, Project Lead can only be Admin or Team Leader (NOT Super Admin)
      if (creator.role === "Admin") {
        if (!["Admin", "Team Leader"].includes(leaderMember.role)) {
          return NextResponse.json(
            {
              message: "Admins can only assign an Admin or a Team Leader as Project Lead (Super Admin is not allowed).",
            },
            { status: 403 },
          );
        }
      } else if (creator.role === "Super Admin") {
        // Super Admin can assign Super Admin, Admin, or Team Leader
        if (!ELIGIBLE_LEADER_ROLES.includes(leaderMember.role)) {
          return NextResponse.json(
            {
              message: `Invalid Team Leader role. Only Super Admin, Admin, or Team Leader can lead a project. (${leaderMember.name} is "${leaderMember.role}")`,
            },
            { status: 400 },
          );
        }
      }
    }

    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() || "",
      lead: leaderMember.name,
      leadId: leaderMember._id,
      teamMembers: [leaderMember._id],
      dueDate,
      status: "Planning",
      progress: 0,
      members: 1,
      workspaceId: "infinity-explorers",
    });

    const populatedProject = await Project.findById(project._id)
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive");

    const newState = (populatedProject || project).toObject();

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "projects.create",
      resource: {
        type: "Project",
        id: project._id,
        identifier: project.name,
      },
      previousState: null,
      newState,
      decisionReason: `Created project: ${project.name} with Project Lead ${leaderMember.name} (${leaderMember.role})`,
      authorizationResult: "STANDARD_GRANT",
    });

    // Notify the lead if lead is not the creator
    if (leaderMember._id.toString() !== creator._id.toString()) {
      await createNotification({
        recipientId: leaderMember._id,
        title: "New Project Assigned",
        message: `You have been designated as Project Lead for "${project.name}" by ${creator.name}`,
        type: "project_created",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: creator._id,
          name: creator.name,
          role: creator.role,
        },
        metadata: { projectId: project._id },
      });
    }

    // Notify other Admins and Super Admins
    const otherAdmins = await Member.find({
      role: { $in: ["Super Admin", "Admin"] },
      _id: { $ne: creator._id },
      isActive: true,
    }).select("_id");

    if (otherAdmins.length > 0) {
      await createBulkNotifications({
        recipientIds: otherAdmins.map((a) => a._id),
        title: "New Project Created",
        message: `Project "${project.name}" was created, led by ${leaderMember.name}`,
        type: "project_created",
        link: `/dashboard/projects/${project._id}`,
        actor: {
          _id: creator._id,
          name: creator.name,
          role: creator.role,
        },
        metadata: { projectId: project._id },
      });
    }

    return NextResponse.json(populatedProject || project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);

    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 },
    );
  }
}
