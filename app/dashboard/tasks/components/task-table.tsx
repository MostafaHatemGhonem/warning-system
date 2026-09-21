"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit2,
  FolderKanban,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { getDueDateStatus } from "../lib/date-helpers";
import { TaskItem, TaskAssignee, TaskProject } from "./task-kanban";

type TaskTableProps = {
  tasks: TaskItem[];
  onStatusChange: (task: TaskItem, newStatus: "todo" | "in-progress" | "done") => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (task: TaskItem) => void;
  onResetFilters?: () => void;
  isUpdatingId?: string | null;
};

export default function TaskTable({
  tasks,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onResetFilters,
  isUpdatingId,
}: TaskTableProps) {
  const getProjectName = (proj: TaskProject | string) => {
    if (!proj) return "General";
    return typeof proj === "object" ? proj.name : "Project";
  };

  const getAssigneeInfo = (assignee: TaskAssignee | string | null | undefined) => {
    if (!assignee) return null;
    if (typeof assignee === "object") {
      return {
        name: assignee.name,
        role: assignee.role,
        avatar: assignee.avatar,
      };
    }
    return { name: "Assigned Member", role: "member", avatar: undefined };
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">No tasks found</h3>
        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
          No tasks matched your search or active filter combination.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Task & Project</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5">Assignee</th>
              <th className="px-4 py-3.5">Due Date</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
            {tasks.map((task) => {
              const dueInfo = getDueDateStatus(task.dueDate, task.status);
              const assignee = getAssigneeInfo(task.assignedTo);
              const isUpdating = isUpdatingId === task._id;

              return (
                <tr
                  key={task._id}
                  className={`group transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 ${
                    dueInfo.isOverdue ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                  } ${isUpdating ? "pointer-events-none opacity-50" : ""}`}
                >
                  {/* Status Column */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {task.status === "todo" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <Circle className="h-3 w-3 text-zinc-400" />
                        <span>To Do</span>
                      </span>
                    )}
                    {task.status === "in-progress" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        <Clock3 className="h-3 w-3 text-amber-500" />
                        <span>In Progress</span>
                      </span>
                    )}
                    {task.status === "done" && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Completed</span>
                      </span>
                    )}
                  </td>

                  {/* Task & Project */}
                  <td className="max-w-md px-4 py-3.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-950 group-hover:text-zinc-800 dark:text-white dark:group-hover:text-zinc-200">
                          {task.title}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <FolderKanban className="h-2.5 w-2.5" />
                          <span>{getProjectName(task.projectId)}</span>
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {task.priority === "high" && (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        High
                      </span>
                    )}
                    {task.priority === "medium" && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        Medium
                      </span>
                    )}
                    {task.priority === "low" && (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Low
                      </span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white dark:bg-zinc-700">
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                            {assignee.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {assignee.role}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                        <User className="h-3 w-3" />
                        <span>Unassigned</span>
                      </span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${dueInfo.badgeClass}`}
                    >
                      {dueInfo.isOverdue ? (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      ) : (
                        <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                      )}
                      <span>{dueInfo.label}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {/* State Shift Buttons */}
                      {task.status === "todo" && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(task, "in-progress")}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/60 px-2 py-1 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                          title="Start task"
                        >
                          <span>Start</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}

                      {task.status === "in-progress" && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(task, "done")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-600"
                          title="Mark task done"
                        >
                          <Check className="h-3 w-3" />
                          <span>Done</span>
                        </button>
                      )}

                      {task.status === "done" && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(task, "in-progress")}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
                          title="Reopen task"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reopen</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        title="Edit task"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
