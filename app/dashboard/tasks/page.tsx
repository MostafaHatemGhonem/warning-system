"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import TaskKPIs from "./components/task-kpis";
import TaskFilters from "./components/task-filters";
import TaskKanban, { TaskItem } from "./components/task-kanban";
import TaskTable from "./components/task-table";
import TaskModal from "./components/task-modal";
import { getDueDateStatus } from "./lib/date-helpers";

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
  isActive: boolean;
};

type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Fetch all initial data
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [tasksRes, projectsRes, membersRes, meRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/projects"),
        fetch("/api/members"),
        fetch("/api/auth/me"),
      ]);

      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        if (Array.isArray(tData)) setTasks(tData);
      } else {
        const err = await tasksRes.json();
        throw new Error(err.error || "Failed to load tasks");
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        if (Array.isArray(pData)) setProjects(pData);
      }

      if (membersRes.ok) {
        const mData = await membersRes.json();
        const rawMembers = Array.isArray(mData) ? mData : Array.isArray(mData?.data) ? mData.data : [];
        setMembers(rawMembers.filter((m: Member) => m.isActive !== false));
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.member) {
          setCurrentUser(meData.member);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load workspace data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Quick Status Transition (No drag-and-drop, clean state mutation)
  const handleStatusChange = async (task: TaskItem, newStatus: "todo" | "in-progress" | "done") => {
    if (task.status === newStatus) return;

    try {
      setIsUpdatingId(task._id);

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t))
      );

      // Call API - note: we only send status, not touching dueDate
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update task status");
      }

      showToast(`Task moved to ${newStatus === "in-progress" ? "In Progress" : newStatus === "done" ? "Completed" : "To Do"}`);
      // Refresh to ensure all relations and audit entries are synced
      fetchData(true);
    } catch (err: any) {
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: task.status } : t))
      );
      setError(err.message || "Could not change status");
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Handle Task Deletion
  const confirmDeleteTask = async () => {
    if (!deletingTask) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/tasks/${deletingTask._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t._id !== deletingTask._id));
      showToast("Task deleted successfully.");
      setDeletingTask(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query) || false;
        const projectName =
          typeof task.projectId === "object" ? task.projectId.name.toLowerCase() : "";
        const projectMatch = projectName.includes(query);
        const assigneeName =
          typeof task.assignedTo === "object" && task.assignedTo
            ? task.assignedTo.name.toLowerCase()
            : "";
        const assigneeMatch = assigneeName.includes(query);

        if (!titleMatch && !descMatch && !projectMatch && !assigneeMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // 3. Priority Filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // 4. Project Filter
      if (projectFilter !== "all") {
        const pId = typeof task.projectId === "object" ? task.projectId._id : task.projectId;
        if (pId !== projectFilter) return false;
      }

      // 5. Assignee Filter
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned") {
          if (task.assignedTo) return false;
        } else if (assigneeFilter === "me") {
          if (!currentUser) return false;
          const aId =
            typeof task.assignedTo === "object" && task.assignedTo
              ? task.assignedTo._id
              : task.assignedTo;
          if (aId !== currentUser._id) return false;
        } else {
          const aId =
            typeof task.assignedTo === "object" && task.assignedTo
              ? task.assignedTo._id
              : task.assignedTo;
          if (aId !== assigneeFilter) return false;
        }
      }

      // 6. Overdue Only Filter (Strict Rule: status !== 'done' && dueDate < today)
      if (onlyOverdue) {
        const dueInfo = getDueDateStatus(task.dueDate, task.status);
        if (!dueInfo.isOverdue) return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, assigneeFilter, onlyOverdue, currentUser]);

  // Calculate KPIs with Strict Overdue Logic
  const kpiStats = useMemo(() => {
    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;

    tasks.forEach((t) => {
      if (t.status === "todo") todoCount++;
      else if (t.status === "in-progress") inProgressCount++;
      else if (t.status === "done") doneCount++;

      const dueInfo = getDueDateStatus(t.dueDate, t.status);
      if (dueInfo.isOverdue) overdueCount++;
      if (dueInfo.isDueToday) dueTodayCount++;
    });

    return {
      totalTasks: tasks.length,
      todoCount,
      inProgressCount,
      doneCount,
      overdueCount,
      dueTodayCount,
    };
  }, [tasks]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter !== "all" ||
      priorityFilter !== "all" ||
      projectFilter !== "all" ||
      assigneeFilter !== "all" ||
      onlyOverdue
  );

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setAssigneeFilter("all");
    setOnlyOverdue(false);
  };

  return (
    <DashboardShell>
      <div className="space-y-6 pb-12">
        
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
                Tasks Workspace
              </h1>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {tasks.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Manage deliverables, track team assignments, and enforce deadline governance.
            </p>
          </div>

          {/* Quick Refresh Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Refresh Tasks"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Feedback Messages ────────────────────────────────────────────── */}
        {successToast && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── KPI Ribbon ───────────────────────────────────────────────────── */}
        <TaskKPIs
          totalTasks={kpiStats.totalTasks}
          todoCount={kpiStats.todoCount}
          inProgressCount={kpiStats.inProgressCount}
          doneCount={kpiStats.doneCount}
          overdueCount={kpiStats.overdueCount}
          dueTodayCount={kpiStats.dueTodayCount}
          onFilterStatus={(st) => {
            setStatusFilter(st);
            setOnlyOverdue(false);
          }}
          onFilterOverdue={() => {
            setOnlyOverdue((prev) => !prev);
            setStatusFilter("all");
          }}
        />

        {/* ── Filters & Search ─────────────────────────────────────────────── */}
        <TaskFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          projectFilter={projectFilter}
          onProjectChange={setProjectFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          onlyOverdue={onlyOverdue}
          onOnlyOverdueChange={setOnlyOverdue}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          projects={projects}
          members={members}
          currentUserId={currentUser?._id}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* ── Tasks Content (Board or List) ────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            <p className="mt-3 text-xs font-medium text-zinc-400">Loading tasks and project data...</p>
          </div>
        ) : viewMode === "kanban" ? (
          <TaskKanban
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={(task) => setDeletingTask(task)}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            isUpdatingId={isUpdatingId}
          />
        ) : (
          <TaskTable
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={(task) => setDeletingTask(task)}
            onResetFilters={handleResetFilters}
            isUpdatingId={isUpdatingId}
          />
        )}

        {/* ── Create / Edit Task Modal ─────────────────────────────────────── */}
        {(isCreateModalOpen || editingTask) && (
          <TaskModal
            task={editingTask}
            projects={projects}
            members={members}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingTask(null);
            }}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              setEditingTask(null);
              showToast(editingTask ? "Task updated successfully." : "Task created successfully.");
              fetchData(true);
            }}
          />
        )}

        {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
        {deletingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-zinc-950 dark:text-white">
                Delete Task?
              </h3>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-200">"{deletingTask.title}"</strong>? This action is logged in the audit system and cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingTask(null)}
                  disabled={isDeleting}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTask}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
