"use client";

import { useState } from "react";
import { CheckCircle, Clock, Info, Loader2, ShieldAlert, X } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

type EvaluatePlanModalProps = {
  isOpen: boolean;
  warning: WarningItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function EvaluatePlanModal({
  isOpen,
  warning,
  onClose,
  onSuccess,
}: EvaluatePlanModalProps) {
  const [decision, setDecision] = useState<"Accepted" | "Extended" | "Rejected">(
    "Accepted"
  );
  const [extensionDays, setExtensionDays] = useState<number>(14);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision === "Extended") {
      if (extensionDays <= 0 || extensionDays > 30) {
        setError("Extension duration must be between 1 and 30 days");
        return;
      }
    }

    if (!notes.trim()) {
      setError("Evaluation notes and observations are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        decision,
        notes: notes.trim(),
      };

      if (decision === "Extended") {
        payload.extensionDays = extensionDays;
      }

      const res = await fetch(
        `/api/warnings/${warning._id}/improvement-plan/evaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to evaluate improvement plan");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/10 p-2 dark:bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Evaluate Improvement Plan
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Formal review of observable milestones and member development
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Informational Guidance based on selected decision */}
        <div className="mt-4">
          {decision === "Accepted" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>
                <strong>Plan Successfully Completed:</strong> The warning status will transition directly to <strong>Resolved</strong>, concluding the matter.
              </p>
            </div>
          )}

          {decision === "Extended" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p>
                <strong>Plan Extended:</strong> Extends the completion target date by up to 30 days. The plan and warning remain active.
              </p>
            </div>
          )}

          {decision === "Rejected" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold">Formal Referral Only (No Automatic Removal)</p>
                <p className="mt-0.5">
                  The plan will be concluded as Rejected, and the case will be <strong>referred to the neutral Committee for formal disciplinary review</strong>. The member is <strong>NOT</strong> automatically removed from the team.
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Evaluation Outcome <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision("Accepted")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  decision === "Accepted"
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                ✅ Accepted
              </button>
              <button
                type="button"
                onClick={() => setDecision("Extended")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  decision === "Extended"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                ⏳ Extended
              </button>
              <button
                type="button"
                onClick={() => setDecision("Rejected")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  decision === "Rejected"
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                ❌ Rejected
              </button>
            </div>
          </div>

          {decision === "Extended" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Extension Days (1 - 30 Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={extensionDays}
                onChange={(e) => setExtensionDays(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Evaluation Notes & Observable Findings <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detail the metrics achieved, areas of growth, or gaps requiring formal committee review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 ${
                decision === "Accepted"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : decision === "Extended"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Evaluation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
