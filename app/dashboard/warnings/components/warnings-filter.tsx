"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { WarningLevel, WarningType, WarningStatus } from "@/models/warning";

type FilterState = {
  search: string;
  scope: string;
  level: string;
  status: string;
  onlySuspended: boolean;
  onlyPlan: boolean;
  onlyCommittee: boolean;
  onlyRemoval: boolean;
};

type WarningsFilterProps = {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
};

export function WarningsFilter({ filters, onFilterChange }: WarningsFilterProps) {
  const hasActiveFilters =
    filters.search ||
    filters.scope !== "all" ||
    filters.level !== "all" ||
    filters.status !== "all" ||
    filters.onlySuspended ||
    filters.onlyPlan ||
    filters.onlyCommittee ||
    filters.onlyRemoval;

  const resetFilters = () => {
    onFilterChange({
      search: "",
      scope: "all",
      level: "all",
      status: "all",
      onlySuspended: false,
      onlyPlan: false,
      onlyCommittee: false,
      onlyRemoval: false,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by member name, description, or project..."
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope */}
          <select
            value={filters.scope}
            onChange={(e) =>
              onFilterChange({ ...filters, scope: e.target.value })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Scopes</option>
            <option value="Project">Project Only</option>
            <option value="Global">Global Only</option>
          </select>

          {/* Level */}
          <select
            value={filters.level}
            onChange={(e) =>
              onFilterChange({ ...filters, level: e.target.value })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Levels</option>
            <option value="Warning 1">Warning 1</option>
            <option value="Warning 2">Warning 2</option>
            <option value="Final Warning">Final Warning</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value })
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending_Approval">Pending Approval</option>
            <option value="Pending_Review">Pending Review</option>
            <option value="Extended">Extended</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Quick toggle chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              onlySuspended: !filters.onlySuspended,
            })
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            filters.onlySuspended
              ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
              : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400"
          }`}
        >
          🛑 Under Suspension
        </button>

        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              onlyPlan: !filters.onlyPlan,
            })
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            filters.onlyPlan
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
              : "bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-400"
          }`}
        >
          📋 Active Improvement Plan
        </button>

        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              onlyCommittee: !filters.onlyCommittee,
            })
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            filters.onlyCommittee
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400"
          }`}
        >
          🏛️ Governance Committee Cases
        </button>

        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              onlyRemoval: !filters.onlyRemoval,
            })
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
            filters.onlyRemoval
              ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
              : "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400"
          }`}
        >
          🚨 Project Removal Referrals
        </button>
      </div>
    </div>
  );
}
