import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * ============================================================================
 * INFINITY EXPLORERS — WARNING SYSTEM GOVERNANCE & POLICY RULES
 * ============================================================================
 *
 * 1. DURATION & VALIDITY:
 *    - Warning 1 & Warning 2: Remain active for 30 days.
 *    - Final Warning: Remains active for 60 days.
 *    - Warnings do NOT automatically expire or resolve simply by passing activeUntil;
 *      they require an administrative / committee status review.
 *    - Expired warnings remain preserved in history for audit, but are not counted
 *      as active warnings for natural escalation.
 *
 * 2. EXTENSION POLICY:
 *    - A warning may be extended ONCE by up to 30 days under clear conditions
 *      and justified reasoning.
 *
 * 3. PROJECT VS GLOBAL WARNING SEPARATION:
 *    - Project Warnings are tied to a specific project.
 *    - Global Warnings are organization-wide (project is strictly null).
 *    - Project warnings are NOT aggregated into a single global counter automatically.
 *    - Escalation to a Global Warning requires an explicit committee decision.
 *
 * 4. FINAL WARNING & REMOVAL GOVERNANCE:
 *    - Reaching a Final Warning opens a formal committee review.
 *    - Warnings NEVER convert to Removal automatically.
 *    - Direct Final Warning can be issued immediately only for severe incidents (Severity 3).
 *
 * 5. REVIEW & APPEAL PROCESS:
 *    - Member may submit a review/appeal within 7 calendar days of notification.
 *    - One review allowed per decision, unless substantial new evidence is produced.
 *    - Review decisions: Confirm, Reduce, Cancel, Improvement Plan, Reinvestigate.
 *
 * 6. TEMPORARY SUSPENSION:
 *    - An interim protective measure capped at 48 hours.
 *    - Not an assumption of guilt or a warning level itself.
 *    - Case must be formally reviewed within 48 hours.
 * ============================================================================
 */

// ─── Business Constants ───────────────────────────────────────────────────────
export const DURATION_WARNING_DAYS = 30;
export const DURATION_FINAL_WARNING_DAYS = 60;
export const MAX_EXTENSION_DAYS = 30;
export const APPEAL_WINDOW_DAYS = 7;
export const MAX_SUSPENSION_HOURS = 48;

// ─── Enums & Types ────────────────────────────────────────────────────────────
export const WARNING_TYPES = ["Project", "Global"] as const;
export type WarningType = (typeof WARNING_TYPES)[number];

export const WARNING_LEVELS = ["Warning 1", "Warning 2", "Final Warning"] as const;
export type WarningLevel = (typeof WARNING_LEVELS)[number];

export const WARNING_SEVERITIES = [1, 2, 3] as const;
export type WarningSeverity = (typeof WARNING_SEVERITIES)[number];

export const WARNING_STATUSES = [
  "Draft",            // Created, pending formal submission
  "Pending_Approval", // Awaiting team leader or committee approval
  "Active",           // Approved and currently active within validity period
  "Extended",         // Extended once by up to 30 days with justification
  "Under_Review",     // Currently under committee review or member appeal
  "Pending_Review",   // Validity period reached; awaiting status review (does not auto-expire)
  "Resolved",         // Closed after successful improvement or conditions met
  "Expired",          // Closed after validity review without escalation; archived in history
  "Cancelled",        // Withdrawn or revoked following review/appeal
] as const;
export type WarningStatus = (typeof WARNING_STATUSES)[number];

export const REVIEW_STATUSES = [
  "None",
  "Requested",
  "In_Progress",
  "Completed",
  "Rejected",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_DECISIONS = [
  "Confirm",          // Affirm original warning
  "Reduce",           // Downgrade to lower warning level or formal feedback
  "Cancel",           // Revoke and strike warning from active record
  "Improvement_Plan", // Place member on a structured improvement plan
  "Reinvestigate",    // Reopen investigation for further evidence gathering
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DISCIPLINARY_RECOMMENDATIONS = [
  "None",
  "Refer_To_Improvement_Plan",
  "Refer_To_Formal_Removal_Review", // Committee recommendation only; not automatic removal
] as const;
export type DisciplinaryRecommendation = (typeof DISCIPLINARY_RECOMMENDATIONS)[number];

// ─── Sub-document Interfaces ──────────────────────────────────────────────────
export interface IMemberResponse {
  text: string;
  submittedAt?: Date | null;
}

export interface IWarningExtension {
  isExtended: boolean;
  extendedAt?: Date | null;
  extendedUntil?: Date | null;
  extendedBy?: mongoose.Types.ObjectId | null;
  reason?: string;
}

export interface IWarningReview {
  status: ReviewStatus;
  requestedAt?: Date | null;
  reason?: string;
  appealDeadline?: Date | null; // 7 days from member notification
  decision?: ReviewDecision | null;
  decisionNotes?: string;
  decidedAt?: Date | null;
  decidedBy?: mongoose.Types.ObjectId[];
  disciplinaryRecommendation?: DisciplinaryRecommendation;
}

export interface ITemporarySuspension {
  isSuspended: boolean;
  suspendedAt?: Date | null;
  suspendedUntil?: Date | null; // Strictly capped at 48 hours
  reason?: string;
  reviewedWithin48h: boolean;
}

export interface IImprovementPlan {
  isActive: boolean;
  problemSummary?: string;
  desiredBehavior?: string;
  actionSteps: string[];
  durationDays?: number;
  startDate?: Date | null;
  targetCompletionDate?: Date | null;
  measurableSuccessCriteria?: string;
  supervisor?: mongoose.Types.ObjectId | null;
  finalDecision?: "Pending" | "Accepted" | "Extended" | "Rejected";
  finalNotes?: string;
  decidedAt?: Date | null;
}

// ─── Main Warning Document Interface ──────────────────────────────────────────
export interface IWarning extends Document {
  member: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId | null;
  type: WarningType;
  level: WarningLevel;
  severity: WarningSeverity;
  points: number;
  isDirectFinalWarning: boolean;
  directIssuanceReason?: string;
  incidentDate: Date;
  description: string;
  evidence: string[];
  memberResponse: IMemberResponse;
  status: WarningStatus;
  issuedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId | null;
  approvedAt?: Date | null;
  notifiedAt?: Date | null;
  activeFrom?: Date | null;
  activeUntil?: Date | null;
  extension: IWarningExtension;
  review: IWarningReview;
  suspension: ITemporarySuspension;
  improvementPlan?: IImprovementPlan;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────
export function calculateDefaultActiveUntil(level: WarningLevel, startDate: Date = new Date()): Date {
  const days = level === "Final Warning" ? DURATION_FINAL_WARNING_DAYS : DURATION_WARNING_DAYS;
  const result = new Date(startDate);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateAppealDeadline(notifiedAt: Date = new Date()): Date {
  const deadline = new Date(notifiedAt);
  deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
  return deadline;
}

export function calculateMaxSuspensionUntil(suspendedAt: Date = new Date()): Date {
  const until = new Date(suspendedAt);
  until.setHours(until.getHours() + MAX_SUSPENSION_HOURS);
  return until;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const memberResponseSchema = new Schema<IMemberResponse>(
  {
    text: { type: String, trim: true, default: "" },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const warningExtensionSchema = new Schema<IWarningExtension>(
  {
    isExtended: { type: Boolean, default: false },
    extendedAt: { type: Date, default: null },
    extendedUntil: { type: Date, default: null },
    extendedBy: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    reason: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const warningReviewSchema = new Schema<IWarningReview>(
  {
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "None",
    },
    requestedAt: { type: Date, default: null },
    reason: { type: String, trim: true, default: "" },
    appealDeadline: { type: Date, default: null },
    decision: {
      type: String,
      enum: REVIEW_DECISIONS,
      default: null,
    },
    decisionNotes: { type: String, trim: true, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: [{ type: Schema.Types.ObjectId, ref: "Member" }],
    disciplinaryRecommendation: {
      type: String,
      enum: DISCIPLINARY_RECOMMENDATIONS,
      default: "None",
    },
  },
  { _id: false },
);

const temporarySuspensionSchema = new Schema<ITemporarySuspension>(
  {
    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date, default: null },
    suspendedUntil: { type: Date, default: null },
    reason: { type: String, trim: true, default: "" },
    reviewedWithin48h: { type: Boolean, default: false },
  },
  { _id: false },
);

const improvementPlanSchema = new Schema<IImprovementPlan>(
  {
    isActive: { type: Boolean, default: false },
    problemSummary: { type: String, trim: true, default: "" },
    desiredBehavior: { type: String, trim: true, default: "" },
    actionSteps: { type: [String], default: [] },
    durationDays: { type: Number, default: 30 },
    startDate: { type: Date, default: null },
    targetCompletionDate: { type: Date, default: null },
    measurableSuccessCriteria: { type: String, trim: true, default: "" },
    supervisor: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    finalDecision: {
      type: String,
      enum: ["Pending", "Accepted", "Extended", "Rejected"],
      default: "Pending",
    },
    finalNotes: { type: String, trim: true, default: "" },
    decidedAt: { type: Date, default: null },
  },
  { _id: false },
);

// ─── Main Warning Schema ──────────────────────────────────────────────────────
const warningSchema = new Schema<IWarning>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required for a warning"],
      index: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: WARNING_TYPES,
      required: true,
      default: "Project",
      index: true,
    },

    level: {
      type: String,
      enum: WARNING_LEVELS,
      required: true,
      index: true,
    },

    severity: {
      type: Number,
      enum: WARNING_SEVERITIES,
      required: true,
      default: 1,
    },

    points: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },

    isDirectFinalWarning: {
      type: Boolean,
      default: false,
    },

    directIssuanceReason: {
      type: String,
      trim: true,
      default: "",
    },

    incidentDate: {
      type: Date,
      required: [true, "Incident date is required"],
    },

    description: {
      type: String,
      required: [true, "Factual incident description is required"],
      trim: true,
    },

    evidence: {
      type: [String],
      default: [],
    },

    memberResponse: {
      type: memberResponseSchema,
      default: () => ({ text: "", submittedAt: null }),
    },

    status: {
      type: String,
      enum: WARNING_STATUSES,
      required: true,
      default: "Pending_Approval",
      index: true,
    },

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Issuer member ID is required"],
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    notifiedAt: {
      type: Date,
      default: null,
    },

    activeFrom: {
      type: Date,
      default: null,
    },

    activeUntil: {
      type: Date,
      default: null,
      index: true,
    },

    extension: {
      type: warningExtensionSchema,
      default: () => ({
        isExtended: false,
        extendedAt: null,
        extendedUntil: null,
        extendedBy: null,
        reason: "",
      }),
    },

    review: {
      type: warningReviewSchema,
      default: () => ({
        status: "None",
        requestedAt: null,
        reason: "",
        appealDeadline: null,
        decision: null,
        decisionNotes: "",
        decidedAt: null,
        decidedBy: [],
        disciplinaryRecommendation: "None",
      }),
    },

    suspension: {
      type: temporarySuspensionSchema,
      default: () => ({
        isSuspended: false,
        suspendedAt: null,
        suspendedUntil: null,
        reason: "",
        reviewedWithin48h: false,
      }),
    },

    improvementPlan: {
      type: improvementPlanSchema,
      default: () => ({
        isActive: false,
        problemSummary: "",
        desiredBehavior: "",
        actionSteps: [],
        durationDays: 30,
        startDate: null,
        targetCompletionDate: null,
        measurableSuccessCriteria: "",
        supervisor: null,
        finalDecision: "Pending",
        finalNotes: "",
        decidedAt: null,
      }),
    },
  },
  {
    timestamps: true,
  },
);

// ─── Document Lifecycle Validations ──────────────────────────────────────────
warningSchema.pre("validate", function (this: IWarning) {
  // Rule: Project warning MUST specify a project
  if (this.type === "Project" && !this.project) {
    this.invalidate("project", "Project is required for Project Warnings");
  }

  // Rule: Global warning CANNOT be linked to a project
  if (this.type === "Global" && this.project) {
    this.invalidate("project", "Global Warnings cannot be tied to a specific project");
  }

  // Rule: Direct Final Warning requirements
  if (this.isDirectFinalWarning) {
    if (this.level !== "Final Warning") {
      this.invalidate("level", "Direct Final Warning must be of level 'Final Warning'");
    }
    if (this.severity !== 3) {
      this.invalidate("severity", "Direct Final Warning requires severe violation (Severity 3)");
    }
    if (!this.directIssuanceReason || !this.directIssuanceReason.trim()) {
      this.invalidate("directIssuanceReason", "A justification reason is required when issuing a direct Final Warning");
    }
  }
});

// Compound indexes for high-frequency queries
warningSchema.index({ member: 1, status: 1 });
warningSchema.index({ project: 1, status: 1 });
warningSchema.index({ type: 1, status: 1 });
warningSchema.index({ activeUntil: 1, status: 1 });

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).Warning;
}

const Warning: Model<IWarning> =
  mongoose.models.Warning || mongoose.model<IWarning>("Warning", warningSchema);

export default Warning;
