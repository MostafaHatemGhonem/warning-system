"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Edit, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import EditProjectModal from "@/components/projects/edit-project-modal";
import { projects as mockProjects } from "@/data/mock-data";
import type { Project, ProjectStatus } from "@/types/project";

type FilterStatus = "All" | ProjectStatus;

function getStatusVariant(status: string) {
  switch (status) {
    case "Active":    return "success" as const;
    case "Completed": return "info" as const;
    case "Planning":  return "warning" as const;
    default:          return "neutral" as const;
  }
}

// ─── Row actions dropdown ────────────────────────────────────────────────────
function ActionsMenu({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Actions for ${project.name}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(project); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Edit size={15} />
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(project); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch]                         = useState("");
  const [status, setStatus]                         = useState<FilterStatus>("All");
  const [isCreateModalOpen, setIsCreateModalOpen]   = useState(false);
  const [projectList, setProjectList]               = useState<Project[]>([]);
  const [isLoading, setIsLoading]                   = useState(true);
  const [error, setError]                           = useState<string | null>(null);
  const [editTarget, setEditTarget]                 = useState<Project | null>(null);
  const [deletingId, setDeletingId]                 = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole]       = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const [projRes, meRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/auth/me"),
        ]);

        if (!projRes.ok) throw new Error("Failed to fetch");
        const data = await projRes.json();
        setProjectList(
          data.map((p: Project & { _id?: string }) => ({ ...p, id: p._id ?? p.id })),
        );

        if (meRes.ok) {
          const meData = await meRes.json();
          const role = meData?.data?.role || meData?.member?.role || null;
          setCurrentUserRole(role);
        }
      } catch {
        setError("Could not connect to database. Showing local data.");
        setProjectList(mockProjects as Project[]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const canCreateProject = ["Super Admin", "Admin", "Team Leader"].includes(
    currentUserRole || "",
  );

  function handleCreateProject(savedProject: Project) {
    setProjectList((current) => [
      { ...savedProject, id: savedProject._id ?? savedProject.id ?? "" },
      ...current,
    ]);
  }

  async function handleDelete(project: Project) {
    const projectId = project._id ?? project.id;
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    setDeletingId(projectId ?? null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProjectList((current) => current.filter((p) => (p._id ?? p.id) !== projectId));
    } catch {
      alert("Failed to delete project. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleUpdated(updated: Project & { _id?: string }) {
    const updatedId = updated._id ?? updated.id;
    setProjectList((current) =>
      current.map((p) =>
        (p._id ?? p.id) === updatedId ? { ...updated, id: updatedId } : p,
      ),
    );
  }

  const filteredProjects = useMemo(() => {
    return projectList.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "All" || project.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [projectList, search, status]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-zinc-500">Manage your team projects</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950 dark:text-white">Projects</h1>
          </div>
          {canCreateProject && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Plus size={18} />
              New Project
            </button>
          )}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <Search size={18} className="text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            />
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full appearance-none rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm font-medium text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white sm:w-44"
            >
              <option value="All" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">All Statuses</option>
              <option value="Planning" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Planning</option>
              <option value="Active" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Active</option>
              <option value="Completed" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Completed</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            ⚠️ {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {isLoading ? (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-5">
                  <div className="h-4 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-2 w-24 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    <tr>
                      <th className="px-6 py-4 font-medium">Project</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Progress</th>
                      <th className="px-6 py-4 font-medium">Project Lead</th>
                      <th className="px-6 py-4 font-medium">Members</th>
                      <th className="px-6 py-4 font-medium">Due Date</th>
                      <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredProjects.map((project) => {
                      const projectId = project._id ?? project.id ?? "";
                      const isBeingDeleted = deletingId === projectId;
                      return (
                        <tr
                          key={project.id}
                          onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                          className={`cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${isBeingDeleted ? "opacity-50" : ""}`}
                        >
                          <td className="px-6 py-5">
                            <p className="font-semibold text-zinc-950 dark:text-white">{project.name}</p>
                            <p className="mt-1 max-w-xs text-xs text-zinc-500">{project.description}</p>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                          </td>
                          <td className="px-6 py-5">
                            <div className="w-28">
                              <p className="mb-2 text-xs text-zinc-500">{project.progress}%</p>
                              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                  className="h-2 rounded-full bg-zinc-950 dark:bg-white"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white dark:bg-zinc-700">
                                {(project.lead || "L").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-200">
                                  {project.lead}
                                </span>
                                {typeof project.leadId === "object" && project.leadId?.role && (
                                  <span className="text-[10px] text-zinc-400 capitalize">
                                    {project.leadId.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-zinc-600 dark:text-zinc-400">{project.members}</td>
                          <td className="px-6 py-5 text-zinc-600 dark:text-zinc-400">{project.dueDate}</td>
                          <td className="px-6 py-5">
                            {isBeingDeleted ? (
                              <span className="text-xs text-zinc-400">Deleting...</span>
                            ) : (
                              <ActionsMenu
                                project={project}
                                onEdit={(p) => setEditTarget(p)}
                                onDelete={handleDelete}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredProjects.length === 0 && (
                <div className="p-10 text-center">
                  <p className="font-medium text-zinc-950 dark:text-white">No projects found</p>
                  <p className="mt-1 text-sm text-zinc-500">Try changing your search or filter.</p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-sm text-zinc-500">
          {isLoading
            ? "Loading projects..."
            : `Showing ${filteredProjects.length} of ${projectList.length} projects`}
        </p>
      </div>

      {/* Create modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* Edit modal */}
      {editTarget && (
        <EditProjectModal
          project={editTarget as Parameters<typeof EditProjectModal>[0]["project"]}
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            handleUpdated(updated as Project & { _id?: string });
            setEditTarget(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
