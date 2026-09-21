import mongoose from "mongoose";
import type { SafeMember } from "@/lib/auth";
import type { MemberRole } from "@/models/member";
import type { IWarning } from "@/models/warning";
import { hasPermission, Permission } from "@/lib/permissions";
import type { AuthorizationResult } from "@/models/audit-log";

export interface CanResult {
  allowed: boolean;
  status: 200 | 400 | 401 | 403;
  reason?: string;
  authorizationResult?: AuthorizationResult;
  isOverride?: boolean;
}

export interface CanOptions {
  overrideReason?: string | null;
  committee?: any;
}

/**
 * Normalizes an ObjectId or object with _id into a string for comparison.
 */
function toIdString(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && "_id" in (val as Record<string, unknown>)) {
    return ((val as Record<string, unknown>)._id as string | mongoose.Types.ObjectId).toString();
  }
  return val.toString();
}

interface StandardEvalResult {
  pass: boolean;
  status: 200 | 400 | 403;
  reason?: string;
  isAbsoluteProhibition?: boolean;
}

/**
 * Evaluates standard role-based access, state machine, and Conflict-of-Interest (COI) rules.
 */
function evaluateStandardRules(
  user: SafeMember,
  action: Permission | "committee.grant" | "committee.revoke",
  resource?: unknown,
  options?: CanOptions,
): StandardEvalResult {
  const isCommittee = Boolean(
    user.isCommitteeMember || user.role === "Committee" || user.role === "Admin" || user.role === "Super Admin",
  );

  // 1. Privileged Committee Management Actions (Strictly Super Admin Only)
  if (action === "committee.grant" || action === "committee.revoke" || action === "committee.form" || action === "committee.tie_break") {
    if (user.role !== "Super Admin") {
      return {
        pass: false,
        status: 403,
        reason: `Forbidden: Only Super Admins are authorized to perform '${action}'.`,
      };
    }
    return { pass: true, status: 200 };
  }

  // 1b. Case-Scoped Committee Vote Action
  if (action === "committee.vote") {
    const committee = options?.committee || (resource && typeof resource === "object" && "members" in resource ? resource : null);
    if (!committee) {
      return {
        pass: false,
        status: 400,
        reason: "Committee context is required to evaluate voting authorization.",
      };
    }
    if (committee.status !== "ACTIVE") {
      return {
        pass: false,
        status: 400,
        reason: `Voting is closed. Committee status is '${committee.status}'.`,
      };
    }
    const userIdStr = user._id.toString();
    const isMember = Array.isArray(committee.members) && committee.members.some((m: any) => toIdString(m.memberId || m) === userIdStr);
    if (!isMember) {
      return {
        pass: false,
        status: 403,
        reason: "Forbidden: You are not a seated member of this case's committee.",
      };
    }
    const alreadyVoted = Array.isArray(committee.votes) && committee.votes.some((v: any) => toIdString(v.memberId) === userIdStr);
    if (alreadyVoted) {
      return {
        pass: false,
        status: 400,
        reason: "You have already cast your vote on this committee case.",
      };
    }
    return { pass: true, status: 200 };
  }

  // 2. Base Permission Matrix Check
  const hasBasePerm = hasPermission(
    user.role as MemberRole,
    action as Permission,
    Boolean(user.isCommitteeMember),
  );

    if (!hasBasePerm) {
      if (user.role === "HR") {
        return {
          pass: false,
          status: 403,
          reason:
            "Forbidden: HR role is restricted to governance, record keeping, and SLA monitoring. Final approval or adjudication requires Committee authority.",
        };
      }
      return {
        pass: false,
        status: 403,
        reason: `Forbidden: role '${user.role}' does not possess '${action}' permission.`,
      };
    }

  // 3. Resource-specific contextual rules
  if (resource && typeof resource === "object") {
    const warning = resource as Partial<IWarning>;

    // ─── Warning Approval Actions ──────────────────────────────────────────────
    if (
      action === "warnings.approve_standard" ||
      action === "warnings.approve_final" ||
      action === "warnings.approve_global" ||
      action === "APPROVE_WARNINGS"
    ) {
      // State Machine Check
      if (warning.status && warning.status !== "Pending_Approval") {
        return {
          pass: false,
          status: 400,
          reason: `Cannot approve warning: Current status is '${warning.status}'. Only warnings in 'Pending_Approval' can be approved.`,
        };
      }

      const approverId = user._id.toString();
      const subjectId = toIdString(warning.member);
      const issuerId = toIdString(warning.issuedBy);

      // COI Rule 1: Subject cannot approve warning against self
      if (subjectId && subjectId === approverId) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of interest: Cannot approve a warning issued against yourself.",
        };
      }

      // COI Rule 2: Issuer cannot approve own warning (Neutral Committee Principle)
      if (issuerId && issuerId === approverId) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of interest: The issuer of a warning cannot approve it. A neutral authority is required.",
        };
      }

      // Authority Level: Final Warning & Global Warning strictly require Committee authority
      const isSensitive = warning.level === "Final Warning" || warning.type === "Global";
      if (isSensitive && !isCommittee) {
        return {
          pass: false,
          status: 403,
          reason: "Global Warnings and Final Warnings strictly require Committee / Admin approval.",
        };
      }
    }

    // ─── Warning Extension Actions ─────────────────────────────────────────────
    if (action === "warnings.extend") {
      if (warning.status && warning.status !== "Active") {
        return {
          pass: false,
          status: 400,
          reason: `Cannot extend warning: Only Active warnings can be extended. Current status is '${warning.status}'.`,
        };
      }
      if (warning.extension?.isExtended) {
        return {
          pass: false,
          status: 400,
          reason: "Cannot extend warning: This warning has already been extended once (maximum 1 extension).",
        };
      }
    }

    // ─── Appeal Adjudication Actions ───────────────────────────────────────────
    if (action === "appeals.decide") {
      if (warning.status && warning.status !== "Under_Review") {
        return {
          pass: false,
          status: 400,
          reason: `Cannot adjudicate appeal: Warning is not currently 'Under_Review' (status is '${warning.status}').`,
        };
      }

      const deciderId = user._id.toString();
      const subjectId = toIdString(warning.member);
      const issuerId = toIdString(warning.issuedBy);
      const approverId = toIdString(warning.approvedBy);

      // COI Rule 1: Appellant / Subject cannot decide own appeal
      if (subjectId && subjectId === deciderId) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of interest: Subject member cannot adjudicate their own appeal.",
        };
      }

      // COI Rule 2: Original issuer cannot sit on appeal panel against own warning
      if (issuerId && issuerId === deciderId) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of interest: Warning issuer cannot adjudicate the appeal against their own decision.",
        };
      }

      // COI Rule 3: Original approver cannot decide appeal against their own approved warning
      if (approverId && approverId === deciderId) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of interest: The original warning approver cannot adjudicate the appeal against their approved decision.",
        };
      }

      // Must have Committee authority
      if (!isCommittee) {
        return {
          pass: false,
          status: 403,
          reason: "Adjudicating appeals strictly requires Neutral Committee / Admin authority.",
        };
      }
    }

    // ─── Appeal Submission Actions ─────────────────────────────────────────────
    if (action === "appeals.submit") {
      const subjectId = toIdString(warning.member);
      if (subjectId && subjectId !== user._id.toString()) {
        return {
          pass: false,
          status: 403,
          reason: "Forbidden: You may only submit an appeal for warnings issued to yourself.",
        };
      }
    }

    // ─── Case Referral Actions (Clause 14: Project Removal) ────────────────────
    if (action === "cases.refer_removal") {
      if (warning && toIdString(warning.member) === toIdString(user._id)) {
        return {
          pass: false,
          status: 403,
          reason: "Conflict of Interest: A member cannot refer themselves for project removal.",
          isAbsoluteProhibition: true,
        };
      }
    }

    // ─── Member Status Management Actions ──────────────────────────────────────
    if (action === "members.manage_status" || action === "MANAGE_MEMBER_STATUS") {
      const targetMember = resource as { role?: string; _id?: unknown };
      if (targetMember && targetMember.role) {
        // Absolute prohibition: Super Admin accounts can NEVER be deactivated
        if (targetMember.role === "Super Admin") {
          return {
            pass: false,
            status: 403,
            reason: "Forbidden: Super Admin accounts are protected and cannot be deactivated under any circumstances.",
            isAbsoluteProhibition: true,
          };
        }
        if (targetMember.role === "Admin" && user.role !== "Super Admin") {
          return {
            pass: false,
            status: 403,
            reason: "Forbidden: Only Super Admin can modify Admin account status.",
          };
        }
      }
      if (targetMember && targetMember._id && targetMember._id.toString() === user._id.toString()) {
        return {
          pass: false,
          status: 400,
          reason: "Cannot deactivate your own currently logged-in account.",
          isAbsoluteProhibition: true,
        };
      }
    }
  }

  return { pass: true, status: 200 };
}

/**
 * Evaluates contextual permissions, state machine policies, and
 * Conflict-of-Interest (COI) rules according to Infinity Explorers Policy.
 *
 * Super Admin Accountability:
 * - Evaluates standard rules first.
 * - If standard rules pass: returns STANDARD_GRANT.
 * - If a standard rule fails:
 *   - Non-Super Admin: rejected immediately (403/400).
 *   - Super Admin: requires explicit `overrideReason` (>= 10 chars).
 *     - If provided: returns SUPER_ADMIN_OVERRIDE with audit justification.
 *     - If missing: rejected with 400 Bad Request.
 */
export function can(
  user: SafeMember | null | undefined,
  action: Permission | "committee.grant" | "committee.revoke",
  resource?: unknown,
  options: CanOptions = {},
): CanResult {
  // 1. Authentication Check
  if (!user || !user._id) {
    return {
      allowed: false,
      status: 401,
      reason: "Authentication required. Please log in to perform this action.",
    };
  }

  // 2. Evaluate Standard Rules
  const standard = evaluateStandardRules(user, action, resource, options);

  if (standard.pass) {
    return {
      allowed: true,
      status: 200,
      authorizationResult: "STANDARD_GRANT",
      isOverride: false,
    };
  }

  // 3. Absolute Prohibitions (cannot be bypassed even by Super Admin)
  if (standard.isAbsoluteProhibition) {
    return {
      allowed: false,
      status: standard.status,
      reason: standard.reason,
    };
  }

  // 4. Non-Super Admin: strict rejection
  if (user.role !== "Super Admin") {
    return {
      allowed: false,
      status: standard.status,
      reason: standard.reason,
    };
  }

  // 5. Super Admin Override Accountability:
  // Requires an explicit overrideReason with at least 10 characters.
  const overrideReason = options.overrideReason ? options.overrideReason.trim() : "";
  if (!overrideReason || overrideReason.length < 10) {
    return {
      allowed: false,
      status: 400,
      reason: `Super Admin override requires an explicit overrideReason (minimum 10 characters). Violation: ${standard.reason}`,
    };
  }

  return {
    allowed: true,
    status: 200,
    authorizationResult: "SUPER_ADMIN_OVERRIDE",
    isOverride: true,
    reason: `Super Admin Override granted: ${overrideReason}`,
  };
}
