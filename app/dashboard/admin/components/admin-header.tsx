"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Crown,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";

type AdminHeaderProps = {
  viewerRole: string;
  isSuperAdmin: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: string | null;
};

export default function AdminHeader({
  viewerRole,
  isSuperAdmin,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title & Badge */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-xl shadow-zinc-950/20 dark:bg-white dark:text-zinc-950">
          {isSuperAdmin ? <Crown className="h-6 w-6 text-amber-400 dark:text-amber-600" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Executive Administration Hub
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                isSuperAdmin
                  ? "bg-amber-100 text-amber-800 border border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60"
                  : "bg-purple-100 text-purple-800 border border-purple-300/60 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700/60"
              }`}
            >
              <Shield className="h-3 w-3" />
              {viewerRole} Access
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Governance
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            System health, committee deadlocks, executive overrides, and privileged security management.
            {lastUpdated && <span className="ml-2 opacity-75">• Last synced: {lastUpdated}</span>}
          </p>
        </div>
      </div>

      {/* Quick Navigation & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-zinc-900 dark:text-white" : ""}`} />
          <span>Refresh</span>
        </button>

        <Link
          href="/dashboard/activity"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Activity className="h-3.5 w-3.5 text-zinc-500" />
          <span>Activity Logs</span>
          <ArrowUpRight className="h-3 w-3 opacity-60" />
        </Link>

        <Link
          href="/dashboard/hr"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Shield className="h-3.5 w-3.5 text-violet-500" />
          <span>HR & Governance</span>
          <ArrowUpRight className="h-3 w-3 opacity-60" />
        </Link>

        <Link
          href="/dashboard/warnings"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span>Warnings</span>
          <ArrowUpRight className="h-3 w-3 opacity-60" />
        </Link>
      </div>
    </div>
  );
}
