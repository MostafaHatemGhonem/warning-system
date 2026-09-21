"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FolderKanban,
  RotateCw,
  Users,
  XCircle,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

// ─── Types matching GET /api/dashboard/stats ──────────────────────────────────
type DashboardStats = {
  projects: {
    total: number;
    planning: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
  };
  members: {
    total: number;
    active: number;
    inactive: number;
  };
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
type StatCardProps = {
  title: string;
  value: number;
  sub?: string;
  icon: typeof FolderKanban;
  color: string;
};

function StatCard({ title, value, sub, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <Icon size={18} className={color} />
      </div>
      <p className="text-3xl font-bold text-zinc-950 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Skeleton Component ───────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800 ${className}`}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to fetch dashboard statistics");
      }
      setStats(json.data);
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError("Could not load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-zinc-500">Workspace Overview</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950 dark:text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchStats}
              disabled={loading}
              title="Refresh statistics"
              aria-label="Refresh statistics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <FolderKanban size={16} />
              Projects
            </Link>
          </div>
        </div>

        {/* ── Error Banner ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchStats}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Projects Stats ────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
              <FolderKanban size={16} className="text-blue-500" />
              Projects
            </h2>
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-[105px]" />)
            ) : stats ? (
              <>
                <StatCard
                  title="Total Projects"
                  value={stats.projects.total}
                  sub={`${stats.projects.planning} in planning`}
                  icon={FolderKanban}
                  color="text-blue-500"
                />
                <StatCard
                  title="Active Projects"
                  value={stats.projects.active}
                  sub="In progress"
                  icon={Activity}
                  color="text-emerald-500"
                />
                <StatCard
                  title="Completed Projects"
                  value={stats.projects.completed}
                  sub="Delivered"
                  icon={CheckCircle2}
                  color="text-indigo-500"
                />
              </>
            ) : null}
          </div>
        </section>

        {/* ── Tasks Stats ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
              <ClipboardList size={16} className="text-amber-500" />
              Tasks
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-[105px]" />)
            ) : stats ? (
              <>
                <StatCard
                  title="Total Tasks"
                  value={stats.tasks.total}
                  sub="Across all projects"
                  icon={ClipboardList}
                  color="text-amber-500"
                />
                <StatCard
                  title="Completed Tasks"
                  value={stats.tasks.completed}
                  sub="Marked as done"
                  icon={CheckCircle2}
                  color="text-emerald-500"
                />
                <StatCard
                  title="Pending Tasks"
                  value={stats.tasks.pending}
                  sub="Todo & in progress"
                  icon={Clock3}
                  color="text-amber-500"
                />
              </>
            ) : null}
          </div>
        </section>

        {/* ── Members Stats ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
              <Users size={16} className="text-purple-500" />
              Members
            </h2>
            <Link
              href="/dashboard/members"
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
            >
              Manage members <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-[105px]" />)
            ) : stats ? (
              <>
                <StatCard
                  title="Total Members"
                  value={stats.members.total}
                  sub="Registered team"
                  icon={Users}
                  color="text-purple-500"
                />
                <StatCard
                  title="Active Members"
                  value={stats.members.active}
                  sub="Active in workspace"
                  icon={CheckCircle2}
                  color="text-emerald-500"
                />
                <StatCard
                  title="Inactive Members"
                  value={stats.members.inactive}
                  sub="Deactivated accounts"
                  icon={XCircle}
                  color="text-red-400"
                />
              </>
            ) : null}
          </div>
        </section>

      </div>
    </DashboardShell>
  );
}
