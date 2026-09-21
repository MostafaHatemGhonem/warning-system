"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit2,
  FolderKanban,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { getDueDateStatus } from "../lib/date-helpers";

export type TaskAssignee = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
};

export type TaskProject = {
  _id: string;
  name: string;
};

export type TaskItem = {
  _id: string;
  projectId: TaskProject | string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo?: TaskAssignee | string | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type TaskKanbanProps = {
  tasks: TaskItem[];
  onStatusChange: (task: TaskItem, newStatus: "todo" | "in-progress" | "done") => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (task: TaskItem) => void;
  onOpenCreateModal?: () => void;
  isUpdatingId?: string | null;
};

const COLUMNS: {
  id: "todo" | "in-progress" | "done";
  title: string;
  icon: any;
  headerBg: string;
  headerText: string;
  badgeBg: string;
}[] = [
  {
    id: "todo",
    title: "To Do",
    icon: Circle,
    headerBg: "border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/60",
    headerText: "text-zinc-700 dark:text-zinc-300",
    badgeBg: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  {
    id: "in-progress",
    title: "In Progress",
    icon: Clock3,
    headerBg: "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20",
    headerText: "text-amber-800 dark:text-amber-300",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  },
  {
    id: "done",
    title: "Completed",
    icon: CheckCircle2,
    headerBg: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    headerText: "text-emerald-800 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
];

export default function TaskKanban({
  tasks,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onOpenCreateModal,
  isUpdatingId,
}: TaskKanbanProps) {
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        const IconComponent = column.icon;

        return (
          <div
            key={column.id}
            className="flex flex-col rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-3.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between rounded-xl border p-3 ${column.headerBg}`}>
              <div className="flex items-center gap-2">
                <IconComponent className={`h-4 w-4 ${column.headerText}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${column.headerText}`}>
                  {column.title}
                </h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${column.badgeBg}`}>
                  {columnTasks.length}
                </span>
              </div>

              {column.id === "todo" && onOpenCreateModal && (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  title="Add Task"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Cards List */}
            <div className="mt-3 flex-1 space-y-3">
              {columnTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    No tasks in {column.title.toLowerCase()}
                  </p>
                  {column.id === "todo" && onOpenCreateModal && (
                    <button
                      onClick={onOpenCreateModal}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-900 hover:underline dark:text-zinc-200"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Create first task</span>
                    </button>
                  )}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const dueInfo = getDueDateStatus(task.dueDate, task.status);
                  const assignee = getAssigneeInfo(task.assignedTo);
                  const isUpdating = isUpdatingId === task._id;

                  return (
                    <div
                      key={task._id}
                      className={`group relative rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:bg-zinc-900 dark:hover:border-zinc-700 ${
                        dueInfo.isOverdue
                          ? "border-rose-200/90 dark:border-rose-900/50"
                          : "border-zinc-200/80 dark:border-zinc-800"
                      } ${isUpdating ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {/* Top Badges: Project & Priority */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Project Tag */}
                        <span className="inline-flex items-center gap-1 truncate rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          <FolderKanban className="h-3 w-3 shrink-0" />
                          <span className="truncate">{getProjectName(task.projectId)}</span>
                        </span>

                        {/* Priority Badge */}
                        <div className="flex items-center gap-1">
                          {task.priority === "high" && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              High Priority
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

                          {/* Quick Edit & Delete Icons */}
                          <div className="flex items-center opacity-70 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              title="Edit Task"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task)}
                              className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              title="Delete Task"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-2.5">
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Metadata Row: Due Date & Assignee */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800/80">
                        {/* Due Date Badge */}
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${dueInfo.badgeClass}`}
                          >
                            {dueInfo.isOverdue ? (
                              <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500 animate-bounce" />
                            ) : (
                              <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                            )}
                            <span>{dueInfo.label}</span>
                          </span>
                        </div>

                        {/* Assignee Info */}
                        <div className="flex items-center gap-1.5">
                          {assignee ? (
                            <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[9px] font-bold text-white dark:bg-zinc-700">
                                {assignee.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="max-w-[85px] truncate font-medium">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                              <User className="h-3 w-3" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* State Shift Buttons (No drag-and-drop - 100% audit-logged transitions) */}
                      <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-zinc-100/90 pt-2.5 dark:border-zinc-800/80">
                        {task.status === "todo" && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(task, "in-progress")}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/50 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/60"
                          >
                            <span>Start Task</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {task.status === "in-progress" && (
                          <>
                            <button
                              type="button"
                              onClick={() => onStatusChange(task, "todo")}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              title="Move back to To Do"
                            >
                              <ArrowLeft className="h-3 w-3" />
                              <span>Back</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onStatusChange(task, "done")}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-500 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-600 dark:border-emerald-700"
                              title="Mark task as complete"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Done</span>
                            </button>
                          </>
                        )}

                        {task.status === "done" && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(task, "in-progress")}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reopen Task</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
