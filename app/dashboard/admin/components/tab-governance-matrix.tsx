"use client";

import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Gavel,
  Lock,
  Scale,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";

export default function TabGovernanceMatrix() {
  return (
    <div className="space-y-8">
      
      {/* ── SECTION 1: Warning Points & Escalation Matrix ────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Warning Points & Sanction Thresholds
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cumulative disciplinary scale governing team accountability and sanctions.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Warning 1</span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                1 - 3 Pts
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Initial notice. Project lead informal guidance, root cause analysis, and internal corrective feedback.
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800 dark:text-orange-300">Warning 2</span>
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900 dark:bg-orange-900 dark:text-orange-200">
                4 - 6 Pts
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Formal reprimand. Automatic trigger for a structured 14-30 day Improvement Plan (PIP) monitored by HR.
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Final Warning</span>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                7 - 9 Pts
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Severe infraction. Automatic referral for Governance Committee review with potential 48h emergency suspension.
            </p>
          </div>

          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 dark:text-red-300">Expulsion Trigger</span>
              <span className="rounded-md bg-red-200 px-2 py-0.5 text-[11px] font-black text-red-950 dark:bg-red-900 dark:text-red-100">
                10+ Pts
              </span>
            </div>
            <p className="mt-2 text-xs text-red-950 dark:text-red-300">
              Clause 14 referral for permanent team exclusion. Mandatory committee investigation & Super Admin ratification.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: SLA & Deadlines Matrix ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* SLA Windows */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Service Level Agreements (SLAs)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Strict operational timeframes defined in policy.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-start justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Appeal Filing Window</p>
                <p className="text-[11px] text-zinc-500">From the moment the warning is published</p>
              </div>
              <span className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                7 Days Max
              </span>
            </div>

            <div className="flex items-start justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Emergency Precautionary Suspension</p>
                <p className="text-[11px] text-zinc-500">Strict regulatory cap before hearing or review</p>
              </div>
              <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                48 Hours Cap
              </span>
            </div>

            <div className="flex items-start justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Committee Case Resolution</p>
                <p className="text-[11px] text-zinc-500">From committee seating to final decision</p>
              </div>
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                14 Days Max
              </span>
            </div>

            <div className="flex items-start justify-between rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Improvement Plan Execution</p>
                <p className="text-[11px] text-zinc-500">Standard remediation evaluation cycle</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                14 - 30 Days
              </span>
            </div>
          </div>
        </div>

        {/* Committee & COI Rules */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Committee Quorum & COI Guarantees
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Structural impartiality safeguards.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Strictly Odd Quorum</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                All investigative and appeals committees must be formed with an odd number of members (typically 3 or 5) to prevent permanent ties.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Conflict of Interest (COI) Prohibition</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                The issuing leader, the subject member, and any direct witness are legally disqualified from sitting on the committee or casting votes.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Executive Overrides Audit Requirement</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Super Admins can execute emergency administrative overrides, provided a substantiated rationale is entered and immutably logged with `previousState` and `newState`.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
