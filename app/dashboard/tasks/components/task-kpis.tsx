"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
} from "lucide-react";

type TaskKPIsProps = {
  totalTasks: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  overdueCount: number;
  dueTodayCount: number;
  onFilterStatus?: (status: string) => void;
  onFilterOverdue?: () => void;
};

export default function TaskKPIs({
  totalTasks,
  todoCount,
  inProgressCount,
  doneCount,
  overdueCount,
  dueTodayCount,
  onFilterStatus,
  onFilterOverdue,
}: TaskKPIsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      
      {/* 1. Total Tasks */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("all")}
        className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold">Total Tasks</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <ListTodo className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-zinc-950 dark:text-white">{totalTasks}</span>
          <p className="mt-0.5 text-[11px] text-zinc-400">Across all projects</p>
        </div>
      </div>

      {/* 2. In Progress */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("in-progress")}
        className="cursor-pointer rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm transition hover:shadow dark:border-amber-900/40 dark:bg-amber-950/20"
      >
        <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
          <span className="font-semibold">In Progress</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
            <Clock3 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{inProgressCount}</span>
          <p className="mt-0.5 text-[11px] text-amber-600/80 dark:text-amber-400/80">Active execution</p>
        </div>
      </div>

      {/* 3. Completed (Done) */}
      <div
        onClick={() => onFilterStatus && onFilterStatus("done")}
        className="cursor-pointer rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm transition hover:shadow dark:border-emerald-900/40 dark:bg-emerald-950/20"
      >
        <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
          <span className="font-semibold">Completed</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{doneCount}</span>
          <p className="mt-0.5 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Closed & delivered</p>
        </div>
      </div>

      {/* 4. Overdue Tasks */}
      <div
        onClick={() => onFilterOverdue && onFilterOverdue()}
        className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:shadow ${
          overdueCount > 0
            ? "border-rose-300 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${overdueCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"}`}>
            Overdue Tasks
          </span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              overdueCount > 0
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 animate-pulse"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className={`text-2xl font-black ${overdueCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-950 dark:text-white"}`}>
            {overdueCount}
          </span>
          <p className={`mt-0.5 text-[11px] ${overdueCount > 0 ? "text-rose-600 dark:text-rose-300 font-medium" : "text-zinc-400"}`}>
            {overdueCount > 0 ? "⚠️ Past due deadline" : "Zero overdue tasks"}
          </p>
        </div>
      </div>

      {/* 5. Due Today */}
      <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold">Due Today</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-zinc-950 dark:text-white">{dueTodayCount}</span>
          <p className="mt-0.5 text-[11px] text-zinc-400">Due before midnight</p>
        </div>
      </div>

    </div>
  );
}
