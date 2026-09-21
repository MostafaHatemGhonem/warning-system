"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  PlusCircle,
  Vote,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { WarningItem, CurrentUser } from "@/lib/client-permissions";
import { FormCommitteeModal } from "./form-committee-modal";
import { AddTieBreakerModal } from "./add-tie-breaker-modal";

interface CaseCommitteePanelProps {
  warning: WarningItem;
  currentUser: CurrentUser | null;
  onCaseUpdated: () => void;
}

interface CommitteeData {
  _id: string;
  caseNumber: string;
  resourceType: string;
  resourceId: string;
  members: Array<{
    memberId: {
      _id: string;
      name: string;
      email: string;
      role: string;
      avatar?: string;
    };
    roleAtFormation: string;
    joinedAt: string;
  }>;
  votes: Array<{
    memberId: {
      _id: string;
      name: string;
      email: string;
      role: string;
    };
    role: string;
    vote: "Approve" | "Reject";
    reason: string;
    votedAt: string;
  }>;
  status: "ACTIVE" | "TIED" | "DECIDED" | "DISBANDED";
  decisionOutcome?: "APPROVED" | "REJECTED" | "NO_DECISION" | null;
  decisionSummary?: string;
  decidedAt?: string | null;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function CaseCommitteePanel({
  warning,
  currentUser,
  onCaseUpdated,
}: CaseCommitteePanelProps) {
  const [committee, setCommittee] = useState<CommitteeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTieBreakerModalOpen, setIsTieBreakerModalOpen] = useState(false);

  // Voting state
  const [voteChoice, setVoteChoice] = useState<"Approve" | "Reject">("Approve");
  const [voteReason, setVoteReason] = useState("");
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const fetchCommittee = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/committees?resourceId=${warning._id}&resourceType=Warning`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
        setCommittee(data.data[0]);
      } else {
        setCommittee(null);
      }
    } catch {
      setError("Failed to fetch committee data.");
    } finally {
      setIsLoading(false);
    }
  }, [warning._id]);

  useEffect(() => {
    fetchCommittee();
  }, [fetchCommittee]);

  // Determine if current user is an enrolled voter who hasn't voted yet
  const currentUserId = currentUser?._id;
  const isEnrolledMember =
    committee &&
    committee.members.some(
      (m) => String(m.memberId?._id || m.memberId) === String(currentUserId),
    );

  const hasAlreadyVoted =
    committee &&
    committee.votes.some(
      (v) => String(v.memberId?._id || v.memberId) === String(currentUserId),
    );

  const canVoteNow =
    committee?.status === "ACTIVE" && isEnrolledMember && !hasAlreadyVoted;

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committee) return;
    if (!voteReason.trim() || voteReason.trim().length < 5) {
      setVoteError("A documented rationale of at least 5 characters is required.");
      return;
    }

    setIsSubmittingVote(true);
    setVoteError(null);

    try {
      const res = await fetch(`/api/committees/${committee._id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vote: voteChoice,
          reason: voteReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to record vote.");
      }

      setVoteReason("");
      await fetchCommittee();
      onCaseUpdated();
    } catch (err: unknown) {
      setVoteError(err instanceof Error ? err.message : "Vote submission failed");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex h-32 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Case 1: No Committee Formed
  if (!committee) {
    const isRemovalCase =
      warning.review?.disciplinaryRecommendation === "Refer_To_Formal_Removal_Review";

    return (
      <>
        <div
          className={`mt-4 rounded-2xl border p-4 text-xs ${
            isRemovalCase
              ? "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:border-rose-500/20 dark:text-rose-200"
              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  isRemovalCase ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
                }`}
              />
              <div>
                <h4 className="font-bold">
                  {isRemovalCase
                    ? "🚨 Project Removal Committee Required (البند 14)"
                    : "Governance Committee Required"}
                </h4>
                <p
                  className={`mt-0.5 leading-relaxed ${
                    isRemovalCase
                      ? "text-rose-800/90 dark:text-rose-300/90"
                      : "text-indigo-800/90 dark:text-indigo-300/90"
                  }`}
                >
                  {isRemovalCase
                    ? "Under Clause 14, Project Leads cannot remove members unilaterally. This case has been formally referred to the Governance Committee to deliberate and decide by majority."
                    : "Direct approval is blocked. This case strictly requires an impartial panel of 3+ members (Super Admin, HR, Admin, Team Leader) to review and vote by majority."}
                </p>
                {currentUser?.role !== "Super Admin" && (
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    ⏳ Awaiting Super Admin to establish the case committee.
                  </p>
                )}
              </div>
            </div>

            {currentUser?.role === "Super Admin" && (
              <button
                onClick={() => setIsFormModalOpen(true)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-md ${
                  isRemovalCase
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                {isRemovalCase ? "Form Removal Committee" : "Form Committee"}
              </button>
            )}
          </div>
        </div>

        {/* Modal */}
        <FormCommitteeModal
          isOpen={isFormModalOpen}
          warning={warning}
          currentUser={currentUser}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={() => {
            fetchCommittee();
            onCaseUpdated();
          }}
        />
      </>
    );
  }

  // Case 2: Committee Exists (ACTIVE, TIED, DECIDED)
  const totalMembers = committee.members.length;
  const majorityThreshold = Math.floor(totalMembers / 2) + 1;
  const approveCount = committee.votes.filter((v) => v.vote === "Approve").length;
  const rejectCount = committee.votes.filter((v) => v.vote === "Reject").length;
  const votesCast = committee.votes.length;

  return (
    <>
      <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {committee.caseNumber}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Panel of {totalMembers} Members
                </span>
                {committee.resourceType === "Removal" && (
                  <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    🚨 Project Removal Case (البند 14)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Convened by {committee.createdBy?.name} • Majority threshold: {majorityThreshold} votes
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {committee.status === "ACTIVE" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400" />
                Voting Active ({votesCast}/{totalMembers})
              </span>
            )}
            {committee.status === "TIED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Votes Tied (Deadlock)
              </span>
            )}
            {committee.status === "DECIDED" && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  committee.decisionOutcome === "APPROVED"
                    ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                }`}
              >
                {committee.decisionOutcome === "APPROVED" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                )}
                Decision: {committee.decisionOutcome}
              </span>
            )}
          </div>
        </div>

        {/* Voting Progress / Tally Bar */}
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <ThumbsUp className="h-3.5 w-3.5" />
              Approve: {approveCount}
            </span>
            <span className="text-zinc-500">
              Quorum: {totalMembers} members ({majorityThreshold} needed for majority)
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <ThumbsDown className="h-3.5 w-3.5" />
              Reject: {rejectCount}
            </span>
          </div>

          <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(approveCount / totalMembers) * 100}%` }}
            />
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{ width: `${(rejectCount / totalMembers) * 100}%` }}
            />
          </div>
        </div>

        {/* Seated Members Grid */}
        <div className="mt-4">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Seated Committee Members & Voting Log
          </h5>

          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {committee.members.map((m, idx) => {
              const memberObj = m.memberId;
              const voteRecord = committee.votes.find(
                (v) => String(v.memberId?._id || v.memberId) === String(memberObj?._id),
              );

              return (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-2xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {memberObj?.name?.charAt(0).toUpperCase() || "M"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {memberObj?.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">{m.roleAtFormation}</p>
                    </div>
                  </div>

                  <div>
                    {voteRecord ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          voteRecord.vote === "Approve"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        }`}
                        title={voteRecord.reason}
                      >
                        {voteRecord.vote === "Approve" ? (
                          <ThumbsUp className="h-3 w-3" />
                        ) : (
                          <ThumbsDown className="h-3 w-3" />
                        )}
                        {voteRecord.vote}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Voting Form for Enrolled Member ──────────────────────────── */}
        {canVoteNow && (
          <form
            onSubmit={handleVoteSubmit}
            className="mt-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4.5 dark:border-indigo-500/20 dark:bg-indigo-500/10"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <Vote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cast Your Official Committee Vote</span>
            </div>

            {voteError && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{voteError}</p>
            )}

            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setVoteChoice("Approve")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  voteChoice === "Approve"
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                {committee.resourceType === "Removal" ? "Approve Project Removal" : "Approve Warning"}
              </button>
              <button
                type="button"
                onClick={() => setVoteChoice("Reject")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  voteChoice === "Reject"
                    ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                {committee.resourceType === "Removal" ? "Reject Removal (Retain Member)" : "Reject Warning"}
              </button>
            </div>

            <div className="mt-3">
              <textarea
                rows={2}
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                placeholder="Document your official decision rationale (minimum 5 characters)..."
                className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingVote || !voteReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmittingVote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Vote on Case
              </button>
            </div>
          </form>
        )}

        {/* ── Deadlock (TIED) Alert & Action ──────────────────────────────────── */}
        {committee.status === "TIED" && (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h5 className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Voting Deadlock Reached ({approveCount} Approve vs {rejectCount} Reject)
                </h5>
                <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
                  No majority reached. As per governance rules, no action is taken until Super Admin expands the committee with an additional member to break the tie.
                </p>
              </div>

              {currentUser?.role === "Super Admin" && (
                <button
                  onClick={() => setIsTieBreakerModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Member to Break Tie
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Finalized Decision Summary ──────────────────────────────────────── */}
        {committee.status === "DECIDED" && (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Official Decision Finalized</span>
            </div>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {committee.decisionSummary}
            </p>
            {committee.decidedAt && (
              <p className="mt-1 text-[11px] text-zinc-400">
                Formally recorded on {new Date(committee.decidedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tie Breaker Modal */}
      {isTieBreakerModalOpen && (
        <AddTieBreakerModal
          isOpen={isTieBreakerModalOpen}
          committeeId={committee._id}
          warning={warning}
          existingMemberIds={committee.members.map((m) =>
            String(m.memberId?._id || m.memberId),
          )}
          onClose={() => setIsTieBreakerModalOpen(false)}
          onSuccess={() => {
            fetchCommittee();
            onCaseUpdated();
          }}
        />
      )}
    </>
  );
}
