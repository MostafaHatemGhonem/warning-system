"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, UserPlus, X } from "lucide-react";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
};

type TiedCommittee = {
  _id: string;
  caseNumber: string;
  resourceType: string;
  status: string;
  members: Array<{
    memberId: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    roleAtFormation: string;
  }>;
};

type TieBreakModalProps = {
  committee: TiedCommittee;
  eligibleMembers: Member[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function TieBreakModal({
  committee,
  eligibleMembers,
  onClose,
  onSuccess,
}: TieBreakModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out members who are already on this committee
  const existingMemberIds = new Set(
    committee.members.map((m) => m.memberId?._id?.toString() || "")
  );
  const candidates = eligibleMembers.filter(
    (m) => m.isActive && !existingMemberIds.has(m._id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) {
      setError("Please select a candidate member to add to the committee.");
      return;
    }
    if (!reason || reason.trim().length < 5) {
      setError("Please provide a substantiated justification (at least 5 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/committees/${committee._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add member to committee.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Resolve Committee Deadlock
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Case: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{committee.caseNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs text-amber-900 dark:text-amber-300">
                <p className="font-semibold">Super Admin Executive Authority</p>
                <p className="mt-0.5 opacity-90">
                  Adding an additional qualified member achieves an odd quorum and will reopen voting on this tied case. This action will be permanently recorded in the immutable audit trail.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Member Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Select Candidate Member (Tie-Breaker)
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
            >
              <option value="">-- Choose an eligible member --</option>
              {candidates.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.role}) - {m.email}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Reason / Executive Justification (Audit Log)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide the rationale for expanding the committee and selecting this member..."
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Appoint & Reopen Voting
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
