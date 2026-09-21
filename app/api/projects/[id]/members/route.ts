import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Member from "@/models/member";
import { verifyPermission } from "@/lib/permissions";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST /api/projects/[id]/members ─────────────────────────────────────────
// Add a member to the project team
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("EDIT_PROJECT");
  if (!auth.authorized) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();

    const body = await req.json();
    const { memberId } = body;

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return NextResponse.json(
        { message: "Valid memberId is required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const member = await Member.findOne({ _id: memberId, isActive: true });
    if (!member) {
      return NextResponse.json(
        { message: "Member not found or is inactive" },
        { status: 404 },
      );
    }

    // Initialize teamMembers if empty
    const currentMembers: mongoose.Types.ObjectId[] = (project.teamMembers || []).map((m: any) =>
      typeof m === "object" && m._id ? m._id : m,
    );

    const isAlreadyMember = currentMembers.some(
      (mId) => mId.toString() === member._id.toString(),
    );

    if (isAlreadyMember) {
      return NextResponse.json(
        { message: `${member.name} is already a member of this project.` },
        { status: 400 },
      );
    }

    const previousState = project.toObject();
    const projectRole = body.projectRole || "Core Contributor";

    project.teamMembers.push(member._id);
    if (!project.memberRoster) {
      project.memberRoster = [];
    }
    project.memberRoster.push({
      memberId: member._id,
      projectRole,
      joinedAt: new Date(),
      status: "Active",
    });
    project.members = project.teamMembers.length;
    await project.save();

    const updatedProject = await Project.findById(id)
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive")
      .populate("memberRoster.memberId", "name email role avatar isActive");

    const newState = updatedProject ? updatedProject.toObject() : project.toObject();

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "projects.update",
      resource: {
        type: "Project",
        id: project._id,
        identifier: project.name,
      },
      previousState,
      newState,
      decisionReason: `Added ${member.name} (${member.role}) as ${projectRole} to project "${project.name}"`,
      authorizationResult: "STANDARD_GRANT",
    });

    // Notify the added member
    await createNotification({
      recipientId: member._id,
      title: "Added to Project Team",
      message: `You have been added to the team for project "${project.name}" by ${auth.member.name}`,
      type: "project_member_added",
      link: `/dashboard/projects/${project._id}`,
      actor: {
        _id: auth.member._id,
        name: auth.member.name,
        role: auth.member.role,
      },
      metadata: { projectId: project._id },
    });

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error) {
    console.error("POST /api/projects/[id]/members error:", error);
    return NextResponse.json(
      { message: "Failed to add member to project" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/projects/[id]/members ───────────────────────────────────────
// Remove a member from the project team
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("EDIT_PROJECT");
  if (!auth.authorized) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  const requestId = getOrCreateRequestId(req);

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    let memberId = searchParams.get("memberId");

    if (!memberId) {
      try {
        const body = await req.json();
        memberId = body.memberId;
      } catch {
        // No body provided
      }
    }

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return NextResponse.json(
        { message: "Valid memberId is required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    // Protect Project Lead from being removed
    const leadIdStr = project.leadId ? project.leadId.toString() : "";
    if (leadIdStr && leadIdStr === memberId.toString()) {
      return NextResponse.json(
        {
          message: "Cannot remove the Project Lead from the project. Please assign a new Project Lead first.",
        },
        { status: 400 },
      );
    }

    const previousState = project.toObject();

    // Filter out the member
    project.teamMembers = (project.teamMembers || []).filter(
      (m: any) => (m._id ? m._id.toString() : m.toString()) !== memberId.toString(),
    );
    if (project.memberRoster) {
      project.memberRoster = project.memberRoster.filter(
        (r: any) =>
          (r.memberId?._id ? r.memberId._id.toString() : r.memberId?.toString()) !==
          memberId.toString(),
      );
    }
    project.members = Math.max(1, project.teamMembers.length);
    await project.save();

    const updatedProject = await Project.findById(id)
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive")
      .populate("memberRoster.memberId", "name email role avatar isActive");

    const newState = updatedProject ? updatedProject.toObject() : project.toObject();

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "projects.update",
      resource: {
        type: "Project",
        id: project._id,
        identifier: project.name,
      },
      previousState,
      newState,
      decisionReason: `Removed member ${memberId} from project "${project.name}"`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/members error:", error);
    return NextResponse.json(
      { message: "Failed to remove member from project" },
      { status: 500 },
    );
  }
}
