"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

interface AddTieBreakerModalProps {
  isOpen: boolean;
  committeeId: string;
  warning: WarningItem;
  existingMemberIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface MemberOption {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
}

export function AddTieBreakerModal({
  isOpen,
  committeeId,
  warning,
  existingMemberIds,
  onClose,
  onSuccess,
}: AddTieBreakerModalProps) {
  const [candidateMembers, setCandidateMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issuerId =
    typeof warning.issuedBy === "object" && warning.issuedBy
      ? warning.issuedBy._id
      : (warning.issuedBy as string);

  const subjectId =
    typeof warning.member === "object" && warning.member
      ? warning.member._id
      : (warning.member as string);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchAvailableMembers() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/members");
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          const allowedRoles = ["Super Admin", "HR", "Admin", "Team Leader"];
          // Filter to active, eligible roles who are NOT already on this committee
          const filtered = data.data.filter(
            (m: MemberOption) =>
              m.isActive &&
              allowedRoles.includes(m.role) &&
              !existingMemberIds.includes(String(m._id)),
          );
          setCandidateMembers(filtered);
        } else {
          setError("Failed to load candidate members.");
        }
      } catch {
        setError("Network error fetching members.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailableMembers();
    setSelectedMemberId(null);
    setReason("Adding an impartial tie-breaking member to resolve committee deadlock and achieve majority.");
  }, [isOpen, committeeId, existingMemberIds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError("Please select a candidate member to add.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for adding this member.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/committees/${committeeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add member to committee");
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
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Resolve Deadlock: Add Tie-Breaking Member
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Expand the committee with an odd quorum member to cast the deciding vote.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Deadlock Explanation */}
          <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
            <h4 className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Deadlock Reached (Tied Vote)
            </h4>
            <p className="mt-1 text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              The existing committee votes are evenly split with no majority. According to governance policy, adding an additional eligible member expands the panel and reopens voting so a definitive majority (&gt; 50%) can be achieved.
            </p>
          </div>

          {/* Candidate Selection */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Select Candidate Member
            </label>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : candidateMembers.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
                No eligible candidate members available outside the current committee.
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {candidateMembers.map((m) => {
                  const isIssuerCoi = String(m._id) === String(issuerId);
                  const isSubjectCoi = String(m._id) === String(subjectId);
                  const isConflicted = isIssuerCoi || isSubjectCoi;
                  const isSelected = selectedMemberId === m._id;

                  return (
                    <div
                      key={m._id}
                      onClick={() => !isConflicted && setSelectedMemberId(m._id)}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        isConflicted
                          ? "cursor-not-allowed border-zinc-200/60 bg-zinc-100/50 opacity-60 dark:border-zinc-800/60 dark:bg-zinc-900/30"
                          : isSelected
                            ? "cursor-pointer border-amber-500/50 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/15"
                            : "cursor-pointer border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-200 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {m.name}
                            </span>
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              {m.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500">{m.email}</span>
                        </div>
                      </div>

                      <div>
                        {isConflicted ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <Lock className="h-3 w-3" />
                            COI Blocked
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Selected
                          </span>
                        ) : (
                          <span className="rounded-lg border border-zinc-300 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason input */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Expansion Rationale
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for selecting this member to resolve the tie..."
              className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedMemberId}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Member & Reopen Voting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
