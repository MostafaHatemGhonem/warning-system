import type { MemberRole } from "@/models/member";
import type { WarningLevel, WarningType, WarningStatus } from "@/models/warning";

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
  isCommitteeMember?: boolean;
};

export type WarningMemberRef = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar?: string;
};

export type WarningProjectRef = {
  _id: string;
  name: string;
};

export type WarningIssuerRef = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
};

export type WarningItem = {
  _id: string;
  member: WarningMemberRef | string;
  project?: WarningProjectRef | string | null;
  type: WarningType;
  level: WarningLevel;
  severity: 1 | 2 | 3;
  points: number;
  isDirectFinalWarning: boolean;
  directIssuanceReason?: string;
  incidentDate: string;
  description: string;
  evidence?: string[];
  status: WarningStatus;
  issuedBy: WarningIssuerRef | string;
  approvedBy?: { _id: string; name: string } | string | null;
  approvedAt?: string | null;
  notifiedAt?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  suspension?: {
    isSuspended: boolean;
    suspendedAt?: string | null;
    suspendedUntil?: string | null;
    reason?: string;
    reviewedWithin48h?: boolean;
    liftedAt?: string | null;
    liftedBy?: string | null;
  };
  improvementPlan?: {
    isActive: boolean;
    problemSummary?: string;
    desiredBehavior?: string;
    targetCompletionDate?: string | null;
    durationDays?: number;
    actionSteps?: string[];
    measurableSuccessCriteria?: string;
    supervisor?: string;
    finalDecision?: "Accepted" | "Extended" | "Rejected" | null;
    evaluationNotes?: string | null;
    disciplinaryRecommendation?: string | null;
  };
  review?: {
    status: "None" | "Requested" | "Under_Review" | "Decided";
    requestedAt?: string | null;
    reason?: string;
    decision?: "Confirm" | "Reduce" | "Cancel" | "Improvement_Plan" | "Reinvestigate" | null;
    decidedBy?: string | null;
    decidedAt?: string | null;
    appealDeadline?: string | null;
    disciplinaryRecommendation?: string | null;
  };
  extension?: {
    isExtended: boolean;
    extendedDays?: number;
    extendedAt?: string | null;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export function extractId(entity: unknown): string {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  if (typeof entity === "object" && "_id" in entity) {
    return String((entity as { _id: unknown })._id);
  }
  return String(entity);
}

export function isSelfWarning(warning: WarningItem, user: CurrentUser | null): boolean {
  if (!user) return false;
  return extractId(warning.member) === user._id;
}

export function isIssuer(warning: WarningItem, user: CurrentUser | null): boolean {
  if (!user) return false;
  return extractId(warning.issuedBy) === user._id;
}

export function isExceptionalWarning(type: WarningType, level: WarningLevel, isDirectFinal: boolean): boolean {
  return type === "Global" || isDirectFinal;
}

export function canIssueWarning(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.role === "Team Leader" || user.role === "Admin" || user.role === "Super Admin";
}

export function canApproveWarning(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (warning.status !== "Pending_Approval") {
    return { allowed: false, reason: "Warning is not in Pending_Approval status" };
  }
  // Super Admin universal bypass
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  // HR Boundary
  if (user.role === "HR") {
    return {
      allowed: false,
      reason: "HR role is restricted to governance and records keeping; warning approval requires Committee or Lead authority",
    };
  }
  // Conflict of interest check
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot approve a warning issued against yourself" };
  }
  if (isIssuer(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: The original issuer cannot approve their own warning (neutral review required)" };
  }
  // Authority check: Global and Final Warnings strictly require Committee (Admin / Committee role)
  const isGlobalOrFinal = warning.type === "Global" || warning.level === "Final Warning";
  const isCommittee =
    user.role === "Admin" ||
    user.role === "Committee" ||
    Boolean(user.isCommitteeMember);

  if (isGlobalOrFinal && !isCommittee) {
    return { allowed: false, reason: "Global and Final Warnings strictly require Committee / Admin approval" };
  }
  return { allowed: true };
}

export function canApplySuspension(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (warning.suspension?.isSuspended) {
    return { allowed: false, reason: "Warning is already under suspension" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  if (user.role !== "Team Leader" && user.role !== "Admin") {
    return { allowed: false, reason: "Only Team Leaders and Admins can apply suspensions" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot suspend yourself" };
  }
  return { allowed: true };
}

export function canLiftSuspension(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (!warning.suspension?.isSuspended) {
    return { allowed: false, reason: "No active suspension to lift" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  if (user.role !== "Team Leader" && user.role !== "Admin") {
    return { allowed: false, reason: "Only Team Leaders and Admins can lift suspensions" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot lift your own suspension" };
  }
  return { allowed: true };
}

export function canRequestAppeal(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string; remainingDays?: number } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (!isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Only the subject member can request an appeal" };
  }
  if (warning.review && warning.review.status !== "None") {
    return { allowed: false, reason: "An appeal review has already been submitted for this warning" };
  }
  if (warning.status !== "Active" && warning.status !== "Extended") {
    return { allowed: false, reason: "Appeals can only be submitted for active warnings" };
  }

  // 7-day appeal window from notifiedAt
  const notifiedTime = warning.notifiedAt ? new Date(warning.notifiedAt).getTime() : new Date(warning.createdAt).getTime();
  const deadline = notifiedTime + 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now > deadline) {
    return { allowed: false, reason: "The 7-day appeal window has expired" };
  }

  const remainingDays = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000));
  return { allowed: true, remainingDays };
}

export function canDecideAppeal(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (warning.review?.status !== "Requested" && warning.review?.status !== "Under_Review") {
    return { allowed: false, reason: "No pending appeal request to decide" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  // HR Boundary
  if (user.role === "HR") {
    return {
      allowed: false,
      reason: "HR role is restricted to governance and records keeping; appeal adjudication strictly requires Neutral Committee authority",
    };
  }
  const isCommittee =
    user.role === "Admin" ||
    user.role === "Committee" ||
    Boolean(user.isCommitteeMember);

  if (user.role !== "Team Leader" && !isCommittee) {
    return { allowed: false, reason: "Only Committee members, Admins, and Team Leaders can review appeals" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot review an appeal for yourself" };
  }
  if (isIssuer(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: The original issuer cannot decide the appeal (neutral committee required)" };
  }
  if (warning.type === "Global" || warning.level === "Final Warning") {
    if (!isCommittee) {
      return { allowed: false, reason: "Appeals for Global and Final Warnings must be decided by Committee / Admin" };
    }
  }
  return { allowed: true };
}

export function canManageImprovementPlan(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (warning.improvementPlan?.isActive) {
    return { allowed: false, reason: "An improvement plan is already active for this warning" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  if (user.role !== "Team Leader" && user.role !== "Admin") {
    return { allowed: false, reason: "Only Team Leaders and Admins can manage improvement plans" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot initiate an improvement plan for yourself" };
  }
  return { allowed: true };
}

export function canEvaluateImprovementPlan(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (!warning.improvementPlan?.isActive) {
    return { allowed: false, reason: "No active improvement plan to evaluate" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  if (user.role !== "Team Leader" && user.role !== "Admin") {
    return { allowed: false, reason: "Only Team Leaders and Admins can evaluate improvement plans" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot evaluate an improvement plan for yourself" };
  }
  return { allowed: true };
}

export function canExtendWarning(
  warning: WarningItem,
  user: CurrentUser | null,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Authentication required" };
  if (warning.status !== "Active" && warning.status !== "Extended") {
    return { allowed: false, reason: "Only active warnings can be extended" };
  }
  if (user.role === "Super Admin") {
    return { allowed: true };
  }
  if (user.role !== "Team Leader" && user.role !== "Admin") {
    return { allowed: false, reason: "Only Team Leaders and Admins can extend warnings" };
  }
  if (isSelfWarning(warning, user)) {
    return { allowed: false, reason: "Conflict of Interest: You cannot extend your own warning" };
  }
  if (warning.extension?.isExtended) {
    return { allowed: false, reason: "Policy strictly permits only one extension per warning" };
  }
  return { allowed: true };
}
