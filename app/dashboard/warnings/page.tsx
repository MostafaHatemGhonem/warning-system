"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, ShieldAlert, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  canIssueWarning,
  type CurrentUser,
  type WarningItem,
} from "@/lib/client-permissions";
import { WarningsHeader } from "./components/warnings-header";
import { WarningsFilter } from "./components/warnings-filter";
import { WarningsTable } from "./components/warnings-table";
import { IssueWarningModal } from "./components/issue-warning-modal";
import { WarningDetailsModal } from "./components/warning-details-modal";
import { SuspensionModal } from "./components/suspension-modal";
import { AppealModal } from "./components/appeal-modal";
import { AppealReviewModal } from "./components/appeal-review-modal";
import { ImprovementPlanModal } from "./components/improvement-plan-modal";
import { EvaluatePlanModal } from "./components/evaluate-plan-modal";

export default function WarningsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    scope: "all",
    level: "all",
    status: "all",
    onlySuspended: false,
    onlyPlan: false,
    onlyCommittee: false,
    onlyRemoval: false,
  });

  // Modal states
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<WarningItem | null>(null);
  const [suspensionWarning, setSuspensionWarning] = useState<WarningItem | null>(null);
  const [appealWarning, setAppealWarning] = useState<WarningItem | null>(null);
  const [appealRemainingDays, setAppealRemainingDays] = useState<number | undefined>(undefined);
  const [appealReviewWarning, setAppealReviewWarning] = useState<WarningItem | null>(null);
  const [planWarning, setPlanWarning] = useState<WarningItem | null>(null);
  const [planEvalWarning, setPlanEvalWarning] = useState<WarningItem | null>(null);

  const fetchWarnings = async () => {
    try {
      setError(null);
      const res = await fetch("/api/warnings");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setWarnings(data.data);

        // Check if a specific warning was requested via URL query params
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const targetId = params.get("selected") || params.get("warningId") || params.get("id");
          if (targetId) {
            const found = data.data.find(
              (w: WarningItem) => String(w._id) === targetId,
            );
            if (found) {
              setSelectedWarning(found);
            }
          }
        }
      } else {
        throw new Error(data.message || "Failed to load warnings");
      }
    } catch (err: unknown) {
      console.error("fetchWarnings error:", err);
      setError(err instanceof Error ? err.message : "Failed to load warnings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Fetch authenticated user
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.data) {
          setCurrentUser(d.data);
        }
      })
      .catch((err) => console.error("Error fetching current user:", err));

    // 2. Fetch warnings
    fetchWarnings();
  }, []);

  // Filtered warnings
  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      // Search filter (member name, email, description, project name)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const memberName =
          typeof w.member === "object" && w.member ? w.member.name.toLowerCase() : "";
        const memberEmail =
          typeof w.member === "object" && w.member ? w.member.email.toLowerCase() : "";
        const desc = (w.description || "").toLowerCase();
        const projName =
          typeof w.project === "object" && w.project ? w.project.name.toLowerCase() : "";

        if (
          !memberName.includes(q) &&
          !memberEmail.includes(q) &&
          !desc.includes(q) &&
          !projName.includes(q)
        ) {
          return false;
        }
      }

      // Scope filter
      if (filters.scope !== "all" && w.type !== filters.scope) {
        return false;
      }

      // Level filter
      if (filters.level !== "all" && w.level !== filters.level) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && w.status !== filters.status) {
        return false;
      }

      // Quick toggle: Only Suspended
      if (filters.onlySuspended && !w.suspension?.isSuspended) {
        return false;
      }

      // Quick toggle: Only Active Improvement Plan
      if (filters.onlyPlan && !w.improvementPlan?.isActive) {
        return false;
      }

      // Quick toggle: Only Governance Committee Cases
      if (
        filters.onlyCommittee &&
        w.status !== "Pending_Approval" &&
        w.level !== "Final Warning" &&
        (w.severity ?? 0) < 3 &&
        w.review?.status !== "Requested" &&
        w.review?.status !== "Under_Review" &&
        w.review?.disciplinaryRecommendation !== "Refer_To_Formal_Removal_Review"
      ) {
        return false;
      }

      // Quick toggle: Only Project Removal Referrals
      if (
        filters.onlyRemoval &&
        w.review?.disciplinaryRecommendation !== "Refer_To_Formal_Removal_Review"
      ) {
        return false;
      }

      return true;
    });
  }, [warnings, filters]);

  const canCreate = canIssueWarning(currentUser);

  return (
    <DashboardShell userRole={currentUser?.role}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Warning System & Governance
              </h1>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                Disciplinary Hub
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Regulatory compliance, neutral reviews, protective holds, and structured improvement plans
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsIssueOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-amber-600/20 transition-all hover:bg-amber-700 hover:shadow-md hover:shadow-amber-600/30"
            >
              <Plus className="h-4 w-4" />
              Issue Warning
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* KPI Metrics */}
        <WarningsHeader warnings={warnings} />

        {/* Filter controls */}
        <WarningsFilter filters={filters} onFilterChange={setFilters} />

        {/* Main Warnings Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
              <p className="text-xs font-semibold text-zinc-500">Loading warnings and governance records...</p>
            </div>
          </div>
        ) : (
          <WarningsTable
            warnings={filteredWarnings}
            currentUser={currentUser}
            onSelectWarning={(w) => setSelectedWarning(w)}
          />
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {/* 1. Issue Warning Modal */}
      <IssueWarningModal
        isOpen={isIssueOpen}
        currentUser={currentUser}
        onClose={() => setIsIssueOpen(false)}
        onSuccess={fetchWarnings}
      />

      {/* 2. Warning Details Action Center */}
      <WarningDetailsModal
        isOpen={Boolean(selectedWarning)}
        warning={selectedWarning}
        currentUser={currentUser}
        onClose={() => setSelectedWarning(null)}
        onRefresh={fetchWarnings}
        onOpenSuspension={(w) => {
          setSelectedWarning(null);
          setSuspensionWarning(w);
        }}
        onOpenAppeal={(w, days) => {
          setSelectedWarning(null);
          setAppealRemainingDays(days);
          setAppealWarning(w);
        }}
        onOpenAppealReview={(w) => {
          setSelectedWarning(null);
          setAppealReviewWarning(w);
        }}
        onOpenPlan={(w) => {
          setSelectedWarning(null);
          setPlanWarning(w);
        }}
        onOpenPlanEval={(w) => {
          setSelectedWarning(null);
          setPlanEvalWarning(w);
        }}
      />

      {/* 3. Suspension Modal */}
      <SuspensionModal
        isOpen={Boolean(suspensionWarning)}
        warning={suspensionWarning}
        onClose={() => setSuspensionWarning(null)}
        onSuccess={fetchWarnings}
      />

      {/* 4. Member Appeal Request Modal */}
      <AppealModal
        isOpen={Boolean(appealWarning)}
        warning={appealWarning}
        remainingDays={appealRemainingDays}
        onClose={() => {
          setAppealWarning(null);
          setAppealRemainingDays(undefined);
        }}
        onSuccess={fetchWarnings}
      />

      {/* 5. Neutral Committee Appeal Adjudication Modal */}
      <AppealReviewModal
        isOpen={Boolean(appealReviewWarning)}
        warning={appealReviewWarning}
        onClose={() => setAppealReviewWarning(null)}
        onSuccess={fetchWarnings}
      />

      {/* 6. Improvement Plan Launch Modal */}
      <ImprovementPlanModal
        isOpen={Boolean(planWarning)}
        warning={planWarning}
        onClose={() => setPlanWarning(null)}
        onSuccess={fetchWarnings}
      />

      {/* 7. Evaluate Improvement Plan Modal */}
      <EvaluatePlanModal
        isOpen={Boolean(planEvalWarning)}
        warning={planEvalWarning}
        onClose={() => setPlanEvalWarning(null)}
        onSuccess={fetchWarnings}
      />
    </DashboardShell>
  );
}
