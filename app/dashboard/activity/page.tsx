"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, RotateCw, Shield } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ActivityKpis, type ActivityStats } from "./components/activity-kpis";
import { ActivityFilters, type FilterState } from "./components/activity-filters";
import { ActivityTable } from "./components/activity-table";
import { ActivityDetailsDrawer } from "./components/activity-details-drawer";

const INITIAL_FILTERS: FilterState = {
  search: "",
  resourceType: "all",
  category: "all",
  authorizationResult: "all",
  startDate: "",
  endDate: "",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewerScope, setViewerScope] = useState<"ORGANIZATION_WIDE" | "PERSONAL_ACTIVITY">("ORGANIZATION_WIDE");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce ref for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs/stats");
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  }, []);

  // Fetch Logs with active filters and pagination
  const fetchLogs = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        else setIsRefreshing(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.resourceType !== "all") params.set("resourceType", filters.resourceType);
        if (filters.category !== "all") params.set("category", filters.category);
        if (filters.authorizationResult !== "all") params.set("authorizationResult", filters.authorizationResult);
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load activity logs");
        }

        setLogs(json.data || []);
        if (json.pagination) {
          setTotal(json.pagination.total || 0);
          setTotalPages(json.pagination.totalPages || 1);
        }
      } catch (err: any) {
        console.error("fetchLogs error:", err);
        setError(err?.message || "Could not retrieve audit logs. Please try again.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, filters],
  );

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  // Auto-refresh interval (15s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
      fetchStats();
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, fetchStats]);

  // Read URL query parameters on mount (e.g. ?resourceType=Task)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const resType = searchParams.get("resourceType");
      const cat = searchParams.get("category");
      const q = searchParams.get("search");

      if (resType || cat || q) {
        setFilters((prev) => ({
          ...prev,
          ...(resType ? { resourceType: resType } : {}),
          ...(cat ? { category: cat } : {}),
          ...(q ? { search: q } : {}),
        }));
      }
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1); // Reset to page 1 on filter changes
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  // Export handlers
  const handleExport = async (format: "csv" | "json") => {
    try {
      setIsExporting(true);

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "1000"); // Fetch comprehensive batch for export

      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.resourceType !== "all") params.set("resourceType", filters.resourceType);
      if (filters.category !== "all") params.set("category", filters.category);
      if (filters.authorizationResult !== "all") params.set("authorizationResult", filters.authorizationResult);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const json = await res.json();
      const records = json.data || [];

      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "json") {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `activity-logs-${timestamp}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        // CSV Export
        const headers = ["Timestamp", "Action", "Actor Name", "Actor Email", "Actor Role", "Resource Type", "Resource Identifier", "Authorization", "Decision Reason", "Request ID"];
        const rows = records.map((r: any) => [
          `"${new Date(r.createdAt).toISOString()}"`,
          `"${r.action || ""}"`,
          `"${(r.actor?.name || "").replace(/"/g, '""')}"`,
          `"${(r.actor?.email || "").replace(/"/g, '""')}"`,
          `"${r.actor?.role || ""}"`,
          `"${r.resource?.type || ""}"`,
          `"${(r.resource?.identifier || "").replace(/"/g, '""')}"`,
          `"${r.authorizationResult || ""}"`,
          `"${(r.decisionReason || "").replace(/"/g, '""')}"`,
          `"${r.requestId || ""}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: string[]) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `activity-logs-${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export activity logs.");
    } finally {
      setIsExporting(false);
    }
  };

  if (accessDenied) {
    return (
      <DashboardShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-2xl bg-red-100 p-4 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Shield size={36} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Access Restricted
          </h2>
          <p className="mt-2 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
            Activity and Governance audit logs are strictly restricted to <strong>Admin</strong> and <strong>Super Admin</strong> roles only.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Return to Dashboard
          </a>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                AUDIT TRAIL
              </span>
              <span className="text-xs text-zinc-500">Immutable Compliance Journal</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Activity & Governance Logs
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
              <Shield size={14} />
              Admin & Super Admin Access Only
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchLogs()}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. KPI Ribbon */}
        <ActivityKpis stats={stats} loading={loading} />

        {/* 2. Advanced Filters Bar */}
        <ActivityFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          onRefresh={() => {
            fetchLogs(true);
            fetchStats();
          }}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          isRefreshing={isRefreshing}
          onExportCsv={() => handleExport("csv")}
          onExportJson={() => handleExport("json")}
          isExporting={isExporting}
        />

        {/* 3. Activity Table & Pagination */}
        <ActivityTable
          logs={logs}
          loading={loading}
          onInspect={(log) => setSelectedLog(log)}
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />

        {/* 4. Details Drawer & State Diff Inspector */}
        <ActivityDetailsDrawer
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      </div>
    </DashboardShell>
  );
}
