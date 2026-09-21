import mongoose from "mongoose";
import {
  DURATION_WARNING_DAYS,
  DURATION_FINAL_WARNING_DAYS,
  MAX_EXTENSION_DAYS,
  MAX_SUSPENSION_HOURS,
  WarningLevel,
  WarningSeverity,
  IWarning,
  calculateAppealDeadline,
} from "@/models/warning";

/**
 * Calculates active validity dates based on warning level:
 * - Warning 1 & Warning 2: 30 days
 * - Final Warning: 60 days
 */
export function calculateActivePeriod(
  level: WarningLevel,
  startDate: Date = new Date(),
): { activeFrom: Date; activeUntil: Date } {
  const days =
    level === "Final Warning"
      ? DURATION_FINAL_WARNING_DAYS
      : DURATION_WARNING_DAYS;

  const activeFrom = new Date(startDate);
  const activeUntil = new Date(startDate);
  activeUntil.setDate(activeUntil.getDate() + days);

  return { activeFrom, activeUntil };
}

/**
 * Focuses strictly on calculating and applying activeFrom & activeUntil
 * based on warning level (W1/W2 = 30 days, Final Warning = 60 days).
 * Does not assign approvedBy or approvedAt (reserved for Step 8D-2C Committee Flow).
 */
export function activateWarning(
  warning: IWarning,
  startDate: Date = new Date(),
): IWarning {
  const { activeFrom, activeUntil } = calculateActivePeriod(warning.level, startDate);
  warning.activeFrom = activeFrom;
  warning.activeUntil = activeUntil;
  warning.status = "Active";
  return warning;
}

/**
 * Validates extension parameters according to Clause 6.1:
 * - Warning may be extended ONCE only.
 * - Maximum extension duration is 30 days.
 * - A valid justification reason is required.
 */
export function validateExtension(
  warning: IWarning,
  extensionDays: number,
  reason: string,
): { isValid: boolean; error?: string } {
  // Check if warning has already been extended
  if (warning.extension?.isExtended) {
    return {
      isValid: false,
      error: "This warning has already been extended. The policy strictly permits only one extension.",
    };
  }

  // Check extension duration limit
  if (
    typeof extensionDays !== "number" ||
    extensionDays <= 0 ||
    extensionDays > MAX_EXTENSION_DAYS
  ) {
    return {
      isValid: false,
      error: `Extension duration must be between 1 and ${MAX_EXTENSION_DAYS} days.`,
    };
  }

  // Check reason
  if (!reason || !reason.trim()) {
    return {
      isValid: false,
      error: "A clear justification reason is required for warning extension.",
    };
  }

  // Warning must be in an active state to extend
  if (warning.status !== "Active" && warning.status !== "Extended") {
    return {
      isValid: false,
      error: "Only active warnings can be extended.",
    };
  }

  return { isValid: true };
}

/**
 * Evaluates warning expiration without automatic finalization or removal.
 * When activeUntil is reached, warning transitions to "Pending_Review",
 * requiring formal administrative review.
 */
export function evaluateWarningExpiration(warning: IWarning, now: Date = new Date()): boolean {
  if (
    (warning.status === "Active" || warning.status === "Extended") &&
    warning.activeUntil &&
    new Date(warning.activeUntil) < now
  ) {
    warning.status = "Pending_Review";
    return true; // Indicates status changed to Pending_Review
  }
  return false;
}

export interface ApproverIdentity {
  _id: string;
  role: string;
  isCommitteeMember?: boolean;
  email?: string;
  name?: string;
}

/**
 * Validates whether an approver is eligible to approve a warning according to:
 * 1. Warning State: Must be in "Pending_Approval".
 * 2. Conflict of Interest (Neutral Committee Principle):
 *    - Issuer cannot approve own warning (Issuer != Approver).
 *    - Subject member cannot approve warning against self (Member != Approver).
 * 3. Authority Level:
 *    - HR is strictly prohibited from approving warnings.
 *    - Global Warnings and Final Warnings strictly require Committee / Admin approval.
 *    - Team Leader is only authorized to approve Project Warnings (Warning 1 & 2) where not issuer.
 */
export function checkApprovalEligibility(
  warning: IWarning,
  approver: ApproverIdentity,
): { canApprove: boolean; status?: 400 | 403; error?: string } {
  // 1. State machine check
  if (warning.status !== "Pending_Approval") {
    return {
      canApprove: false,
      status: 400,
      error: `Cannot approve warning: Current status is '${warning.status}'. Only warnings in 'Pending_Approval' status can be approved.`,
    };
  }

  // Super Admin universal bypass: can approve any warning unconditionally
  if (approver.role === "Super Admin") {
    return { canApprove: true };
  }

  // HR Boundary: strictly governance and records keeping
  if (approver.role === "HR") {
    return {
      canApprove: false,
      status: 403,
      error: "Forbidden: HR role is restricted to governance and records keeping; warning approval requires Committee or Lead authority.",
    };
  }

  const approverIdStr = approver._id.toString();
  const issuerIdStr = (
    warning.issuedBy && typeof warning.issuedBy === "object" && "_id" in warning.issuedBy
      ? (warning.issuedBy as { _id: unknown })._id
      : warning.issuedBy
  )?.toString();

  const memberIdStr = (
    warning.member && typeof warning.member === "object" && "_id" in warning.member
      ? (warning.member as { _id: unknown })._id
      : warning.member
  )?.toString();

  // 2. Conflict of Interest: Issuer != Approver
  if (issuerIdStr && issuerIdStr === approverIdStr) {
    return {
      canApprove: false,
      status: 403,
      error: "Conflict of interest: The issuer of a warning cannot approve it. A neutral authority is required.",
    };
  }

  // 3. Conflict of Interest: Member != Approver
  if (memberIdStr && memberIdStr === approverIdStr) {
    return {
      canApprove: false,
      status: 403,
      error: "Conflict of interest: Cannot approve a warning issued against yourself.",
    };
  }

  // 4. Authority Level Check
  // Global Warnings & Final Warnings strictly require Committee / Admin approval
  const isGlobalOrFinal = warning.type === "Global" || warning.level === "Final Warning";
  const isCommittee =
    approver.role === "Admin" ||
    approver.role === "Committee" ||
    Boolean(approver.isCommitteeMember);

  if (isGlobalOrFinal && !isCommittee) {
    return {
      canApprove: false,
      status: 403,
      error: "Global Warnings and Final Warnings strictly require Committee / Admin approval.",
    };
  }

  return { canApprove: true };
}

/**
 * Executes warning approval and activation:
 * - Records approvedBy and approvedAt.
 * - Records notifiedAt = approvedAt (notification timestamp).
 * - Computes appealDeadline = notifiedAt + 7 days.
 * - Transitions status to "Active".
 * - Computes activeFrom = approvedAt.
 * - Computes activeUntil based on warning level (30 days for W1/W2, 60 days for Final Warning).
 */
export function executeWarningApproval(
  warning: IWarning,
  approverId: string,
  approvedAt: Date = new Date(),
): IWarning {
  const { activeFrom, activeUntil } = calculateActivePeriod(warning.level, approvedAt);

  warning.status = "Active";
  warning.approvedBy = new mongoose.Types.ObjectId(approverId);
  warning.approvedAt = approvedAt;
  warning.notifiedAt = approvedAt;
  warning.activeFrom = activeFrom;
  warning.activeUntil = activeUntil;

  // Initialize appeal window (7 calendar days from notification)
  if (!warning.review) {
    warning.review = {
      status: "None",
      requestedAt: null,
      reason: "",
      appealDeadline: calculateAppealDeadline(approvedAt),
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "None",
    };
  } else {
    warning.review.appealDeadline = calculateAppealDeadline(approvedAt);
  }

  return warning;
}

/**
 * Validates submission of an appeal / review request:
 * 1. Warning status must be Active or Extended.
 * 2. An appeal must not already be in progress or completed.
 * 3. Submission must occur within 7 calendar days from notifiedAt (Clause 18).
 */
export function validateAppealSubmission(
  warning: IWarning,
  requesterId: string,
  requesterRole: string,
  reason: string,
  now: Date = new Date(),
): { canAppeal: boolean; status?: 400 | 403; error?: string } {
  // 1. Check reason
  if (!reason || !reason.trim()) {
    return {
      canAppeal: false,
      status: 400,
      error: "A clear justification reason is required to submit a review / appeal.",
    };
  }

  // 2. State eligibility
  if (warning.status !== "Active" && warning.status !== "Extended") {
    return {
      canAppeal: false,
      status: 400,
      error: `Cannot submit appeal: Warning is currently in '${warning.status}' status. Only active or extended warnings can be appealed.`,
    };
  }

  // 3. No duplicate appeal
  if (warning.review && warning.review.status !== "None") {
    return {
      canAppeal: false,
      status: 400,
      error: "A review / appeal has already been requested or processed for this warning.",
    };
  }

  // 4. Authorization check: must be the subject member or authorized manager
  const memberIdStr = (
    warning.member && typeof warning.member === "object" && "_id" in warning.member
      ? (warning.member as { _id: unknown })._id
      : warning.member
  )?.toString();

  if (requesterRole === "Member" && memberIdStr !== requesterId.toString()) {
    return {
      canAppeal: false,
      status: 403,
      error: "Forbidden: You can only appeal warnings issued to yourself.",
    };
  }

  // 5. 7-Day appeal window from notification
  const notificationDate = warning.notifiedAt || warning.approvedAt || warning.activeFrom;
  const deadline = warning.review?.appealDeadline || (notificationDate ? calculateAppealDeadline(new Date(notificationDate)) : null);

  if (deadline && now > new Date(deadline)) {
    return {
      canAppeal: false,
      status: 400,
      error: "The 7-calendar-day appeal window from notification has expired.",
    };
  }

  return { canAppeal: true };
}

/**
 * Validates eligibility to decide an appeal:
 * 1. Warning must be currently 'Under_Review'.
 * 2. Strict Neutrality:
 *    - Original issuer cannot decide appeal (issuedBy != reviewer).
 *    - Original approver cannot decide appeal (approvedBy != reviewer).
 *    - Subject member cannot decide appeal (member != reviewer).
 * 3. Authority Scope:
 *    - Global and Final Warnings require Admin / Committee.
 */
export function validateReviewDecisionEligibility(
  warning: IWarning,
  reviewer: ApproverIdentity,
): { canDecide: boolean; status?: 400 | 403; error?: string } {
  // 1. Status check
  if (warning.status !== "Under_Review" || !warning.review || warning.review.status === "None" || warning.review.status === "Completed") {
    return {
      canDecide: false,
      status: 400,
      error: "Warning is not currently under review or awaiting decision.",
    };
  }

  // Super Admin universal bypass: can adjudicate any review/appeal unconditionally
  if (reviewer.role === "Super Admin") {
    return { canDecide: true };
  }

  const reviewerIdStr = reviewer._id.toString();

  const issuerIdStr = (
    warning.issuedBy && typeof warning.issuedBy === "object" && "_id" in warning.issuedBy
      ? (warning.issuedBy as { _id: unknown })._id
      : warning.issuedBy
  )?.toString();

  const approverIdStr = (
    warning.approvedBy && typeof warning.approvedBy === "object" && "_id" in warning.approvedBy
      ? (warning.approvedBy as { _id: unknown })._id
      : warning.approvedBy
  )?.toString();

  const memberIdStr = (
    warning.member && typeof warning.member === "object" && "_id" in warning.member
      ? (warning.member as { _id: unknown })._id
      : warning.member
  )?.toString();

  // 2. Neutrality Check: Original Issuer != Reviewer
  if (issuerIdStr && issuerIdStr === reviewerIdStr) {
    return {
      canDecide: false,
      status: 403,
      error: "Conflict of interest: The original issuer of the warning cannot review or decide the appeal.",
    };
  }

  // 3. Neutrality Check: Original Approver != Reviewer
  if (approverIdStr && approverIdStr === reviewerIdStr) {
    return {
      canDecide: false,
      status: 403,
      error: "Conflict of interest: The authority who approved the original warning cannot review their own decision. A neutral authority is required.",
    };
  }

  // 4. Neutrality Check: Subject Member != Reviewer
  if (memberIdStr && memberIdStr === reviewerIdStr) {
    return {
      canDecide: false,
      status: 403,
      error: "Conflict of interest: Cannot decide a review on a warning issued against yourself.",
    };
  }

  // HR Boundary: strictly governance and records keeping
  if (reviewer.role === "HR") {
    return {
      canDecide: false,
      status: 403,
      error: "Forbidden: HR role is restricted to governance and records keeping; appeal adjudication strictly requires Neutral Committee authority.",
    };
  }

  // 5. Authority Scope: Global & Final Warnings strictly require Admin / Committee
  const isGlobalOrFinal = warning.type === "Global" || warning.level === "Final Warning";
  const isCommittee =
    reviewer.role === "Admin" ||
    reviewer.role === "Committee" ||
    Boolean(reviewer.isCommitteeMember);

  if (isGlobalOrFinal && !isCommittee) {
    return {
      canDecide: false,
      status: 403,
      error: "Global Warnings and Final Warnings strictly require Committee / Admin review adjudication.",
    };
  }

  return { canDecide: true };
}

/**
 * Executes review decision according to Clause 18 options:
 * - Confirm: warning returns to Active
 * - Reduce: warning level or points reduced, returns to Active
 * - Cancel: warning revoked and struck from active record (status = Cancelled)
 * - Improvement_Plan: warning referred to structured improvement plan
 * - Reinvestigate: warning remains Under_Review with status In_Progress
 */
export function executeReviewDecision(
  warning: IWarning,
  decision: "Confirm" | "Reduce" | "Cancel" | "Improvement_Plan" | "Reinvestigate",
  decisionNotes: string,
  reviewerId: string,
  options?: {
    newLevel?: WarningLevel;
    newPoints?: number;
    newSeverity?: WarningSeverity;
  },
): IWarning {
  warning.review.decision = decision;
  warning.review.decisionNotes = decisionNotes;
  warning.review.decidedAt = new Date();
  warning.review.decidedBy = [new mongoose.Types.ObjectId(reviewerId)];

  switch (decision) {
    case "Confirm":
      warning.review.status = "Completed";
      warning.status = "Active";
      break;

    case "Cancel":
      warning.review.status = "Completed";
      warning.status = "Cancelled";
      break;

    case "Reduce":
      warning.review.status = "Completed";
      warning.status = "Active";
      if (options?.newLevel) warning.level = options.newLevel;
      if (typeof options?.newPoints === "number") warning.points = options.newPoints;
      if (options?.newSeverity) warning.severity = options.newSeverity;
      break;

    case "Improvement_Plan":
      warning.review.status = "Completed";
      warning.review.disciplinaryRecommendation = "Refer_To_Improvement_Plan";
      warning.status = "Active";
      break;

    case "Reinvestigate":
      warning.review.status = "In_Progress";
      warning.status = "Under_Review";
      break;
  }

  return warning;
}

// ─── Temporary Protective Suspension Helpers ─────────────────────────────────

/**
 * Validates suspension duration (strictly 0 < hours <= 48) and reason.
 */
export function validateSuspension(
  hours: number,
  reason: string,
): { isValid: boolean; status?: 400; error?: string } {
  if (typeof hours !== "number" || isNaN(hours) || hours <= 0 || hours > MAX_SUSPENSION_HOURS) {
    return {
      isValid: false,
      status: 400,
      error: `Temporary suspension duration must be greater than 0 and cannot exceed ${MAX_SUSPENSION_HOURS} hours.`,
    };
  }
  if (!reason || !reason.trim()) {
    return {
      isValid: false,
      status: 400,
      error: "A clear protective justification reason is required for temporary suspension.",
    };
  }
  return { isValid: true };
}

/**
 * Applies temporary protective suspension without altering warning level or guilt.
 */
export function applyTemporarySuspension(
  warning: IWarning,
  reason: string,
  hours: number = MAX_SUSPENSION_HOURS,
  now: Date = new Date(),
): IWarning {
  const suspendedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);
  warning.suspension = {
    isSuspended: true,
    suspendedAt: now,
    suspendedUntil,
    reason: reason.trim(),
    reviewedWithin48h: false,
  };
  return warning;
}

/**
 * Lifts temporary suspension and marks the case as reviewed within 48h.
 */
export function liftTemporarySuspension(warning: IWarning): IWarning {
  if (warning.suspension) {
    warning.suspension.isSuspended = false;
    warning.suspension.reviewedWithin48h = true;
  }
  return warning;
}

// ─── Improvement Plan Helpers ────────────────────────────────────────────────

export interface ImprovementPlanInput {
  problemSummary: string;
  desiredBehavior: string;
  actionSteps: string[];
  durationDays?: number;
  measurableSuccessCriteria: string;
  supervisor?: string | mongoose.Types.ObjectId | null;
}

export function validateImprovementPlanInput(
  input: ImprovementPlanInput,
): { isValid: boolean; status?: 400; error?: string } {
  if (!input.problemSummary || !input.problemSummary.trim()) {
    return { isValid: false, status: 400, error: "Problem summary is required for the improvement plan." };
  }
  if (!input.desiredBehavior || !input.desiredBehavior.trim()) {
    return { isValid: false, status: 400, error: "Desired behavior and expected results must be clearly stated." };
  }
  if (
    !Array.isArray(input.actionSteps) ||
    input.actionSteps.filter((s) => typeof s === "string" && s.trim()).length === 0
  ) {
    return { isValid: false, status: 400, error: "At least one actionable step is required in the improvement plan." };
  }
  const days = input.durationDays ?? 30;
  if (typeof days !== "number" || isNaN(days) || days < 7 || days > 60) {
    return { isValid: false, status: 400, error: "Improvement plan duration must be between 7 and 60 days." };
  }
  if (!input.measurableSuccessCriteria || !input.measurableSuccessCriteria.trim()) {
    return { isValid: false, status: 400, error: "Measurable, observable success criteria are required." };
  }
  return { isValid: true };
}

export function initiateImprovementPlan(
  warning: IWarning,
  input: ImprovementPlanInput,
  now: Date = new Date(),
): IWarning {
  const durationDays = input.durationDays ?? 30;
  const targetCompletionDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const cleanActionSteps = input.actionSteps.map((s) => s.trim()).filter(Boolean);

  warning.improvementPlan = {
    isActive: true,
    problemSummary: input.problemSummary.trim(),
    desiredBehavior: input.desiredBehavior.trim(),
    actionSteps: cleanActionSteps,
    durationDays,
    startDate: now,
    targetCompletionDate,
    measurableSuccessCriteria: input.measurableSuccessCriteria.trim(),
    supervisor: input.supervisor ? new mongoose.Types.ObjectId(input.supervisor.toString()) : null,
    finalDecision: "Pending",
    finalNotes: "",
    decidedAt: null,
  };

  if (!warning.review) {
    warning.review = {
      status: "None",
      requestedAt: null,
      reason: "",
      appealDeadline: null,
      decision: null,
      decisionNotes: "",
      decidedAt: null,
      decidedBy: [],
      disciplinaryRecommendation: "Refer_To_Improvement_Plan",
    };
  } else {
    warning.review.disciplinaryRecommendation = "Refer_To_Improvement_Plan";
  }

  return warning;
}

export function evaluateImprovementPlanOutcome(
  warning: IWarning,
  decision: "Accepted" | "Extended" | "Rejected",
  finalNotes: string,
  extensionDays?: number,
  now: Date = new Date(),
): { isValid: boolean; error?: string; status?: 400 } {
  if (!warning.improvementPlan || !warning.improvementPlan.isActive) {
    return { isValid: false, status: 400, error: "Warning does not have an active improvement plan to evaluate." };
  }
  if (!finalNotes || !finalNotes.trim()) {
    return { isValid: false, status: 400, error: "Detailed evaluation notes are required to document the plan outcome." };
  }

  warning.improvementPlan.finalNotes = finalNotes.trim();
  warning.improvementPlan.decidedAt = now;
  warning.improvementPlan.finalDecision = decision;

  if (decision === "Accepted") {
    // Member demonstrated commitment and successful improvement
    warning.improvementPlan.isActive = false;
    warning.status = "Resolved"; // Successfully closed due to positive improvement
  } else if (decision === "Extended") {
    const extDays = typeof extensionDays === "number" && extensionDays > 0 && extensionDays <= 30 ? extensionDays : 14;
    const baseDate = warning.improvementPlan.targetCompletionDate
      ? new Date(warning.improvementPlan.targetCompletionDate)
      : now;
    const newTarget = new Date(baseDate.getTime() + extDays * 24 * 60 * 60 * 1000);
    warning.improvementPlan.targetCompletionDate = newTarget;
    warning.improvementPlan.isActive = true;
  } else if (decision === "Rejected") {
    // Non-compliance: close plan and refer for formal disciplinary review (no auto-removal)
    warning.improvementPlan.isActive = false;
    if (warning.review) {
      warning.review.disciplinaryRecommendation = "Refer_To_Formal_Removal_Review";
    }
  }

  return { isValid: true };
}

