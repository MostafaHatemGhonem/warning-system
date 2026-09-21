"use client";

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import {
  canApplySuspension,
  canApproveWarning,
  canDecideAppeal,
  canEvaluateImprovementPlan,
  canExtendWarning,
  canLiftSuspension,
  canManageImprovementPlan,
  canRequestAppeal,
  extractId,
  isIssuer,
  isSelfWarning,
  type CurrentUser,
  type WarningItem,
} from "@/lib/client-permissions";
import { CaseCommitteePanel } from "./case-committee-panel";
import { ProjectRemovalModal } from "./project-removal-modal";

type WarningDetailsModalProps = {
  isOpen: boolean;
  warning: WarningItem | null;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onRefresh: () => void;
  onOpenSuspension: (warning: WarningItem) => void;
  onOpenAppeal: (warning: WarningItem, remainingDays?: number) => void;
  onOpenAppealReview: (warning: WarningItem) => void;
  onOpenPlan: (warning: WarningItem) => void;
  onOpenPlanEval: (warning: WarningItem) => void;
};

export function WarningDetailsModal({
  isOpen,
  warning,
  currentUser,
  onClose,
  onRefresh,
  onOpenSuspension,
  onOpenAppeal,
  onOpenAppealReview,
  onOpenPlan,
  onOpenPlanEval,
}: WarningDetailsModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isLifting, setIsLifting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isRemovalModalOpen, setIsRemovalModalOpen] = useState(false);
  const [extensionDays, setExtensionDays] = useState(30);
  const [extensionReason, setExtensionReason] = useState("");
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const memberName =
    typeof warning.member === "object" && warning.member ? warning.member.name : "Member";
  const memberEmail =
    typeof warning.member === "object" && warning.member ? warning.member.email : "";
  const projectName =
    typeof warning.project === "object" && warning.project ? warning.project.name : null;
  const issuerName =
    typeof warning.issuedBy === "object" && warning.issuedBy ? warning.issuedBy.name : "System";

  // Permission evaluations
  const approvalCheck = canApproveWarning(warning, currentUser);
  const suspensionCheck = canApplySuspension(warning, currentUser);
  const liftSuspensionCheck = canLiftSuspension(warning, currentUser);
  const appealCheck = canRequestAppeal(warning, currentUser);
  const appealDecisionCheck = canDecideAppeal(warning, currentUser);
  const planCheck = canManageImprovementPlan(warning, currentUser);
  const planEvalCheck = canEvaluateImprovementPlan(warning, currentUser);
  const extendCheck = canExtendWarning(warning, currentUser);

  const isSubject = isSelfWarning(warning, currentUser);
  const canReferRemoval =
    !isSubject &&
    Boolean(
      currentUser &&
        ["Team Leader", "Admin", "Super Admin"].includes(currentUser.role) &&
        warning &&
        (warning.type === "Project" || Boolean(warning.project) || warning.level === "Final Warning" || (warning.severity ?? 0) >= 3),
    );
  const isRemovalAlreadyReferred =
    warning.review?.disciplinaryRecommendation === "Refer_To_Formal_Removal_Review";

  const handleApprove = async (action: "Approve" | "Reject") => {
    setActionError(null);
    setIsApproving(true);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process approval");
      }

      onRefresh();
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  const handleLiftSuspension = async () => {
    setActionError(null);
    setIsLifting(true);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/suspension`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to lift suspension");
      }

      onRefresh();
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLifting(false);
    }
  };

  const handleExtendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!extensionReason.trim()) {
      setActionError("Extension justification reason is required");
      return;
    }

    setIsExtending(true);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensionDays,
          reason: extensionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to extend warning");
      }

      setShowExtendForm(false);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsExtending(false);
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                  warning.level === "Final Warning"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    : warning.level === "Warning 2"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}
              >
                {warning.level}
              </span>

              <span className="rounded-xl bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {warning.type === "Global" ? "🌐 Global Warning" : `📁 Project: ${projectName ?? "Project"}`}
              </span>

              <span
                className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                  warning.status === "Active"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : warning.status === "Pending_Approval"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : warning.status === "Pending_Review"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : warning.status === "Resolved"
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                Status: {warning.status.replace("_", " ")}
              </span>
            </div>

            <h2 className="mt-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {memberName}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {memberEmail} • Issued by {issuerName} on {formatDate(warning.createdAt)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {actionError && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
            {actionError}
          </div>
        )}

        {/* ── Case-Scoped Governance Committee Panel ──────────────────────── */}
        <CaseCommitteePanel
          warning={warning}
          currentUser={currentUser}
          onCaseUpdated={onRefresh}
        />

        {/* ── Precautionary Suspension Banner ───────────────────────────────── */}
        {warning.suspension?.isSuspended && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <h4 className="font-bold">🛑 Member is Under Temporary Protective Suspension</h4>
                  <p className="mt-0.5 text-rose-700 dark:text-rose-300/90">
                    Precautionary hold during inquiries (≤ 48 hours). Reason: &quot;{warning.suspension.reason}&quot;
                  </p>
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    Suspended until: {formatDate(warning.suspension.suspendedUntil)}
                  </p>
                </div>
              </div>

              {liftSuspensionCheck.allowed && (
                <button
                  onClick={handleLiftSuspension}
                  disabled={isLifting}
                  className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  {isLifting ? "Lifting..." : "Lift Suspension"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Incident Details Card */}
        <div className="mt-5 space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Factual Incident Description
            </h4>
            <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">
              {warning.description}
            </p>
          </div>

          {warning.isDirectFinalWarning && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Direct Final Warning Rationale (Stage Bypass):</p>
              <p className="mt-0.5">{warning.directIssuanceReason}</p>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[11px] text-zinc-500">Severity</span>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Level {warning.severity}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[11px] text-zinc-500">Disciplinary Points</span>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {warning.points} Points
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[11px] text-zinc-500">Active From</span>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatDate(warning.activeFrom)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[11px] text-zinc-500">Active Until</span>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatDate(warning.activeUntil)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Governance Sections Grid ──────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Review / Appeal Section */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Review & Appeal (Clause 18)
                </h4>
              </div>
              <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {warning.review?.status ?? "None"}
              </span>
            </div>

            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              {warning.review?.status === "Requested" ? (
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Appeal Pending Neutral Decision
                  </p>
                  <p className="mt-1 italic">&quot;{warning.review.reason}&quot;</p>
                  {appealDecisionCheck.allowed && (
                    <button
                      onClick={() => onOpenAppealReview(warning)}
                      className="mt-3 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                    >
                      Adjudicate Appeal
                    </button>
                  )}
                </div>
              ) : warning.review?.status === "Decided" ? (
                <div>
                  <p className="font-semibold text-purple-600 dark:text-purple-400">
                    Decided: {warning.review.decision}
                  </p>
                  <p className="mt-0.5 text-[11px]">Decided on {formatDate(warning.review.decidedAt)}</p>
                </div>
              ) : (
                <div>
                  {appealCheck.allowed ? (
                    <div>
                      <p className="text-emerald-700 dark:text-emerald-400">
                        ⏳ {appealCheck.remainingDays} days remaining to request review.
                      </p>
                      <button
                        onClick={() => onOpenAppeal(warning, appealCheck.remainingDays)}
                        className="mt-2.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Submit Appeal Request
                      </button>
                    </div>
                  ) : (
                    <p className="text-zinc-400">{appealCheck.reason ?? "No appeal filed."}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Performance Improvement Plan Section */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Improvement Plan Track
                </h4>
              </div>
              <span
                className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                  warning.improvementPlan?.isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {warning.improvementPlan?.isActive ? "Active Plan" : "None"}
              </span>
            </div>

            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              {warning.improvementPlan?.isActive ? (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    Target Date: {formatDate(warning.improvementPlan.targetCompletionDate)}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    Supervisor: {warning.improvementPlan.supervisor}
                  </p>
                  <p className="mt-1 text-zinc-500 line-clamp-2">
                    Criteria: {warning.improvementPlan.measurableSuccessCriteria}
                  </p>
                  {planEvalCheck.allowed && (
                    <button
                      onClick={() => onOpenPlanEval(warning)}
                      className="mt-3 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Evaluate Plan Outcome
                    </button>
                  )}
                </div>
              ) : warning.improvementPlan?.finalDecision === "Rejected" ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-800 dark:text-rose-300">
                  <p className="font-bold">❌ Plan Rejected</p>
                  <p className="mt-0.5 text-[11px]">
                    Referred for formal Committee Disciplinary Review (No automatic removal).
                  </p>
                </div>
              ) : warning.improvementPlan?.finalDecision === "Accepted" ? (
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  ✅ Plan Successfully Completed
                </p>
              ) : (
                <div>
                  {planCheck.allowed ? (
                    <div>
                      <p className="text-zinc-500">
                        Launch structured 7 to 60-day development track.
                      </p>
                      <button
                        onClick={() => onOpenPlan(warning)}
                        className="mt-2.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                      >
                        Initiate Improvement Plan
                      </button>
                    </div>
                  ) : (
                    <p className="text-zinc-400">No active improvement plan.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Clause 14: Project Removal Governance ────────────────────────── */}
        {(warning.type === "Project" || Boolean(warning.project) || isRemovalAlreadyReferred || warning.level === "Final Warning") && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 dark:border-rose-500/20 dark:bg-rose-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Clause 14: Project Removal Governance (الإزالة من المشروع)
                    </h4>
                    {isRemovalAlreadyReferred && (
                      <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                        Referral Pending Committee
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {isRemovalAlreadyReferred
                      ? "A formal referral has been submitted to the Governance Committee under Clause 14. An impartial majority vote decides removal."
                      : "Project Leads cannot remove members unilaterally. Under Clause 14, removal must be referred to the Governance Committee with substantiated facts."}
                  </p>
                </div>
              </div>

              {!isRemovalAlreadyReferred && canReferRemoval && (
                <button
                  onClick={() => setIsRemovalModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-50 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-zinc-800"
                >
                  <UserX className="h-4 w-4" />
                  Refer for Project Removal
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Additional Action Controls (Suspension & Extension) ───────────── */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Apply Suspension Button */}
            {!warning.suspension?.isSuspended && suspensionCheck.allowed && (
              <button
                onClick={() => onOpenSuspension(warning)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                Apply Protective Hold (≤48h)
              </button>
            )}

            {/* Extend Warning (+30d) Button */}
            {extendCheck.allowed && !showExtendForm && (
              <button
                onClick={() => setShowExtendForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <Clock className="h-3.5 w-3.5" />
                Extend Period (+30d Max)
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Close
          </button>
        </div>

        {/* Extension Inline Sub-Form */}
        {showExtendForm && (
          <form
            onSubmit={handleExtendWarning}
            className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Extend Warning Duration (Once Only, Max 30 Days)
            </h4>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Extension Days (1 - 30)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  Justification Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Document specific reasons for extending this active warning..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExtendForm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExtending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  {isExtending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Extension
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Project Removal Referral Modal */}
        <ProjectRemovalModal
          isOpen={isRemovalModalOpen}
          warning={warning}
          onClose={() => setIsRemovalModalOpen(false)}
          onSuccess={() => {
            setIsRemovalModalOpen(false);
            onRefresh();
          }}
        />
      </div>
    </div>
  );
}
