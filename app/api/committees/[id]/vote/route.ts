import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentMember } from "@/lib/auth";
import { can } from "@/lib/authorization";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import Committee from "@/models/committee";
import Warning from "@/models/warning";
import {
  validateVoteSubmission,
  evaluateCommitteeVotes,
} from "@/lib/committee-rules";
import { executeWarningApproval } from "@/lib/warning-rules";

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

    const { vote, reason } = body;

    await connectToDatabase();
    const requestId = getOrCreateRequestId(req);

    const committee = await Committee.findById(id);
    if (!committee) {
      return NextResponse.json(
        { success: false, message: "Committee not found." },
        { status: 404 },
      );
    }

    // 1. Authorization check via can() with committee context
    const authCheck = can(currentMember, "committee.vote", null, { committee });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.reason },
        { status: authCheck.status },
      );
    }

    // 2. Validate vote input
    const validation = validateVoteSubmission(
      committee,
      currentMember,
      vote,
      reason,
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: validation.status || 400 },
      );
    }

    const previousCommitteeState = committee.toObject();

    // 3. Register vote
    committee.votes.push({
      memberId: new mongoose.Types.ObjectId(currentMember._id),
      role: currentMember.role,
      vote,
      reason: reason.trim(),
      votedAt: new Date(),
    });

    // 4. Evaluate Democratic Majority
    const evalResult = evaluateCommitteeVotes(committee);

    // If a definitive majority was reached, propagate decision to the underlying case
    let caseUpdated = false;
    if (evalResult.hasResult) {
      if (committee.resourceType === "Warning") {
        const warning = await Warning.findById(committee.resourceId);
        if (warning && warning.status === "Pending_Approval") {
          const prevWarningState = warning.toObject();
          if (evalResult.outcome === "APPROVED") {
            executeWarningApproval(warning, currentMember._id, new Date());
            await warning.save();
            caseUpdated = true;

            await recordAuditLog({
              requestId,
              actor: currentMember,
              action: "warnings.approve",
              resource: {
                type: "Warning",
                id: warning._id,
                identifier: `${warning.type} - ${warning.level}`,
              },
              previousState: prevWarningState,
              newState: warning.toObject(),
              decisionReason: `Approved by committee majority vote (${committee.caseNumber})`,
              authorizationResult: "STANDARD_GRANT",
            });
          } else if (evalResult.outcome === "REJECTED") {
            warning.status = "Cancelled";
            await warning.save();
            caseUpdated = true;

            await recordAuditLog({
              requestId,
              actor: currentMember,
              action: "warnings.edit",
              resource: {
                type: "Warning",
                id: warning._id,
                identifier: `${warning.type} - ${warning.level}`,
              },
              previousState: prevWarningState,
              newState: warning.toObject(),
              decisionReason: `Rejected by committee majority vote (${committee.caseNumber})`,
              authorizationResult: "STANDARD_GRANT",
            });
          }
        }
      } else if (committee.resourceType === "Removal") {
        const warning = await Warning.findById(committee.resourceId);
        if (warning) {
          const prevWarningState = warning.toObject();
          if (evalResult.outcome === "APPROVED") {
            warning.review.disciplinaryRecommendation = "None";
            warning.status = "Resolved";
            if (warning.project) {
              const Project = (await import("@/models/project")).default;
              await Project.findByIdAndUpdate(warning.project, {
                $inc: { members: -1 },
              });
            }
            await warning.save();
            caseUpdated = true;

            await recordAuditLog({
              requestId,
              actor: currentMember,
              action: "committee.decide",
              resource: {
                type: "Warning",
                id: warning._id,
                identifier: `${warning.type} - Project Removal Enacted (Clause 14)`,
              },
              previousState: prevWarningState,
              newState: warning.toObject(),
              decisionReason: `Project Removal approved by committee majority vote (${committee.caseNumber})`,
              authorizationResult: "STANDARD_GRANT",
            });
          } else if (evalResult.outcome === "REJECTED") {
            warning.review.disciplinaryRecommendation = "Refer_To_Improvement_Plan";
            await warning.save();
            caseUpdated = true;

            await recordAuditLog({
              requestId,
              actor: currentMember,
              action: "committee.decide",
              resource: {
                type: "Warning",
                id: warning._id,
                identifier: `${warning.type} - Project Removal Rejected (Clause 14)`,
              },
              previousState: prevWarningState,
              newState: warning.toObject(),
              decisionReason: `Project Removal rejected by committee majority vote; member retained with improvement plan (${committee.caseNumber})`,
              authorizationResult: "STANDARD_GRANT",
            });
          }
        }
      }
    }

    await committee.save();
    const newCommitteeState = committee.toObject();

    // 5. Immutable Audit Log for the vote/decision
    if (evalResult.hasResult) {
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "committee.decide",
        resource: {
          type: "Committee",
          id: committee._id,
          identifier: committee.caseNumber,
        },
        previousState: previousCommitteeState,
        newState: newCommitteeState,
        decisionReason: committee.decisionSummary || `Committee decision: ${evalResult.outcome}`,
        authorizationResult: "STANDARD_GRANT",
      });
    } else if (evalResult.isTie) {
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "committee.tie",
        resource: {
          type: "Committee",
          id: committee._id,
          identifier: committee.caseNumber,
        },
        previousState: previousCommitteeState,
        newState: newCommitteeState,
        decisionReason: committee.decisionSummary || "Vote deadlocked. Super Admin expansion required.",
        authorizationResult: "STANDARD_GRANT",
      });
    } else {
      await recordAuditLog({
        requestId,
        actor: currentMember,
        action: "committee.vote",
        resource: {
          type: "Committee",
          id: committee._id,
          identifier: committee.caseNumber,
        },
        previousState: previousCommitteeState,
        newState: newCommitteeState,
        decisionReason: `Cast vote: ${vote}. Rationale: ${reason.trim()}`,
        authorizationResult: "STANDARD_GRANT",
      });
    }

    const populated = await Committee.findById(committee._id)
      .populate("members.memberId", "name email role avatar")
      .populate("votes.memberId", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({
      success: true,
      message: evalResult.hasResult
        ? `Committee decision finalized: ${evalResult.outcome}`
        : evalResult.isTie
          ? "Votes tied with no majority. Deadlock status recorded."
          : "Vote successfully recorded. Awaiting remaining votes.",
      data: {
        committee: populated,
        evaluation: evalResult,
        caseUpdated,
      },
    });
  } catch (error) {
    console.error("POST /api/committees/[id]/vote error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process committee vote." },
      { status: 500 },
    );
  }
}
