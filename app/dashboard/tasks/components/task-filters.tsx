"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  FolderKanban,
  Kanban,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  User,
  X,
} from "lucide-react";

type Project = {
  _id: string;
  name: string;
};

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
};

type TaskFiltersProps = {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  priorityFilter: string;
  onPriorityChange: (val: string) => void;
  projectFilter: string;
  onProjectChange: (val: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (val: string) => void;
  onlyOverdue: boolean;
  onOnlyOverdueChange: (val: boolean) => void;
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  projects: Project[];
  members: Member[];
  currentUserId?: string;
  onOpenCreateModal: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
};

export default function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  projectFilter,
  onProjectChange,
  assigneeFilter,
  onAssigneeChange,
  onlyOverdue,
  onOnlyOverdueChange,
  viewMode,
  onViewModeChange,
  projects,
  members,
  currentUserId,
  onOpenCreateModal,
  onResetFilters,
  hasActiveFilters,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      
      {/* ── Top Bar: Search, View Switcher, Create, Activity Link ───────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by title, description, or project..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-9 text-xs text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View Mode & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => onViewModeChange("kanban")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Activity Logs Direct Link */}
          <Link
            href="/dashboard/activity?resourceType=Task"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Activity className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Task Audit Logs</span>
            <ArrowUpRight className="h-3 w-3 opacity-60" />
          </Link>

          {/* Create Task Button */}
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>

      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        
        {/* Project Filter */}
        <div className="flex items-center gap-1.5">
          <FolderKanban className="h-3.5 w-3.5 text-zinc-400" />
          <select
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white py-1.5 px-2.5 text-xs text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          <select
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white py-1.5 px-2.5 text-xs text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="all">All Assignees</option>
            {currentUserId && <option value={currentUserId}>⭐ Assigned to Me</option>}
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white py-1.5 px-2.5 text-xs text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white py-1.5 px-2.5 text-xs text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        {/* Overdue Quick Toggle */}
        <button
          type="button"
          onClick={() => onOnlyOverdueChange(!onlyOverdue)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            onlyOverdue
              ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <AlertTriangle className={`h-3.5 w-3.5 ${onlyOverdue ? "text-rose-600 dark:text-rose-400" : "text-zinc-400"}`} />
          <span>Overdue Only</span>
        </button>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}

      </div>

    </div>
  );
}
