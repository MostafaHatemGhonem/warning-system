import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Member from "@/models/member";
import { verifyPermission } from "@/lib/permissions";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";

const ELIGIBLE_LEADER_ROLES = ["Super Admin", "Admin", "Team Leader"];

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("VIEW_PROJECTS");
  if (!auth.authorized) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    let project = await Project.findById(id)
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive")
      .populate("memberRoster.memberId", "name email role avatar isActive");

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    // Backwards-compatibility: ensure teamMembers includes leadId if empty
    if ((!project.teamMembers || project.teamMembers.length === 0) && project.leadId) {
      const fallbackLeadId = project.leadId._id || project.leadId;
      await Project.findByIdAndUpdate(id, {
        $set: {
          teamMembers: [fallbackLeadId],
          members: 1,
          memberRoster: [
            {
              memberId: fallbackLeadId,
              projectRole: "Project Lead",
              joinedAt: project.createdAt || new Date(),
              status: "Active",
            },
          ],
        },
      });
      project = await Project.findById(id)
        .populate("leadId", "name email role avatar")
        .populate("teamMembers", "name email role avatar isActive")
        .populate("memberRoster.memberId", "name email role avatar isActive");
    }

    const projectObj = project.toObject();
    const rosterMap = new Map<string, any>();
    (projectObj.memberRoster || []).forEach((r: any) => {
      const mId = r.memberId?._id ? r.memberId._id.toString() : r.memberId?.toString();
      if (mId) rosterMap.set(mId, r);
    });

    const enrichedTeamMembers = (projectObj.teamMembers || []).map((m: any) => {
      if (!m || typeof m !== "object") return m;
      const mId = m._id ? m._id.toString() : m.toString();
      const leadIdStr = projectObj.leadId?._id
        ? projectObj.leadId._id.toString()
        : projectObj.leadId?.toString();
      const isLead = (leadIdStr && leadIdStr === mId) || projectObj.lead === m.name;
      const roster = rosterMap.get(mId);

      return {
        ...m,
        projectRole: roster?.projectRole || (isLead ? "Project Lead" : "Core Contributor"),
        joinedAt: roster?.joinedAt || projectObj.createdAt,
        memberStatus: roster?.status || "Active",
      };
    });

    projectObj.teamMembers = enrichedTeamMembers;
    return NextResponse.json(projectObj);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ message: "Failed to fetch project" }, { status: 500 });
  }
}

// ─── PATCH /api/projects/[id] ────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const previousState = existingProject.toObject();
    const body = await req.json();

    // Only allow safe fields to be updated
    const allowedFields = ["name", "description", "status", "progress", "lead", "leadId", "members", "dueDate"];
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key];
    }

    // If updating lead or leadId, validate against active members with allowed roles
    if ("leadId" in body || "lead" in body) {
      const targetLeadId = body.leadId;
      const targetLead = body.lead;

      let leaderMember = null;
      if (targetLeadId && mongoose.isValidObjectId(targetLeadId)) {
        leaderMember = await Member.findOne({ _id: targetLeadId, isActive: true });
      } else if (targetLead && mongoose.isValidObjectId(targetLead)) {
        leaderMember = await Member.findOne({ _id: targetLead, isActive: true });
      } else if (typeof targetLead === "string" && targetLead.trim()) {
        leaderMember = await Member.findOne({ name: targetLead.trim(), isActive: true });
      }

      if (!leaderMember) {
        return NextResponse.json(
          { message: "Selected Team Leader was not found or is inactive. Please choose an active member." },
          { status: 400 },
        );
      }

      if (!ELIGIBLE_LEADER_ROLES.includes(leaderMember.role)) {
        return NextResponse.json(
          {
            message: `Invalid Team Leader role. Only members with role Super Admin, Admin, or Team Leader can lead a project. (${leaderMember.name} has role "${leaderMember.role}")`,
          },
          { status: 400 },
        );
      }

      update.lead = leaderMember.name;
      update.leadId = leaderMember._id;
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate("leadId", "name email role avatar")
      .populate("teamMembers", "name email role avatar isActive");

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const newState = project.toObject();

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
      decisionReason: (body.decisionReason as string) || `Updated project ${project.name}`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ message: "Failed to update project" }, { status: 500 });
  }
}

// ─── DELETE /api/projects/[id] ───────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await verifyPermission("DELETE_PROJECT");
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

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const previousState = project.toObject();

    await Project.findByIdAndDelete(id);

    await recordAuditLog({
      requestId,
      actor: auth.member,
      action: "projects.delete",
      resource: {
        type: "Project",
        id: project._id,
        identifier: project.name,
      },
      previousState,
      newState: null,
      decisionReason: `Deleted project: ${project.name}`,
      authorizationResult: "STANDARD_GRANT",
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ message: "Failed to delete project" }, { status: 500 });
  }
}
