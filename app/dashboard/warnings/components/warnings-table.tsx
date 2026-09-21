"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ChevronRight,
  Clock,
  Eye,
  FolderKanban,
  Globe,
  Shield,
  ShieldAlert,
  User,
  UserX,
} from "lucide-react";
import type { CurrentUser, WarningItem } from "@/lib/client-permissions";

type WarningsTableProps = {
  warnings: WarningItem[];
  currentUser: CurrentUser | null;
  onSelectWarning: (warning: WarningItem) => void;
};

export function WarningsTable({
  warnings,
  currentUser,
  onSelectWarning,
}: WarningsTableProps) {
  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-800">
        <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <AlertTriangle className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
          No Warnings Found
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          There are no warnings matching the selected filters.
        </p>
      </div>
    );
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3.5 font-bold">Subject Member</th>
              <th className="px-4 py-3.5 font-bold">Level & Scope</th>
              <th className="px-4 py-3.5 font-bold">Severity</th>
              <th className="px-4 py-3.5 font-bold">Status & Flags</th>
              <th className="px-4 py-3.5 font-bold">Active Until</th>
              <th className="px-5 py-3.5 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {warnings.map((w) => {
              const memberName =
                typeof w.member === "object" && w.member ? w.member.name : "Member";
              const memberEmail =
                typeof w.member === "object" && w.member ? w.member.email : "";
              const projectName =
                typeof w.project === "object" && w.project ? w.project.name : null;

              return (
                <tr
                  key={w._id}
                  onClick={() => onSelectWarning(w)}
                  className="group cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                >
                  {/* Member */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                          {memberName}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {memberEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Level & Scope */}
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 font-bold ${
                          w.level === "Final Warning"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                            : w.level === "Warning 2"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        {w.level}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {w.type === "Global" ? (
                          <>
                            <Globe className="h-3 w-3 text-indigo-500" />
                            <span>Global</span>
                          </>
                        ) : (
                          <>
                            <FolderKanban className="h-3 w-3 text-zinc-400" />
                            <span className="truncate max-w-[130px]">{projectName ?? "Project"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Severity */}
                  <td className="px-4 py-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Level {w.severity}
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        {w.points} {w.points === 1 ? "Point" : "Points"}
                      </p>
                    </div>
                  </td>

                  {/* Status & Flags */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2 py-0.5 font-semibold ${
                          w.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : w.status === "Pending_Approval"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : w.status === "Pending_Review"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : w.status === "Resolved"
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {w.status.replace("_", " ")}
                      </span>

                      {w.status === "Pending_Approval" && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-700 dark:text-indigo-400">
                          <Shield className="h-3 w-3" />
                          Committee Required
                        </span>
                      )}

                      {(w.review?.status === "Requested" ||
                        w.review?.status === "Under_Review") && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 font-bold text-blue-700 dark:text-blue-400">
                          <Shield className="h-3 w-3" />
                          Appeal in Committee
                        </span>
                      )}

                      {w.review?.disciplinaryRecommendation ===
                        "Refer_To_Formal_Removal_Review" && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-400">
                          <UserX className="h-3 w-3" />
                          Removal Referral
                        </span>
                      )}

                      {w.suspension?.isSuspended && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-400">
                          <AlertOctagon className="h-3 w-3" />
                          Suspended
                        </span>
                      )}

                      {w.improvementPlan?.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-700 dark:text-indigo-400">
                          <ShieldAlert className="h-3 w-3" />
                          Plan Active
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Active Until */}
                  <td className="px-4 py-4 font-medium text-zinc-600 dark:text-zinc-400">
                    {formatDate(w.activeUntil)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWarning(w);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 group-hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
