"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock3, ClipboardList, Edit, Plus, Trash2 } from "lucide-react";

import AddTaskModal from "@/components/tasks/add-task-modal";
import EditTaskModal from "@/components/tasks/edit-task-modal";

type Task = {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo?: string;
  dueDate?: string;
};

type TasksSectionProps = {
  projectId: string;
  projectMembers?: Array<{
    _id: string;
    name: string;
    email?: string;
    role: string;
    avatar?: string;
  }>;
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusConfig = {
  todo:          { label: "To Do",       icon: Circle,       color: "text-zinc-400" },
  "in-progress": { label: "In Progress", icon: Clock3,       color: "text-amber-500" },
  done:          { label: "Done",        icon: CheckCircle2, color: "text-emerald-500" },
} as const;

const priorityConfig = {
  low:    { label: "Low",    bg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  medium: { label: "Medium", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  high:   { label: "High",   bg: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function TasksSection({ projectId, projectMembers = [] }: TasksSectionProps) {
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(`/api/tasks?projectId=${projectId}`);
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId) fetchTasks();
  }, [projectId]);

  async function handleDeleteTask(taskId: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((current) => current.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete task");
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((current) =>
      current.map((t) => (t._id === updated._id ? updated : t)),
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-white">
              <ClipboardList size={20} />
              Tasks
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {isLoading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList size={40} className="text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No tasks yet
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Add a task to start tracking work for this project.
            </p>
          </div>
        )}

        {/* Task list */}
        {!isLoading && !error && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task) => {
              const status   = statusConfig[task.status]   ?? statusConfig.todo;
              const priority = priorityConfig[task.priority] ?? priorityConfig.medium;
              const StatusIcon = status.icon;

              return (
                <div
                  key={task._id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon size={18} className={`mt-0.5 shrink-0 ${status.color}`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-950 dark:text-white">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                        {task.assignedTo && (
                          <span>
                            👤{" "}
                            {typeof task.assignedTo === "object" && (task.assignedTo as any)?.name
                              ? (task.assignedTo as any).name
                              : task.assignedTo}
                          </span>
                        )}
                        {task.dueDate && (
                          <span>📅 {new Date(task.dueDate).toLocaleDateString("en-GB")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${priority.bg}`}>
                      {priority.label}
                    </span>
                    <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {status.label}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(task)}
                        aria-label={`Edit ${task.title}`}
                        title="Edit task"
                        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task._id)}
                        aria-label={`Delete ${task.title}`}
                        title="Delete task"
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Task Modal */}
      <AddTaskModal
        projectId={projectId}
        projectMembers={projectMembers}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={(newTask) => {
          setTasks((current) => [newTask, ...current]);
        }}
      />

      <EditTaskModal
        task={editTarget}
        projectMembers={projectMembers}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={(updated) => {
          handleTaskUpdated(updated);
          setEditTarget(null);
        }}
      />
    </>
  );
}
