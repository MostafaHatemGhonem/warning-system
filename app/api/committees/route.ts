import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import Committee from "@/models/committee";
import Member from "@/models/member";
import Warning from "@/models/warning";
import {
  validateCommitteeFormation,
  generateCaseNumber,
} from "@/lib/committee-rules";

export async function POST(req: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const authCheck = can(currentMember, "committee.form");
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
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

    const { resourceType, resourceId, memberIds, reason } = body;

    if (!resourceType || !resourceId || !Array.isArray(memberIds)) {
      return NextResponse.json(
        {
          success: false,
          message: "resourceType, resourceId, and memberIds array are required.",
        },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(resourceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid resourceId format." },
        { status: 400 },
      );
    }

    const decisionReason = typeof reason === "string" && reason.trim().length >= 5
      ? reason.trim()
      : "Formal formation of governance committee";

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    // 1. Fetch resource to validate COI and existence
    let resourceTarget: any = null;
    if (resourceType === "Warning" || resourceType === "Appeal" || resourceType === "Suspension") {
      resourceTarget = await Warning.findById(resourceId).lean();
    }
    if (!resourceTarget) {
      return NextResponse.json(
        { success: false, message: `Target ${resourceType} resource not found.` },
        { status: 404 },
      );
    }

    // Check if an active committee already exists for this resource
    const existingActive = await Committee.findOne({
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      status: "ACTIVE",
    });
    if (existingActive) {
      return NextResponse.json(
        {
          success: false,
          message: `An active committee (${existingActive.caseNumber}) already exists for this case.`,
        },
        { status: 400 },
      );
    }

    // 2. Fetch candidate members
    const candidateMembers = await Member.find({
      _id: { $in: memberIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    }).lean();

    if (candidateMembers.length !== memberIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more designated members do not exist in the database.",
        },
        { status: 400 },
      );
    }

    const safeCandidates = candidateMembers.map((m: any) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      role: m.role,
      isCommitteeMember: Boolean(m.isCommitteeMember),
      avatar: m.avatar,
      isActive: Boolean(m.isActive),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    // 3. Validate Formation Rules (Quorum, Distinct, Roles, COI)
    const validation = validateCommitteeFormation(
      resourceTarget,
      safeCandidates,
      currentMember,
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: validation.status || 400 },
      );
    }

    // 4. Create the Committee
    const caseNumber = generateCaseNumber();
    const committeeMembers = safeCandidates.map((m) => ({
      memberId: new mongoose.Types.ObjectId(m._id),
      roleAtFormation: m.role,
      joinedAt: new Date(),
    }));

    const committee = await Committee.create({
      caseNumber,
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      members: committeeMembers,
      votes: [],
      status: "ACTIVE",
      decisionOutcome: null,
      decisionSummary: "",
      decidedAt: null,
      createdBy: new mongoose.Types.ObjectId(currentMember._id),
    });

    const newState = committee.toObject();

    // 5. Immutable Audit Log
    await recordAuditLog({
      requestId,
      actor: currentMember,
      action: "committee.form",
      resource: {
        type: "Committee",
        id: committee._id,
        identifier: caseNumber,
      },
      previousState: null,
      newState,
      decisionReason,
      authorizationResult: authCheck.authorizationResult,
    });

    const populated = await Committee.findById(committee._id)
      .populate("members.memberId", "name email role avatar")
      .populate("createdBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: `Committee ${caseNumber} successfully established with ${committeeMembers.length} members.`,
        data: populated,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/committees error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to establish committee." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentMember = await getCurrentMember();
    if (!currentMember) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resourceId");
    const resourceType = searchParams.get("resourceType");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (resourceId && mongoose.isValidObjectId(resourceId)) {
      query.resourceId = new mongoose.Types.ObjectId(resourceId);
    }
    if (resourceType) query.resourceType = resourceType;
    if (status) query.status = status;

    const committees = await Committee.find(query)
      .populate("members.memberId", "name email role avatar")
      .populate("votes.memberId", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: committees,
    });
  } catch (error) {
    console.error("GET /api/committees error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch committees." },
      { status: 500 },
    );
  }
}
