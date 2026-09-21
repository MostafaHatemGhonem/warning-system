import mongoose from "mongoose";
import { ICommittee, ICommitteeVote, ICommitteeMemberRef } from "@/models/committee";
import { SafeMember } from "@/lib/auth";

export const ELIGIBLE_COMMITTEE_ROLES = [
  "Super Admin",
  "HR",
  "Admin",
  "Team Leader",
] as const;

export type EligibleCommitteeRole = (typeof ELIGIBLE_COMMITTEE_ROLES)[number];

export interface CommitteeValidationResult {
  isValid: boolean;
  error?: string;
  status?: 400 | 403;
}

/**
 * Validates committee formation according to governance rules:
 * 1. Quorum: Minimum 3 members required.
 * 2. Distinctness: No duplicate members.
 * 3. Role Eligibility: Members must be Super Admin, HR, Admin, or Team Leader.
 * 4. Active Status: Members must be active.
 * 5. COI Neutrality:
 *    - Not warning issuer (issuedBy)
 *    - Not subject member (member)
 *    - Not original approver in appeals (approvedBy)
 */
export function validateCommitteeFormation(
  resource: {
    _id: string | mongoose.Types.ObjectId;
    member?: any;
    issuedBy?: any;
    approvedBy?: any;
  },
  candidateMembers: SafeMember[],
  creator: SafeMember,
): CommitteeValidationResult {
  if (creator.role !== "Super Admin") {
    return {
      isValid: false,
      status: 403,
      error: "Forbidden: Only Super Admin is authorized to form a governance committee.",
    };
  }

  if (!candidateMembers || candidateMembers.length < 3) {
    return {
      isValid: false,
      status: 400,
      error: "Committee formation requires a minimum quorum of 3 eligible members.",
    };
  }

  // Check distinct members
  const memberIdSet = new Set<string>();
  for (const m of candidateMembers) {
    const mId = m._id.toString();
    if (memberIdSet.has(mId)) {
      return {
        isValid: false,
        status: 400,
        error: `Duplicate member detected in committee formation: ${m.name} (${m.email}).`,
      };
    }
    memberIdSet.add(mId);

    // Active check
    if (!m.isActive) {
      return {
        isValid: false,
        status: 400,
        error: `Member ${m.name} (${m.email}) is currently deactivated and cannot be seated on a committee.`,
      };
    }

    // Role eligibility check
    if (!ELIGIBLE_COMMITTEE_ROLES.includes(m.role as EligibleCommitteeRole)) {
      return {
        isValid: false,
        status: 400,
        error: `Member ${m.name} has role '${m.role}'. Only Super Admin, HR, Admin, and Team Leader are eligible.`,
      };
    }

    // COI Checks
    const issuerIdStr = (
      resource.issuedBy && typeof resource.issuedBy === "object" && "_id" in resource.issuedBy
        ? (resource.issuedBy as { _id: unknown })._id
        : resource.issuedBy
    )?.toString();

    const subjectMemberIdStr = (
      resource.member && typeof resource.member === "object" && "_id" in resource.member
        ? (resource.member as { _id: unknown })._id
        : resource.member
    )?.toString();

    const approverIdStr = (
      resource.approvedBy && typeof resource.approvedBy === "object" && "_id" in resource.approvedBy
        ? (resource.approvedBy as { _id: unknown })._id
        : resource.approvedBy
    )?.toString();

    if (issuerIdStr && mId === issuerIdStr) {
      return {
        isValid: false,
        status: 400,
        error: `Conflict of interest: Member ${m.name} is the issuer of this case and cannot sit on the judging committee.`,
      };
    }

    if (subjectMemberIdStr && mId === subjectMemberIdStr) {
      return {
        isValid: false,
        status: 400,
        error: `Conflict of interest: Member ${m.name} is the subject of this case and cannot sit on their own committee.`,
      };
    }

    if (approverIdStr && mId === approverIdStr) {
      return {
        isValid: false,
        status: 400,
        error: `Conflict of interest: Member ${m.name} approved the original warning and cannot judge this review/appeal.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates casting an individual vote in an active committee
 */
export function validateVoteSubmission(
  committee: ICommittee,
  voter: SafeMember,
  vote: "Approve" | "Reject",
  reason: string,
): CommitteeValidationResult {
  if (committee.status !== "ACTIVE") {
    return {
      isValid: false,
      status: 400,
      error: `Voting is closed. Committee status is '${committee.status}'.`,
    };
  }

  const voterIdStr = voter._id.toString();

  // Check if voter is an enrolled member
  const isEnrolled = committee.members.some(
    (m) => m.memberId.toString() === voterIdStr,
  );
  if (!isEnrolled) {
    return {
      isValid: false,
      status: 403,
      error: "Forbidden: You are not a seated member of this case's committee.",
    };
  }

  // Check if voter has already voted
  const alreadyVoted = committee.votes.some(
    (v) => v.memberId.toString() === voterIdStr,
  );
  if (alreadyVoted) {
    return {
      isValid: false,
      status: 400,
      error: "You have already cast your vote for this committee case.",
    };
  }

  if (vote !== "Approve" && vote !== "Reject") {
    return {
      isValid: false,
      status: 400,
      error: "Vote must be either 'Approve' or 'Reject'.",
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      isValid: false,
      status: 400,
      error: "A documented rationale of at least 5 characters is required for your vote.",
    };
  }

  return { isValid: true };
}

export interface VotingEvaluationResult {
  hasResult: boolean;
  outcome: "APPROVED" | "REJECTED" | "NO_DECISION" | null;
  isTie: boolean;
  approveCount: number;
  rejectCount: number;
  totalMembers: number;
  remainingVotes: number;
  majorityThreshold: number;
}

/**
 * Democratic Majority Voting Evaluation:
 * - Each member = 1 vote.
 * - Strict Majority (> 50%) required to adopt decision:
 *   - 3 members: threshold = 2
 *   - 4 members: threshold = 3
 *   - 5 members: threshold = 3
 * - If all members voted and no majority achieved (e.g. 2 Approve vs 2 Reject in 4 members):
 *   - Outcome is NO_DECISION, Status becomes TIED.
 */
export function evaluateCommitteeVotes(committee: ICommittee): VotingEvaluationResult {
  const totalMembers = committee.members.length;
  const majorityThreshold = Math.floor(totalMembers / 2) + 1;

  const approveCount = committee.votes.filter((v) => v.vote === "Approve").length;
  const rejectCount = committee.votes.filter((v) => v.vote === "Reject").length;
  const totalVotesCast = committee.votes.length;
  const remainingVotes = totalMembers - totalVotesCast;

  // 1. Check if Approve reached majority
  if (approveCount >= majorityThreshold) {
    committee.decisionOutcome = "APPROVED";
    committee.status = "DECIDED";
    committee.decidedAt = new Date();
    committee.decisionSummary = `Adopted by majority vote (${approveCount} Approve vs ${rejectCount} Reject out of ${totalMembers} members).`;
    return {
      hasResult: true,
      outcome: "APPROVED",
      isTie: false,
      approveCount,
      rejectCount,
      totalMembers,
      remainingVotes,
      majorityThreshold,
    };
  }

  // 2. Check if Reject reached majority
  if (rejectCount >= majorityThreshold) {
    committee.decisionOutcome = "REJECTED";
    committee.status = "DECIDED";
    committee.decidedAt = new Date();
    committee.decisionSummary = `Rejected by majority vote (${rejectCount} Reject vs ${approveCount} Approve out of ${totalMembers} members).`;
    return {
      hasResult: true,
      outcome: "REJECTED",
      isTie: false,
      approveCount,
      rejectCount,
      totalMembers,
      remainingVotes,
      majorityThreshold,
    };
  }

  // 3. Check if all members voted and neither reached majority (Deadlock / Tie)
  if (totalVotesCast === totalMembers) {
    committee.decisionOutcome = "NO_DECISION";
    committee.status = "TIED";
    committee.decisionSummary = `Vote deadlocked at ${approveCount} Approve vs ${rejectCount} Reject. No majority achieved. Super Admin must expand or re-form committee.`;
    return {
      hasResult: false,
      outcome: "NO_DECISION",
      isTie: true,
      approveCount,
      rejectCount,
      totalMembers,
      remainingVotes: 0,
      majorityThreshold,
    };
  }

  // 4. Voting still in progress
  return {
    hasResult: false,
    outcome: null,
    isTie: false,
    approveCount,
    rejectCount,
    totalMembers,
    remainingVotes,
    majorityThreshold,
  };
}

/**
 * Validates adding an additional member to break a TIED committee
 */
export function validateAddMemberToTiedCommittee(
  committee: ICommittee,
  resource: {
    _id: string | mongoose.Types.ObjectId;
    member?: any;
    issuedBy?: any;
    approvedBy?: any;
  },
  newMember: SafeMember,
  creator: SafeMember,
): CommitteeValidationResult {
  if (creator.role !== "Super Admin") {
    return {
      isValid: false,
      status: 403,
      error: "Forbidden: Only Super Admin can add members to a committee.",
    };
  }

  if (committee.status !== "TIED") {
    return {
      isValid: false,
      status: 400,
      error: `Members can only be added to a TIED committee to resolve deadlocks. Current status is '${committee.status}'.`,
    };
  }

  const newMemberIdStr = newMember._id.toString();

  // Check if already in committee
  if (committee.members.some((m) => m.memberId.toString() === newMemberIdStr)) {
    return {
      isValid: false,
      status: 400,
      error: `Member ${newMember.name} is already seated on this committee.`,
    };
  }

  if (!newMember.isActive) {
    return {
      isValid: false,
      status: 400,
      error: `Member ${newMember.name} is deactivated.`,
    };
  }

  if (!ELIGIBLE_COMMITTEE_ROLES.includes(newMember.role as EligibleCommitteeRole)) {
    return {
      isValid: false,
      status: 400,
      error: `Member ${newMember.name} has role '${newMember.role}'. Only Super Admin, HR, Admin, and Team Leader are eligible.`,
    };
  }

  // COI check
  const issuerIdStr = (
    resource.issuedBy && typeof resource.issuedBy === "object" && "_id" in resource.issuedBy
      ? (resource.issuedBy as { _id: unknown })._id
      : resource.issuedBy
  )?.toString();

  const subjectMemberIdStr = (
    resource.member && typeof resource.member === "object" && "_id" in resource.member
      ? (resource.member as { _id: unknown })._id
      : resource.member
  )?.toString();

  const approverIdStr = (
    resource.approvedBy && typeof resource.approvedBy === "object" && "_id" in resource.approvedBy
      ? (resource.approvedBy as { _id: unknown })._id
      : resource.approvedBy
  )?.toString();

  if (issuerIdStr && newMemberIdStr === issuerIdStr) {
    return {
      isValid: false,
      status: 400,
      error: `Conflict of interest: Member ${newMember.name} is the issuer of this case.`,
    };
  }

  if (subjectMemberIdStr && newMemberIdStr === subjectMemberIdStr) {
    return {
      isValid: false,
      status: 400,
      error: `Conflict of interest: Member ${newMember.name} is the subject of this case.`,
    };
  }

  if (approverIdStr && newMemberIdStr === approverIdStr) {
    return {
      isValid: false,
      status: 400,
      error: `Conflict of interest: Member ${newMember.name} approved the original warning.`,
    };
  }

  return { isValid: true };
}

export function generateCaseNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `COM-${timestamp}-${random}`;
}
