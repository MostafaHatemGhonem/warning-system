"use client";

import { useState } from "react";
import { AlertOctagon, Info, Loader2, X } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

type SuspensionModalProps = {
  isOpen: boolean;
  warning: WarningItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function SuspensionModal({
  isOpen,
  warning,
  onClose,
  onSuccess,
}: SuspensionModalProps) {
  const [hours, setHours] = useState<number>(24);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !warning) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hours <= 0 || hours > 48) {
      setError("Suspension duration must be between 1 and 48 hours (Strict Policy Limit)");
      return;
    }

    if (!reason.trim()) {
      setError("A clear precautionary reason is required for protective suspension");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/warnings/${warning._id}/suspension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to apply protective suspension");
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
            <div className="rounded-xl bg-rose-500/10 p-2 dark:bg-rose-500/20">
              <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Apply Temporary Protective Suspension
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Clause 12: Precautionary measure (Strict Maximum 48 Hours)
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

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <p>
            This hold is strictly a protective action to safeguard project assets during inquiry, <strong>not an assumption of guilt or a disciplinary sanction</strong>. The warning status remains unchanged.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Suspension Duration (Hours) <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              {[12, 24, 48].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHours(preset)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                    hours === preset
                      ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {preset} Hours {preset === 48 && "(Max)"}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={1}
              max={48}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-2.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-rose-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Precautionary Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="State the inquiry or risk mitigation rationale..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-rose-500"
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
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Suspension
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
