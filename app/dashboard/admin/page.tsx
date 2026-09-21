"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Crown,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import AdminHeader from "./components/admin-header";
import AdminKPIs from "./components/admin-kpis";
import TabDeadlocks from "./components/tab-deadlocks";
import TabRolesMembers from "./components/tab-roles-members";
import TabGovernanceMatrix from "./components/tab-governance-matrix";
import TabActivityStream from "./components/tab-activity-stream";
import TieBreakModal from "./components/tie-break-modal";

type AdminOverviewData = {
  viewerRole: string;
  isSuperAdmin: boolean;
  systemHealth: {
    database: string;
    activeSessions: number;
    totalAuditLogs: number;
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
  };
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
  roleBreakdown: {
    superAdmin: number;
    admin: number;
    hr: number;
    committee: number;
    teamLeader: number;
    member: number;
    committeeSeats: number;
  };
  escalations: {
    tiedCommittees: any[];
    clause14Referrals: any[];
    suspensions: any[];
    criticalWarnings: any[];
  };
  recentOverrides: any[];
  recentAdminActions: any[];
  members: any[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"deadlocks" | "roles" | "governance" | "activity">("deadlocks");
  const [selectedCommitteeForTieBreak, setSelectedCommitteeForTieBreak] = useState<any | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function loadAdminData(showRefreshingState = false) {
    try {
      if (showRefreshingState) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const res = await fetch("/api/admin/overview", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (res.status === 403) {
        setAccessDenied(true);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load admin overview data.");
      }

      setData(json.data);
      setLastUpdated(new Date().toLocaleTimeString());
      setAccessDenied(false);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with administration service.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  // ── Access Denied View ───────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <DashboardShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xl shadow-rose-500/10 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              <Lock className="h-10 w-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Shield className="h-4 w-4" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Administrative Access Restricted
          </h1>
          <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            The Administration Hub is strictly restricted to authorized Administrators and Super Administrators of Infinity Explorers.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Main Dashboard
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <DashboardShell>
        <div className="space-y-8 p-4">
          <div className="h-16 w-1/3 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userRole={data?.viewerRole as any}>
      <div className="space-y-8">
        
        {/* ── 1. Admin Header ──────────────────────────────────────────────── */}
        {data && (
          <AdminHeader
            viewerRole={data.viewerRole}
            isSuperAdmin={data.isSuperAdmin}
            onRefresh={() => loadAdminData(true)}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />
        )}

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadAdminData(true)}
              className="font-bold underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── 2. KPI Ribbon ────────────────────────────────────────────────── */}
        {data && (
          <AdminKPIs
            kpis={data.kpis}
            systemHealth={data.systemHealth}
            onSelectTab={(tabId) => setActiveTab(tabId as any)}
          />
        )}

        {/* ── 3. Tab Navigation ────────────────────────────────────────────── */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("deadlocks")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "deadlocks"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Deadlocks & Critical Escalations</span>
            {(data?.kpis.tiedCommitteesCount || 0) > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {data?.kpis.tiedCommitteesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "roles"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Privileged Roles & Members</span>
          </button>

          <button
            onClick={() => setActiveTab("governance")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "governance"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Governance Matrix & SLAs</span>
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "activity"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Executive Activity & Overrides</span>
          </button>
        </div>

        {/* ── 4. Active Tab Content ────────────────────────────────────────── */}
        {data && activeTab === "deadlocks" && (
          <TabDeadlocks
            tiedCommittees={data.escalations.tiedCommittees}
            clause14Referrals={data.escalations.clause14Referrals}
            suspensions={data.escalations.suspensions}
            isSuperAdmin={data.isSuperAdmin}
            onOpenTieBreak={(comm) => setSelectedCommitteeForTieBreak(comm)}
          />
        )}

        {data && activeTab === "roles" && (
          <TabRolesMembers
            members={data.members}
            roleBreakdown={data.roleBreakdown}
            isSuperAdmin={data.isSuperAdmin}
            onRefresh={() => loadAdminData(true)}
          />
        )}

        {data && activeTab === "governance" && <TabGovernanceMatrix />}

        {data && activeTab === "activity" && (
          <TabActivityStream
            recentOverrides={data.recentOverrides}
            recentAdminActions={data.recentAdminActions}
          />
        )}

        {/* ── 5. Super Admin Tie Break Modal ───────────────────────────────── */}
        {selectedCommitteeForTieBreak && data && (
          <TieBreakModal
            committee={selectedCommitteeForTieBreak}
            eligibleMembers={data.members}
            onClose={() => setSelectedCommitteeForTieBreak(null)}
            onSuccess={() => {
              setSelectedCommitteeForTieBreak(null);
              loadAdminData(true);
            }}
          />
        )}

      </div>
    </DashboardShell>
  );
}
