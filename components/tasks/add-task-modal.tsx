"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

type AddTaskModalProps = {
  projectId: string;
  projectMembers?: Array<{
    _id: string;
    name: string;
    email?: string;
    role: string;
    avatar?: string;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (task: {
    _id: string;
    projectId: string;
    title: string;
    description?: string;
    status: "todo" | "in-progress" | "done";
    priority: "low" | "medium" | "high";
    assignedTo?: string;
    dueDate?: string;
  }) => void;
};

export default function AddTaskModal({
  projectId,
  projectMembers = [],
  isOpen,
  onClose,
  onCreated,
}: AddTaskModalProps) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState<"todo" | "in-progress" | "done">("todo");
  const [priority,    setPriority]    = useState<"low" | "medium" | "high">("medium");
  const [assignedTo,  setAssignedTo]  = useState("");
  const [dueDate,     setDueDate]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,       setError]       = useState("");

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title:       title.trim(),
          description: description.trim(),
          status,
          priority,
          assignedTo:  assignedTo.trim() || null,
          dueDate:     dueDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      onCreated(data);

      // Reset form
      setTitle(""); setDescription(""); setStatus("todo");
      setPriority("medium"); setAssignedTo(""); setDueDate("");
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Add Task</h2>
            <p className="mt-1 text-sm text-zinc-500">Create a new task for this project</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">

          {/* Title */}
          <div>
            <label htmlFor="task-title" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-status" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              >
                <option value="todo" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">To Do</option>
                <option value="in-progress" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">In Progress</option>
                <option value="done" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              >
                <option value="low" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Low</option>
                <option value="medium" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Medium</option>
                <option value="high" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">High</option>
              </select>
            </div>
          </div>

          {/* Assigned to + Due date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-assigned" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Assigned To (Project Member)
              </label>
              <select
                id="task-assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              >
                <option value="">-- Unassigned --</option>
                {projectMembers.map((m) => (
                  <option key={m._id} value={m._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              {projectMembers.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  No members currently enrolled in this project.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="task-due-date" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
