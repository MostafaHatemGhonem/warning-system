"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import type { WarningItem, CurrentUser } from "@/lib/client-permissions";

interface FormCommitteeModalProps {
  isOpen: boolean;
  warning: WarningItem;
  currentUser: CurrentUser | null;
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

export function FormCommitteeModal({
  isOpen,
  warning,
  currentUser,
  onClose,
  onSuccess,
}: FormCommitteeModalProps) {
  const [eligibleMembers, setEligibleMembers] = useState<MemberOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
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

  const isRemovalRecommended =
    warning.review?.disciplinaryRecommendation === "Refer_To_Formal_Removal_Review";

  const [caseType, setCaseType] = useState<"Warning" | "Removal" | "Appeal">(
    isRemovalRecommended ? "Removal" : "Warning",
  );

  useEffect(() => {
    if (!isOpen) return;

    async function fetchEligibleMembers() {
      setIsLoadingMembers(true);
      setError(null);
      try {
        const res = await fetch("/api/members");
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          // Filter to eligible roles (Super Admin, HR, Admin, Team Leader) and active members
          const allowedRoles = ["Super Admin", "HR", "Admin", "Team Leader"];
          const filtered = data.data.filter(
            (m: MemberOption) => m.isActive && allowedRoles.includes(m.role),
          );
          setEligibleMembers(filtered);
        } else {
          setError("Failed to load candidate members.");
        }
      } catch {
        setError("Network error fetching members.");
      } finally {
        setIsLoadingMembers(false);
      }
    }

    fetchEligibleMembers();
    setSelectedIds([]);
    setCaseType(isRemovalRecommended ? "Removal" : "Warning");
    setReason(
      isRemovalRecommended
        ? "Clause 14: Impartial Committee convened to deliberate on Project Removal referral."
        : "Formal establishment of governance committee to adjudicate warning case.",
    );
  }, [isOpen, isRemovalRecommended]);

  if (!isOpen) return null;

  const toggleSelectMember = (id: string, isConflicted: boolean) => {
    if (isConflicted) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length < 3) {
      setError("At least 3 eligible members are required to form a committee.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for establishing the committee.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/committees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: caseType,
          resourceId: warning._id,
          memberIds: selectedIds,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to form committee");
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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Form Governance Committee
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Seat an impartial panel of 3+ eligible members to adjudicate this case.
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

          {/* Committee Case Objective */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Committee Objective / اختصاص اللجنة
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setCaseType("Warning");
                  setReason("Formal establishment of governance committee to adjudicate warning case.");
                }}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  caseType === "Warning"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
                }`}
              >
                <p className="text-xs font-bold">Warning Approval</p>
                <p className="mt-0.5 text-[10px] opacity-80">اعتماد تحذير رسمي</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaseType("Removal");
                  setReason("Clause 14: Impartial Committee convened to deliberate on Project Removal referral.");
                }}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  caseType === "Removal"
                    ? "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold">Project Removal</p>
                  {isRemovalRecommended && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <p className="mt-0.5 text-[10px] opacity-80">البند 14: إزالة من المشروع</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaseType("Appeal");
                  setReason("Clause 18: Impartial Committee convened to review member appeal.");
                }}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  caseType === "Appeal"
                    ? "border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
                }`}
              >
                <p className="text-xs font-bold">Appeal Review</p>
                <p className="mt-0.5 text-[10px] opacity-80">البند 18: نظر الاستئناف</p>
              </button>
            </div>
          </div>

          {/* Quorum Progress Indicator */}
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Selected Committee Members:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  selectedIds.length >= 3
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {selectedIds.length} / 3 minimum
              </span>
            </div>
          </div>

          {/* Candidate Members List */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Eligible Candidates (Super Admin, HR, Admin, Team Leader)
            </label>

            {isLoadingMembers ? (
              <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : eligibleMembers.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
                No eligible candidate members found.
              </div>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {eligibleMembers.map((m) => {
                  const isIssuerCoi = String(m._id) === String(issuerId);
                  const isSubjectCoi = String(m._id) === String(subjectId);
                  const isConflicted = isIssuerCoi || isSubjectCoi;
                  const isSelected = selectedIds.includes(m._id);

                  return (
                    <div
                      key={m._id}
                      onClick={() => toggleSelectMember(m._id, isConflicted)}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        isConflicted
                          ? "cursor-not-allowed border-zinc-200/60 bg-zinc-100/50 opacity-60 dark:border-zinc-800/60 dark:bg-zinc-900/30"
                          : isSelected
                            ? "cursor-pointer border-indigo-500/50 bg-indigo-500/10 dark:border-indigo-500/40 dark:bg-indigo-500/15"
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
                            {isIssuerCoi ? "Issuer (COI)" : "Subject Member (COI)"}
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Seated
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

          {/* Formation Reason */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Establishment Rationale & Scope
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for convening this governance committee..."
              className="w-full rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
              disabled={isSubmitting || selectedIds.length < 3}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Establish Committee ({selectedIds.length} Seated)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
