import type { MemberRole } from "@/models/member";
import { getCurrentMember } from "@/lib/auth";
import type { SafeMember } from "@/lib/auth";

// ─── Actions & Permissions ───────────────────────────────────────────────────
export const PERMISSIONS = [
  // Legacy / Navigation Permissions
  "VIEW_DASHBOARD",
  "VIEW_PROJECTS",
  "CREATE_PROJECT",
  "EDIT_PROJECT",
  "DELETE_PROJECT",
  "VIEW_TASKS",
  "CREATE_TASK",
  "EDIT_TASK",
  "DELETE_TASK",

  // Member Management Permissions
  "VIEW_MEMBERS",
  "ADD_MEMBER",
  "EDIT_MEMBER",
  "MANAGE_MEMBER_STATUS",
  "members.view",
  "members.manage",
  "members.manage_status",

  // Warning & Governance Permissions
  "VIEW_WARNINGS",
  "MANAGE_WARNINGS",
  "APPROVE_WARNINGS",
  "warnings.view",
  "warnings.issue_standard",
  "warnings.issue_final",
  "warnings.approve_standard",
  "warnings.approve_final",
  "warnings.approve_global",
  "warnings.record",
  "warnings.extend",
  "warnings.edit",

  // Appeals
  "appeals.submit",
  "appeals.view",
  "appeals.intake",
  "appeals.decide",

  // Improvement Plans & Suspensions
  "improvement_plans.view",
  "improvement_plans.manage",
  "improvement_plans.monitor",
  "suspensions.issue",
  "suspensions.monitor",

  // Escalations & Audit
  "cases.escalate",
  "cases.refer_removal",
  "audit.view",

  // Case-Scoped Committee Permissions
  "committee.form",
  "committee.view",
  "committee.vote",
  "committee.tie_break",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ─── Canonical Role Permissions Matrix ───────────────────────────────────────
export const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  Member: [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "VIEW_TASKS",
    "CREATE_TASK",
    "EDIT_TASK",
    "VIEW_MEMBERS",
    "VIEW_WARNINGS",
    "members.view",
    "warnings.view",
    "appeals.submit",
    "appeals.view",
    "improvement_plans.view",
  ],
  "Team Leader": [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "CREATE_PROJECT",
    "EDIT_PROJECT",
    "VIEW_TASKS",
    "CREATE_TASK",
    "EDIT_TASK",
    "DELETE_TASK",
    "VIEW_MEMBERS",
    "ADD_MEMBER",
    "EDIT_MEMBER",
    "VIEW_WARNINGS",
    "MANAGE_WARNINGS",
    "APPROVE_WARNINGS",
    "members.view",
    "warnings.view",
    "warnings.issue_standard",
    "warnings.issue_final",
    "warnings.approve_standard",
    "warnings.edit",
    "appeals.view",
    "improvement_plans.view",
    "improvement_plans.manage",
    "suspensions.issue",
    "cases.escalate",
    "cases.refer_removal",
  ],
  HR: [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "VIEW_TASKS",
    "VIEW_MEMBERS",
    "ADD_MEMBER",
    "EDIT_MEMBER",
    "MANAGE_MEMBER_STATUS",
    "members.view",
    "members.manage",
    "members.manage_status",
    "VIEW_WARNINGS",
    "warnings.view",
    "warnings.record",
    "appeals.view",
    "appeals.intake",
    "improvement_plans.view",
    "improvement_plans.monitor",
    "suspensions.monitor",
    "cases.escalate",
    "committee.view",
    "committee.vote",
  ],
  Committee: [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "VIEW_TASKS",
    "VIEW_MEMBERS",
    "VIEW_WARNINGS",
    "APPROVE_WARNINGS",
    "members.view",
    "warnings.view",
    "warnings.approve_standard",
    "warnings.approve_final",
    "warnings.approve_global",
    "warnings.extend",
    "warnings.edit",
    "appeals.view",
    "appeals.decide",
    "improvement_plans.view",
    "suspensions.issue",
    "cases.escalate",
    "committee.view",
    "committee.vote",
  ],
  Admin: [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "CREATE_PROJECT",
    "EDIT_PROJECT",
    "DELETE_PROJECT",
    "VIEW_TASKS",
    "CREATE_TASK",
    "EDIT_TASK",
    "DELETE_TASK",
    "VIEW_MEMBERS",
    "ADD_MEMBER",
    "EDIT_MEMBER",
    "MANAGE_MEMBER_STATUS",
    "members.view",
    "members.manage",
    "members.manage_status",
    "VIEW_WARNINGS",
    "MANAGE_WARNINGS",
    "APPROVE_WARNINGS",
    "warnings.view",
    "warnings.issue_standard",
    "warnings.issue_final",
    "warnings.approve_standard",
    "warnings.approve_final",
    "warnings.approve_global",
    "warnings.record",
    "warnings.extend",
    "warnings.edit",
    "appeals.view",
    "appeals.intake",
    "appeals.decide",
    "improvement_plans.view",
    "improvement_plans.manage",
    "improvement_plans.monitor",
    "suspensions.issue",
    "suspensions.monitor",
    "cases.escalate",
    "cases.refer_removal",
    "audit.view",
    "committee.view",
    "committee.vote",
  ],
  "Super Admin": [
    "VIEW_DASHBOARD",
    "VIEW_PROJECTS",
    "CREATE_PROJECT",
    "EDIT_PROJECT",
    "DELETE_PROJECT",
    "VIEW_TASKS",
    "CREATE_TASK",
    "EDIT_TASK",
    "DELETE_TASK",
    "VIEW_MEMBERS",
    "ADD_MEMBER",
    "EDIT_MEMBER",
    "MANAGE_MEMBER_STATUS",
    "members.view",
    "members.manage",
    "members.manage_status",
    "VIEW_WARNINGS",
    "MANAGE_WARNINGS",
    "APPROVE_WARNINGS",
    "warnings.view",
    "warnings.issue_standard",
    "warnings.issue_final",
    "warnings.approve_standard",
    "warnings.approve_final",
    "warnings.approve_global",
    "warnings.record",
    "warnings.extend",
    "warnings.edit",
    "appeals.submit",
    "appeals.view",
    "appeals.intake",
    "appeals.decide",
    "improvement_plans.view",
    "improvement_plans.manage",
    "improvement_plans.monitor",
    "suspensions.issue",
    "suspensions.monitor",
    "cases.escalate",
    "cases.refer_removal",
    "audit.view",
    "committee.form",
    "committee.view",
    "committee.vote",
    "committee.tie_break",
  ],
} as const;

// ─── Additional Committee Permission Inheritance ─────────────────────────────
export const COMMITTEE_PERMISSIONS: readonly Permission[] = [
  "warnings.approve_standard",
  "warnings.approve_final",
  "warnings.approve_global",
  "warnings.extend",
  "warnings.edit",
  "appeals.decide",
  "suspensions.issue",
  "cases.escalate",
] as const;

// ─── Permission Check ────────────────────────────────────────────────────────
export function hasPermission(
  role: MemberRole,
  permission: Permission,
  isCommitteeMember?: boolean,
): boolean {
  if (role === "Super Admin") return true;

  const allowed = ROLE_PERMISSIONS[role];
  if (allowed && allowed.includes(permission)) return true;

  // Flexible appointment: Team Leaders or Admins flagged as isCommitteeMember inherit committee powers
  if (isCommitteeMember && COMMITTEE_PERMISSIONS.includes(permission)) {
    return true;
  }

  return false;
}

// ─── Auth & Authorization Helpers ────────────────────────────────────────────
export async function requireAuth(): Promise<SafeMember | null> {
  return getCurrentMember();
}

export async function verifyPermission(permission: Permission): Promise<
  | { authorized: true; member: SafeMember }
  | { authorized: false; status: 401 | 403; message: string }
> {
  const member = await getCurrentMember();

  if (!member) {
    return {
      authorized: false,
      status: 401,
      message: "Authentication required. Please log in.",
    };
  }

  if (!hasPermission(member.role, permission)) {
    return {
      authorized: false,
      status: 403,
      message: `Forbidden: role '${member.role}' does not have '${permission}' permission`,
    };
  }

  return { authorized: true, member };
}
