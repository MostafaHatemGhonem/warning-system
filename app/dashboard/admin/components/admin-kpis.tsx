"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  KeyRound,
  Lock,
  Scale,
  ShieldAlert,
  Users,
} from "lucide-react";

type KPIsProps = {
  kpis: {
    totalMembers: number;
    activeMembers: number;
    tiedCommitteesCount: number;
    activeCommitteesCount: number;
    clause14ReferralsCount: number;
    activeSuspensionsCount: number;
    criticalWarningsCount: number;
    overridesCount: number;
  };
  systemHealth: {
    database: string;
    activeSessions: number;
    totalAuditLogs: number;
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
  };
  onSelectTab: (tabId: string) => void;
};

export default function AdminKPIs({ kpis, systemHealth, onSelectTab }: KPIsProps) {
  const hasDeadlocks = kpis.tiedCommitteesCount > 0;
  const hasRemovals = kpis.clause14ReferralsCount > 0;
  const hasSuspensions = kpis.activeSuspensionsCount > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      
      {/* 1. System Health & Platform Metrics */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">System Platform</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Database className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-950 dark:text-white">
              {systemHealth.totalMembers}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Members</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium">DB {systemHealth.database}</span>
            <span className="text-zinc-400">• {systemHealth.activeSessions} active sessions</span>
          </div>
        </div>
      </div>

      {/* 2. Deadlocked / Tied Committees */}
      <div
        onClick={() => onSelectTab("deadlocks")}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
          hasDeadlocks
            ? "border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tied Committees</span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              hasDeadlocks
                ? "bg-rose-500/20 text-rose-600 dark:bg-rose-500/30 dark:text-rose-400 animate-pulse"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <Scale className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                hasDeadlocks ? "text-rose-700 dark:text-rose-400" : "text-zinc-950 dark:text-white"
              }`}
            >
              {kpis.tiedCommitteesCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {kpis.tiedCommitteesCount === 1 ? "Case Tied" : "Cases Tied"}
            </span>
          </div>
          <p
            className={`mt-2 text-xs font-medium ${
              hasDeadlocks ? "text-rose-600 dark:text-rose-300" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {hasDeadlocks ? "⚠️ Action required: Super Admin tie-break" : "No deadlocked cases"}
          </p>
        </div>
      </div>

      {/* 3. Clause 14 Removals */}
      <div
        onClick={() => onSelectTab("deadlocks")}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
          hasRemovals
            ? "border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Clause 14 Removals</span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              hasRemovals
                ? "bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <AlertOctagon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                hasRemovals ? "text-amber-700 dark:text-amber-400" : "text-zinc-950 dark:text-white"
              }`}
            >
              {kpis.clause14ReferralsCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Referrals</span>
          </div>
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">
            {hasRemovals ? "Project removal referrals active" : "Zero active referrals"}
          </p>
        </div>
      </div>

      {/* 4. Active Suspensions (48h SLA) */}
      <div
        onClick={() => onSelectTab("deadlocks")}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
          hasSuspensions
            ? "border-violet-300 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Active Suspensions</span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              hasSuspensions
                ? "bg-violet-500/20 text-violet-600 dark:bg-violet-500/30 dark:text-violet-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                hasSuspensions ? "text-violet-700 dark:text-violet-400" : "text-zinc-950 dark:text-white"
              }`}
            >
              {kpis.activeSuspensionsCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Members</span>
          </div>
          <p className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-300">
            {hasSuspensions ? "48-Hour SLA Countdown Active" : "No active suspensions"}
          </p>
        </div>
      </div>

      {/* 5. Executive Overrides */}
      <div
        onClick={() => onSelectTab("activity")}
        className="relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Executive Overrides</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {kpis.overridesCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Total</span>
          </div>
          <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Immutable reason recorded
          </p>
        </div>
      </div>

    </div>
  );
}
