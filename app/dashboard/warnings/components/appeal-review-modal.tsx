"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2, ShieldCheck, X } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";
import type { WarningLevel } from "@/models/warning";

type AppealReviewModalProps = {
  isOpen: boolean;
  warning: WarningItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function AppealReviewModal({
  isOpen,
  warning,
  onClose,
  onSuccess,
}: AppealReviewModalProps) {
  const [decision, setDecision] = useState<
    "Confirm" | "Reduce" | "Cancel" | "Improvement_Plan" | "Reinvestigate"
  >("Confirm");
  const [reducedLevel, setReducedLevel] = useState<WarningLevel>("Warning 1");
  const [rationale, setRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rationale.trim()) {
      setError("A written justification rationale is required for the appeal decision");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        decision,
        rationale: rationale.trim(),
      };

      if (decision === "Reduce") {
        payload.reducedLevel = reducedLevel;
      }

      const res = await fetch(`/api/warnings/${warning._id}/review/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to record appeal decision");
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
            <div className="rounded-xl bg-purple-500/10 p-2 dark:bg-purple-500/20">
              <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Adjudicate Member Appeal
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Neutral review authority examination
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

        {/* Appeal grounds summary */}
        {warning.review?.reason && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">
              Member&apos;s Stated Grounds:
            </p>
            <p className="mt-1 italic text-zinc-600 dark:text-zinc-400">
              &quot;{warning.review.reason}&quot;
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Review Decision <span className="text-rose-500">*</span>
            </label>
            <select
              value={decision}
              onChange={(e) =>
                setDecision(
                  e.target.value as "Confirm" | "Reduce" | "Cancel" | "Improvement_Plan" | "Reinvestigate"
                )
              }
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-purple-500"
            >
              <option value="Confirm">Confirm Decision (Upheld)</option>
              <option value="Reduce">Reduce Warning Level</option>
              <option value="Cancel">Cancel Warning (Rescinded)</option>
              <option value="Improvement_Plan">Substitute with Improvement Plan</option>
              <option value="Reinvestigate">Order Re-investigation</option>
            </select>
          </div>

          {decision === "Reduce" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Target Reduced Level
              </label>
              <select
                value={reducedLevel}
                onChange={(e) => setReducedLevel(e.target.value as WarningLevel)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-purple-500"
              >
                <option value="Warning 1">Warning 1</option>
                <option value="Warning 2">Warning 2</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Decision Rationale & Neutral Finding <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="State the findings, evidence considered, and reasoning behind the decision..."
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-purple-500"
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
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalize Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
