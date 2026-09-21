"use client";

import { useState } from "react";
import { CheckCircle2, ListPlus, Loader2, ShieldAlert, Trash2, X } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

type ImprovementPlanModalProps = {
  isOpen: boolean;
  warning: WarningItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function ImprovementPlanModal({
  isOpen,
  warning,
  onClose,
  onSuccess,
}: ImprovementPlanModalProps) {
  const [durationDays, setDurationDays] = useState<number>(30);
  const [problemSummary, setProblemSummary] = useState("");
  const [desiredBehavior, setDesiredBehavior] = useState("");
  const [actionSteps, setActionSteps] = useState<string[]>([""]);
  const [measurableSuccessCriteria, setMeasurableSuccessCriteria] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const handleAddStep = () => {
    setActionSteps([...actionSteps, ""]);
  };

  const handleStepChange = (index: number, val: string) => {
    const updated = [...actionSteps];
    updated[index] = val;
    setActionSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    if (actionSteps.length === 1) {
      setActionSteps([""]);
      return;
    }
    setActionSteps(actionSteps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (durationDays < 7 || durationDays > 60) {
      setError("Duration must be between 7 and 60 days (Policy Requirement)");
      return;
    }

    if (!problemSummary.trim() || !desiredBehavior.trim()) {
      setError("Problem summary and desired behavior are required");
      return;
    }

    const validSteps = actionSteps.map((s) => s.trim()).filter(Boolean);
    if (validSteps.length === 0) {
      setError("At least one concrete action step is required");
      return;
    }

    if (!measurableSuccessCriteria.trim()) {
      setError("Measurable, observable success criteria are required");
      return;
    }

    if (!supervisor.trim()) {
      setError("A designated supervisor is required for the improvement plan");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/improvement-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationDays,
          problemSummary: problemSummary.trim(),
          desiredBehavior: desiredBehavior.trim(),
          actionSteps: validSteps,
          measurableSuccessCriteria: measurableSuccessCriteria.trim(),
          supervisor: supervisor.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to initiate improvement plan");
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
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-500/10 p-2 dark:bg-indigo-500/20">
              <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Initiate Performance Improvement Plan
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Structured developmental track with observable milestones
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Plan Duration (7 - 60 Days) <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              {[14, 30, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationDays(preset)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                    durationDays === preset
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {preset} Days {preset === 30 && "(Default)"}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={7}
              max={60}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Problem Summary */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Identified Issue / Performance Gap <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Concise summary of the challenge or behavior to be addressed..."
              value={problemSummary}
              onChange={(e) => setProblemSummary(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Desired Behavior */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Expected Conduct / Target Standard <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="What success and alignment look like in daily practice..."
              value={desiredBehavior}
              onChange={(e) => setDesiredBehavior(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Action Steps */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Action Steps & Commitments <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Add Step
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {actionSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder="Specific actionable deliverable or commitment..."
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 text-zinc-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Measurable Success Criteria */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Measurable & Observable Success Criteria <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Concrete indicators: e.g. 100% on-time PR submissions, attendance at all standups..."
              value={measurableSuccessCriteria}
              onChange={(e) => setMeasurableSuccessCriteria(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Supervisor */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Assigned Supervisor / Follow-up Lead <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lead Developer / Team Lead"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Launch Improvement Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
