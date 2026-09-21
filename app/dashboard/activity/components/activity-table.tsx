"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FolderKanban,
  LogIn,
  LogOut,
  Scale,
  Shield,
  ShieldAlert,
  UserCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import type { IAuditLog } from "@/models/audit-log";

interface ActivityTableProps {
  logs: any[];
  loading: boolean;
  onInspect: (log: any) => void;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

// Helpers for semantic action badge
function getActionBadge(action: string) {
  if (action.startsWith("warnings.issue")) {
    return {
      label: "Warning Issued",
      color: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/40",
      icon: AlertTriangle,
    };
  }
  if (action.startsWith("warnings.approve")) {
    return {
      label: "Warning Approved",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/40",
      icon: CheckCircle2,
    };
  }
  if (action.startsWith("warnings.suspend")) {
    return {
      label: "Suspension Recorded",
      color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40",
      icon: ShieldAlert,
    };
  }
  if (action.startsWith("appeals.decide")) {
    return {
      label: "Appeal Decided",
      color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40",
      icon: Scale,
    };
  }
  if (action.startsWith("appeals.submit")) {
    return {
      label: "Appeal Submitted",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40",
      icon: Scale,
    };
  }
  if (action.startsWith("committee.vote")) {
    return {
      label: "Committee Vote",
      color: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-900/40",
      icon: Scale,
    };
  }
  if (action.startsWith("committee.tie")) {
    return {
      label: "Committee Deadlock",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40",
      icon: AlertOctagon,
    };
  }
  if (action.startsWith("committee.add_member")) {
    return {
      label: "Tie-Breaker Added",
      color: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900/40",
      icon: UserCheck,
    };
  }
  if (action.startsWith("committee.form")) {
    return {
      label: "Committee Formed",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/40",
      icon: Users,
    };
  }
  if (action.startsWith("cases.refer_removal")) {
    return {
      label: "Removal Referral",
      color: "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800",
      icon: ShieldAlert,
    };
  }
  if (action.startsWith("projects.create")) {
    return {
      label: "Project Created",
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40",
      icon: FolderKanban,
    };
  }
  if (action.startsWith("projects.update")) {
    return {
      label: "Project Updated",
      color: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-900/40",
      icon: FolderKanban,
    };
  }
  if (action.startsWith("projects.delete")) {
    return {
      label: "Project Deleted",
      color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40",
      icon: FolderKanban,
    };
  }
  if (action.startsWith("tasks.create")) {
    return {
      label: "Task Created",
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40",
      icon: ClipboardList,
    };
  }
  if (action.startsWith("tasks.update")) {
    return {
      label: "Task Updated",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40",
      icon: ClipboardList,
    };
  }
  if (action.startsWith("tasks.delete")) {
    return {
      label: "Task Deleted",
      color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/40",
      icon: ClipboardList,
    };
  }
  if (action === "members.login") {
    return {
      label: "Session Login",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40",
      icon: LogIn,
    };
  }
  if (action === "members.logout") {
    return {
      label: "Session Logout",
      color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      icon: LogOut,
    };
  }

  return {
    label: action,
    color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: Shield,
  };
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "Super Admin":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "Admin":
      return "bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300";
    case "Committee":
      return "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300";
    case "HR":
      return "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-300";
    case "Team Leader":
      return "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ActivityTable({
  logs,
  loading,
  onInspect,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: ActivityTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 rounded-full bg-zinc-100 p-4 dark:bg-zinc-900">
          <FileSpreadsheet size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No Activity Records Found
        </h3>
        <p className="mt-1 max-w-sm text-xs text-zinc-500">
          No audit log entries match your current filter and search criteria. Try adjusting or resetting filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-zinc-200 bg-zinc-50/75 text-[11px] font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action & Domain</th>
              <th className="px-4 py-3">Target Resource</th>
              <th className="px-4 py-3">Decision Reason</th>
              <th className="px-4 py-3">Authorization</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {logs.map((log) => {
              const badge = getActionBadge(log.action);
              const ActionIcon = badge.icon;
              const isOverride = log.authorizationResult === "SUPER_ADMIN_OVERRIDE";

              return (
                <tr
                  key={log._id}
                  onClick={() => onInspect(log)}
                  className="group cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      title={new Date(log.createdAt).toLocaleString()}
                      className="font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      {formatRelativeTime(log.createdAt)}
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 font-bold text-zinc-700 text-[10px] dark:bg-zinc-800 dark:text-zinc-200">
                        {getInitials(log.actor?.name || "System")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-zinc-900 dark:text-white">
                            {log.actor?.name || "System"}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9px] font-semibold ${getRoleBadgeColor(
                              log.actor?.role,
                            )}`}
                          >
                            {log.actor?.role}
                          </span>
                        </div>
                        <span className="block truncate text-[10px] text-zinc-400">
                          {log.actor?.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${badge.color}`}
                    >
                      <ActionIcon size={13} className="shrink-0" />
                      {badge.label}
                    </span>
                  </td>

                  {/* Resource */}
                  <td className="px-4 py-3">
                    <div className="max-w-[180px] truncate">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {log.resource?.type}
                      </span>
                      <span className="ml-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {log.resource?.identifier || String(log.resource?.id).slice(0, 10)}
                      </span>
                    </div>
                  </td>

                  {/* Decision Reason */}
                  <td className="px-4 py-3">
                    <p
                      title={log.decisionReason}
                      className="max-w-xs truncate text-xs text-zinc-600 dark:text-zinc-300"
                    >
                      {log.decisionReason || "—"}
                    </p>
                  </td>

                  {/* Authorization Result */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isOverride ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertOctagon size={11} className="shrink-0 text-amber-600" />
                        OVERRIDE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        Standard
                      </span>
                    )}
                  </td>

                  {/* Inspect Button */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspect(log);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <Eye size={13} />
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 transition focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2 font-medium">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Page {page} of {Math.max(1, totalPages)}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
