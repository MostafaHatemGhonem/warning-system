import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import Committee from "@/models/committee";
import Member from "@/models/member";
import Warning from "@/models/warning";
import { validateAddMemberToTiedCommittee } from "@/lib/committee-rules";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const authCheck = can(currentMember, "committee.tie_break");
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid committee ID format." },
        { status: 400 },
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { memberId, reason } = body;
    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return NextResponse.json(
        { success: false, message: "Valid memberId is required." },
        { status: 400 },
      );
    }

    const decisionReason = typeof reason === "string" && reason.trim().length >= 5
      ? reason.trim()
      : "Adding tie-breaking member to resolve committee deadlock";

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const committee = await Committee.findById(id);
    if (!committee) {
      return NextResponse.json(
        { success: false, message: "Committee not found." },
        { status: 404 },
      );
    }

    // Fetch case resource
    let resourceTarget: any = null;
    if (committee.resourceType === "Warning") {
      resourceTarget = await Warning.findById(committee.resourceId).lean();
    }
    if (!resourceTarget) {
      return NextResponse.json(
        { success: false, message: "Associated case resource not found." },
        { status: 404 },
      );
    }

    // Fetch new candidate member
    const newMemberDoc = await Member.findById(memberId).lean();
    if (!newMemberDoc) {
      return NextResponse.json(
        { success: false, message: "Candidate member not found." },
        { status: 404 },
      );
    }

    const safeNewMember = {
      _id: newMemberDoc._id.toString(),
      name: newMemberDoc.name,
      email: newMemberDoc.email,
      role: newMemberDoc.role,
      isCommitteeMember: Boolean(newMemberDoc.isCommitteeMember),
      avatar: newMemberDoc.avatar,
      isActive: Boolean(newMemberDoc.isActive),
      createdAt: newMemberDoc.createdAt,
      updatedAt: newMemberDoc.updatedAt,
    };

    // Validate adding member to tied committee
    const validation = validateAddMemberToTiedCommittee(
      committee,
      resourceTarget,
      safeNewMember,
      currentMember,
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: validation.status || 400 },
      );
    }

    const previousState = committee.toObject();

    // Append new member and reopen voting
    committee.members.push({
      memberId: new mongoose.Types.ObjectId(newMemberDoc._id),
      roleAtFormation: newMemberDoc.role,
      joinedAt: new Date(),
    });
    committee.status = "ACTIVE";
    committee.decisionOutcome = null;
    committee.decisionSummary = `Deadlock resolution: Member ${newMemberDoc.name} (${newMemberDoc.role}) added by Super Admin to achieve odd quorum. Voting reopened.`;

    await committee.save();
    const newState = committee.toObject();

    // Immutable Audit Log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "committee.add_member",
      resource: {
        type: "Committee",
        id: committee._id,
        identifier: committee.caseNumber,
      },
      previousState,
      newState,
      decisionReason,
      authorizationResult: "STANDARD_GRANT",
    });

    const populated = await Committee.findById(committee._id)
      .populate("members.memberId", "name email role avatar")
      .populate("votes.memberId", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({
      success: true,
      message: `Member ${newMemberDoc.name} successfully added to resolve deadlock. Voting reopened.`,
      data: populated,
    });
  } catch (error) {
    console.error("POST /api/committees/[id]/members error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add member to committee." },
      { status: 500 },
    );
  }
}
