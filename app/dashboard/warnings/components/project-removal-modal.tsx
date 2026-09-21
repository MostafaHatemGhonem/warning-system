"use client";

import { useState } from "react";
import { AlertOctagon, FileText, Loader2, ShieldAlert, X } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

interface ProjectRemovalModalProps {
  isOpen: boolean;
  warning: WarningItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectRemovalModal({
  isOpen,
  warning,
  onClose,
  onSuccess,
}: ProjectRemovalModalProps) {
  const [reason, setReason] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const memberName =
    typeof warning.member === "object" && warning.member
      ? warning.member.name
      : "Member";

  const projectName =
    typeof warning.project === "object" && warning.project
      ? warning.project.name
      : "Assigned Project";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError("Please provide a detailed rationale of at least 10 characters.");
      return;
    }
    if (!acknowledged) {
      setError("You must acknowledge that only the Governance Committee has authority to enact removals.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/refer-removal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          evidenceNotes: evidenceNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit project removal referral");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Clause 14: Refer for Project Removal
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Formal Committee Referral for Disciplinary Removal from Project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Regulatory Banner */}
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-900 dark:text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-bold">البند 14: لا يستطيع قائد المشروع إزالة عضو بمفرده</p>
              <p className="mt-0.5 text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
                Project Leads and Team Leaders cannot unilaterally remove a member from a project.
                This form submits the facts, evidence, and removal recommendation to an impartial Governance Committee to deliberate and vote by majority.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Subject Summary */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Subject Member:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{memberName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-zinc-500">Project:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{projectName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-zinc-500">Current Disciplinary Level:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{warning.level}</span>
            </div>
          </div>

          {/* Justification Rationale */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Substantiated Rationale for Removal <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-zinc-400">
              Explain why continued presence on the project jeopardizes delivery, team safety, or integrity.
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed facts and failure of prior improvements (min 10 chars)..."
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              required
            />
          </div>

          {/* Evidence Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Corroborating Evidence / Documentation (Optional)
            </label>
            <textarea
              rows={2}
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Links to PRs, commit logs, communication screenshots, or prior warnings..."
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Policy Compliance Checkbox */}
          <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="leading-relaxed">
              I acknowledge that this action only initiates a <strong>Committee Referral</strong>. Under Clause 14, removal is not automatic and can only be enacted following an impartial panel vote.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !acknowledged || reason.length < 10}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit Project Removal Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
