"use client";

import {
  Activity,
  AlertOctagon,
  Calendar,
  Clock3,
  Layers,
  ShieldAlert,
} from "lucide-react";

export type ActivityStats = {
  totalEvents: number;
  todayEvents: number;
  governanceEvents: number;
  overridesCount: number;
  resourceTypeBreakdown: Record<string, number>;
  viewerScope: "ORGANIZATION_WIDE" | "PERSONAL_ACTIVITY";
};

interface ActivityKpisProps {
  stats: ActivityStats | null;
  loading: boolean;
}

export function ActivityKpis({ stats, loading }: ActivityKpisProps) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Events */}
        <div className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Total Audit Events
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Activity size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {stats?.totalEvents ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Immutable append-only records
          </p>
        </div>

        {/* Today's Activity */}
        <div className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Today&apos;s Activity
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Clock3 size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {stats?.todayEvents ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Recorded since 00:00 UTC
          </p>
        </div>

        {/* Governance Decisions */}
        <div className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Governance Actions
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {stats?.governanceEvents ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Warnings, appeals & committee votes
          </p>
        </div>

        {/* Super Admin Overrides */}
        <div className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Super Admin Overrides
            </span>
            <div
              className={`rounded-xl p-2 ${
                (stats?.overridesCount ?? 0) > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              <AlertOctagon size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {stats?.overridesCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Executive override justifications
          </p>
        </div>
      </div>

      {/* Resource Types breakdown pill strip */}
      {stats?.resourceTypeBreakdown && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-500">Resource Distribution:</span>
          {Object.entries(stats.resourceTypeBreakdown).map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {type}: <strong className="font-bold">{count}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
