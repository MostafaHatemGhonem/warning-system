"use client";

import { useState } from "react";
import {
  Download,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

export type FilterState = {
  search: string;
  resourceType: string;
  category: string;
  authorizationResult: string;
  startDate: string;
  endDate: string;
};

interface ActivityFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, val: string) => void;
  onReset: () => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  isRefreshing: boolean;
  onExportCsv: () => void;
  onExportJson: () => void;
  isExporting: boolean;
}

export function ActivityFilters({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
  isRefreshing,
  onExportCsv,
  onExportJson,
  isExporting,
}: ActivityFiltersProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isFiltered =
    Boolean(filters.search) ||
    filters.resourceType !== "all" ||
    filters.category !== "all" ||
    filters.authorizationResult !== "all" ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Top Bar: Search & Quick Actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search by actor name, email, resource ID, decision reason, or requestId..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-9 pl-9 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-white dark:focus:border-blue-500 dark:focus:bg-zinc-900"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange("search", "")}
              title="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons: Auto-refresh, Manual refresh, Export, Toggle Advanced */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? "Auto-refresh is ON (every 15s)" : "Auto-refresh is OFF"}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              autoRefresh
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefresh ? "animate-pulse bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {autoRefresh ? "Live 15s" : "Auto-refresh"}
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh now"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-blue-500" : ""} />
            Refresh
          </button>

          {/* Toggle More Filters */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              showAdvanced || isFiltered
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters {isFiltered && "(Active)"}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Download size={14} />
              Export
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 z-30 mt-1 w-40 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportCsv();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportJson();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Download JSON
                </button>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div
        className={`grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-5 ${
          showAdvanced ? "block" : "hidden sm:grid"
        }`}
      >
        {/* Resource Type */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Resource Type
          </label>
          <select
            value={filters.resourceType}
            onChange={(e) => onFilterChange("resourceType", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="Warning">Warnings</option>
            <option value="Member">Members</option>
            <option value="Project">Projects</option>
            <option value="Task">Tasks</option>
            <option value="Committee">Committees</option>
          </select>
        </div>

        {/* Action Category */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Action Domain
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange("category", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          >
            <option value="all">All Domains</option>
            <option value="warnings">Warnings</option>
            <option value="members">Members & Auth</option>
            <option value="projects">Projects</option>
            <option value="tasks">Tasks</option>
            <option value="committee">Committee & Votes</option>
            <option value="appeals">Appeals</option>
            <option value="improvement_plans">Improvement Plans</option>
            <option value="cases">Removal Referrals</option>
          </select>
        </div>

        {/* Authorization */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Authorization
          </label>
          <select
            value={filters.authorizationResult}
            onChange={(e) => onFilterChange("authorizationResult", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          >
            <option value="all">All Results</option>
            <option value="STANDARD_GRANT">Standard Grant</option>
            <option value="SUPER_ADMIN_OVERRIDE">Super Admin Override</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
