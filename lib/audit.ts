import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AuditLog, {
  AuditAction,
  AuthorizationResult,
  IAuditActor,
  IAuditResource,
} from "@/models/audit-log";
import type { SafeMember } from "@/lib/auth";

export interface RecordAuditParams {
  requestId?: string;
  actor: SafeMember | IAuditActor;
  action: AuditAction;
  resource: IAuditResource;
  previousState?: any;
  newState?: any;
  decisionReason: string;
  authorizationResult?: AuthorizationResult;
  overrideReason?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * List of sensitive governance actions where decisionReason is strictly mandatory
 */
const SENSITIVE_ACTIONS_REQUIRING_REASON: AuditAction[] = [
  "warnings.issue",
  "warnings.approve",
  "warnings.suspend",
  "appeals.decide",
  "members.status_change",
  "committee.grant",
  "committee.revoke",
  "committee.form",
  "committee.vote",
  "committee.tie",
  "committee.add_member",
  "committee.decide",
  "committee.disband",
];

/**
 * Records an immutable audit log entry into the database.
 */
export async function recordAuditLog(params: RecordAuditParams) {
  try {
    await connectToDatabase();

    const requestId = params.requestId || crypto.randomUUID();
    const authorizationResult = params.authorizationResult || "STANDARD_GRANT";
    const decisionReason = (params.decisionReason || "").trim();

    // Sensitive actions enforcement
    if (SENSITIVE_ACTIONS_REQUIRING_REASON.includes(params.action)) {
      if (!decisionReason) {
        throw new Error(
          `Decision reason is strictly mandatory for governance action '${params.action}'.`,
        );
      }
    }

    // Super Admin override enforcement
    if (authorizationResult === "SUPER_ADMIN_OVERRIDE") {
      const overrideReason = (params.overrideReason || "").trim();
      if (!overrideReason || overrideReason.length < 10) {
        throw new Error(
          "Super Admin override requires an explicit overrideReason with at least 10 characters.",
        );
      }
    }

    const actorId =
      params.actor._id instanceof mongoose.Types.ObjectId
        ? params.actor._id
        : new mongoose.Types.ObjectId(String(params.actor._id));

    const resourceId =
      params.resource.id instanceof mongoose.Types.ObjectId
        ? params.resource.id
        : new mongoose.Types.ObjectId(String(params.resource.id));

    const logEntry = await AuditLog.create({
      requestId,
      actor: {
        _id: actorId,
        name: params.actor.name,
        email: params.actor.email,
        role: params.actor.role,
        isCommitteeMember: Boolean(params.actor.isCommitteeMember),
      },
      action: params.action,
      resource: {
        type: params.resource.type,
        id: resourceId,
        identifier: params.resource.identifier,
      },
      previousState: sanitizeAuditState(params.previousState),
      newState: sanitizeAuditState(params.newState),
      decisionReason: decisionReason || "System recorded action",
      authorizationResult,
      overrideReason: params.overrideReason ? params.overrideReason.trim() : null,
      metadata: params.metadata || {},
    });

    return logEntry;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Re-throw so callers are aware if critical audit recording fails
    throw error;
  }
}

/**
 * Helper to generate or extract a requestId from an incoming request header.
 */
export function getOrCreateRequestId(req?: Request): string {
  if (req) {
    const headerId = req.headers.get("x-request-id");
    if (headerId && headerId.trim()) return headerId.trim();
  }
  return crypto.randomUUID();
}

/**
 * Strips sensitive secrets (e.g. webhooks, passwords) from state before saving to AuditLog.
 */
function sanitizeAuditState(state: any): any {
  if (!state || typeof state !== "object") return state || null;
  if (Array.isArray(state)) return state.map(sanitizeAuditState);

  const clone: Record<string, any> = { ...state };
  delete clone.discordWebhookUrl;
  delete clone.password;
  delete clone.passwordHash;
  delete clone.tokenHash;

  return clone;
}
