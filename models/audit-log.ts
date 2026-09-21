import mongoose, { Schema, Document, Model } from "mongoose";

export const AUDIT_ACTIONS = [
  "warnings.issue",
  "warnings.edit",
  "warnings.approve",
  "warnings.extend",
  "warnings.suspend",
  "appeals.submit",
  "appeals.decide",
  "improvement_plans.initiate",
  "improvement_plans.evaluate",
  "cases.refer_removal",
  "members.create",
  "members.update",
  "members.status_change",
  "members.login",
  "members.logout",
  "projects.create",
  "projects.update",
  "projects.delete",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
  "committee.grant",
  "committee.revoke",
  "committee.form",
  "committee.vote",
  "committee.tie",
  "committee.add_member",
  "committee.decide",
  "committee.disband",
  "meetings.create",
  "meetings.update",
  "meetings.delete",
  "blockers.create",
  "blockers.update",
  "blockers.delete",
  "delay_reports.create",
  "delay_reports.update",
  "delay_reports.delete",
  "settings.update",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUTHORIZATION_RESULTS = [
  "STANDARD_GRANT",
  "SUPER_ADMIN_OVERRIDE",
] as const;
export type AuthorizationResult = (typeof AUTHORIZATION_RESULTS)[number];

export interface IAuditActor {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email: string;
  role: string;
  isCommitteeMember?: boolean;
}

export interface IAuditResource {
  type:
    | "Warning"
    | "Member"
    | "Project"
    | "Task"
    | "Committee"
    | "Meeting"
    | "Blocker"
    | "DelayReport"
    | "SystemSetting";
  id: mongoose.Types.ObjectId | string;
  identifier?: string;
}

export interface IAuditLog extends Document {
  requestId: string;
  actor: IAuditActor;
  action: AuditAction;
  resource: IAuditResource;
  previousState?: any;
  newState?: any;
  decisionReason: string;
  authorizationResult: AuthorizationResult;
  overrideReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      _id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
      isCommitteeMember: { type: Boolean, default: false },
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    resource: {
      type: {
        type: String,
        enum: [
          "Warning",
          "Member",
          "Project",
          "Task",
          "Committee",
          "Meeting",
          "Blocker",
          "DelayReport",
          "SystemSetting",
        ],
        required: true,
      },
      id: { type: Schema.Types.Mixed, required: true },
      identifier: { type: String },
    },
    previousState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    decisionReason: {
      type: String,
      required: true,
    },
    authorizationResult: {
      type: String,
      enum: AUTHORIZATION_RESULTS,
      required: true,
      default: "STANDARD_GRANT",
    },
    overrideReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only log: no updatedAt
  },
);

AuditLogSchema.index({ "actor._id": 1, createdAt: -1 });
AuditLogSchema.index({ "resource.id": 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.AuditLog) {
  delete (mongoose.models as Record<string, any>).AuditLog;
}

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
