"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  FolderKanban,
  Loader2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { getTodayString, getPresetDateString } from "../lib/date-helpers";

type Project = {
  _id: string;
  name: string;
  leadId?: any;
  teamMembers?: any[];
};

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
};

export type TaskData = {
  _id?: string;
  projectId: string | { _id: string; name: string };
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo?: string | { _id: string; name: string; email: string; role: string; avatar?: string } | null;
  dueDate?: string | null;
};

type TaskModalProps = {
  task?: TaskData | null; // null for create, object for edit
  projects: Project[];
  members: Member[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function TaskModal({
  task,
  projects,
  members,
  onClose,
  onSuccess,
}: TaskModalProps) {
  const isEdit = Boolean(task && task._id);
  const todayStr = getTodayString();

  // Extract initial values
  const initialProjectId = task
    ? typeof task.projectId === "object"
      ? task.projectId._id
      : task.projectId
    : projects[0]?._id || "";

  const initialAssignedTo = task
    ? typeof task.assignedTo === "object" && task.assignedTo
      ? task.assignedTo._id
      : typeof task.assignedTo === "string"
      ? task.assignedTo
      : ""
    : "";

  const initialDueDate = task?.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  const [projectId, setProjectId] = useState(initialProjectId);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done">(task?.status || "todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority || "medium");
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [decisionReason, setDecisionReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute enrolled members strictly for the selected project
  const projectMembers = useMemo(() => {
    if (!projectId) return [];
    const selectedProj = projects.find((p) => p._id === projectId);
    if (!selectedProj) return [];

    const enrolledList: Member[] = [];
    const enrolledIds = new Set<string>();

    // 1. Check teamMembers
    if (Array.isArray(selectedProj.teamMembers)) {
      for (const tm of selectedProj.teamMembers) {
        if (typeof tm === "object" && tm && tm._id) {
          enrolledList.push(tm as Member);
          enrolledIds.add(tm._id);
        } else if (typeof tm === "string") {
          const found = members.find((m) => m._id === tm);
          if (found && !enrolledIds.has(found._id)) {
            enrolledList.push(found);
            enrolledIds.add(found._id);
          }
        }
      }
    }

    // 2. Check leadId if not already included
    if (selectedProj.leadId) {
      const leadIdStr =
        typeof selectedProj.leadId === "object" && selectedProj.leadId._id
          ? selectedProj.leadId._id
          : typeof selectedProj.leadId === "string"
          ? selectedProj.leadId
          : "";
      if (leadIdStr && !enrolledIds.has(leadIdStr)) {
        const foundLead = members.find((m) => m._id === leadIdStr);
        if (foundLead) {
          enrolledList.unshift(foundLead);
          enrolledIds.add(foundLead._id);
        }
      }
    }

    return enrolledList;
  }, [projectId, projects, members]);

  // Reset assignee if not enrolled in the newly selected project
  useEffect(() => {
    if (assignedTo && projectMembers.length > 0) {
      const isStillEnrolled = projectMembers.some((m) => m._id === assignedTo);
      if (!isStillEnrolled) {
        setAssignedTo("");
      }
    }
  }, [projectId, projectMembers, assignedTo]);

  // Check if existing task date was in the past
  const existingWasPast = isEdit && initialDueDate && initialDueDate < todayStr;

  function applyPreset(preset: "today" | "tomorrow" | "weekend" | "next_week" | "end_of_month") {
    const presetStr = getPresetDateString(preset);
    setDueDate(presetStr);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!projectId) {
      setError("Please select a project for this task.");
      return;
    }
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    // Client-side past date check (unless it's an edit without changing an existing date)
    if (dueDate) {
      const isDateChanged = dueDate !== initialDueDate;
      if ((!isEdit || isDateChanged) && dueDate < todayStr) {
        setError("Due date cannot be in the past. Please choose today or a future date.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        projectId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        decisionReason: decisionReason.trim() || undefined,
      };

      const url = isEdit ? `/api/tasks/${task?._id}` : "/api/tasks";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || "Failed to save task.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              {isEdit ? "Edit Task Details" : "Create New Task"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isEdit ? "Update assignments, deadlines, or status." : "Define assignment and delivery schedule."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          
          {/* Project & Assignee row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            
            {/* Project Selection */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                <FolderKanban className="h-3.5 w-3.5 text-zinc-400" />
                <span>Project <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Selection (Scoped to Project Members) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>Assignee (Project Member)</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={!projectId}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="">-- Unassigned --</option>
                {projectMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              {projectId && projectMembers.length === 0 && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                  No members enrolled in this project.
                </p>
              )}
            </div>

          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-700 dark:text-zinc-300">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audit policy compliance for Q3"
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block font-semibold text-zinc-700 dark:text-zinc-300">
              Description / Deliverables
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Provide context, acceptance criteria, or links..."
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-semibold text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-zinc-700 dark:text-zinc-300">
                Workflow Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Completed (Done)</option>
              </select>
            </div>
          </div>

          {/* ── SMART DUE DATE SECTION ────────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span>Due Date (Deadline)</span>
              </label>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Clear Date
                </button>
              )}
            </div>

            {existingWasPast && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Notice: This task currently has a past deadline ({initialDueDate}). You can keep it or pick an active deadline below.
              </div>
            )}

            {/* Date Input with min constraint */}
            <div className="mt-2">
              <input
                type="date"
                value={dueDate}
                min={existingWasPast ? undefined : todayStr}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">Quick Shortcuts:</span>
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("tomorrow")}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => applyPreset("weekend")}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Weekend
              </button>
              <button
                type="button"
                onClick={() => applyPreset("next_week")}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset("end_of_month")}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Month End
              </button>
            </div>
          </div>

          {/* Optional Reason / Audit Note */}
          <div>
            <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
              Audit Justification (Optional)
            </label>
            <input
              type="text"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="e.g. Adjusted deadline due to project milestone shift"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white shadow hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEdit ? "Save Task Changes" : "Create Task"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
