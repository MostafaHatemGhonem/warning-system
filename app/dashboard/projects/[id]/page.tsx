"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  UserPlus,
  UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import EditProjectModal from "@/components/projects/edit-project-modal";
import AddProjectMemberModal from "@/components/projects/add-project-member-modal";
import ProjectDiscordModal from "@/components/projects/project-discord-modal";
import TasksSection from "@/components/tasks/tasks-section";
import ProjectTeamRoster from "@/components/projects/project-team-roster";
import ProjectMeetingsSection from "@/components/projects/project-meetings-section";
import ProjectBlockersSection from "@/components/projects/project-blockers-section";
import type { Project, ProjectMember } from "@/types/project";

function getStatusVariant(status: string) {
  switch (status) {
    case "Active":    return "success" as const;
    case "Completed": return "info" as const;
    case "Planning":  return "warning" as const;
    default:          return "neutral" as const;
  }
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </DashboardShell>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ProjectDetailsPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [project,    setProject]    = useState<Project | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDiscordOpen, setIsDiscordOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/projects/${id}`);
        if (res.status === 404) {
          setError("not_found");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProject(data);
      } catch {
        setError("fetch_failed");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) fetchProject();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard/projects");
    } catch {
      alert("Failed to delete project. Please try again.");
      setIsDeleting(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove "${memberName}" from this project team?`)) return;
    try {
      setRemovingMemberId(memberId);
      const res = await fetch(`/api/projects/${id}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove member");
      setProject(data);
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  }

  // ── States ──
  if (isLoading) return <LoadingSkeleton />;

  if (error === "not_found" || !project) {
    return (
      <DashboardShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Project not found
          </h1>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
          >
            Back to Projects
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (error === "fetch_failed") {
    return (
      <DashboardShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Failed to load project
          </h1>
          <button
            onClick={() => router.refresh()}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    );
  }

  // ── Normal view ──
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="mt-1 rounded-xl border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-sm text-zinc-500">Project Details</p>
              <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-1 text-sm text-zinc-500">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDiscordOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100/70 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              title="Configure Discord Webhook"
            >
              <span className="text-base">💬</span>
              <span>Discord</span>
              {project.hasDiscordWebhook ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="rounded bg-indigo-200/60 px-1 py-0.2 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Setup
                </span>
              )}
            </button>

            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Edit size={16} />
              Edit
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              <Trash2 size={16} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              <CheckCircle2 size={17} />
              Status
            </div>
            <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              <Clock3 size={17} />
              Progress
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {project.progress}%
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              <Users size={17} />
              Members
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {project.members}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              <CalendarDays size={17} />
              Due Date
            </div>
            <p className="text-lg font-bold text-zinc-950 dark:text-white">
              {project.dueDate}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-950 dark:text-white">
              Project Progress
            </h2>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {project.progress}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-950 transition-all dark:bg-white"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </section>

        {/* Project Information */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-5 text-lg font-semibold text-zinc-950 dark:text-white">
            Project Information
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-500">Project Lead</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white dark:bg-zinc-700">
                  {(project.lead || "L").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-zinc-950 dark:text-white">
                    {project.lead}
                  </p>
                  {typeof project.leadId === "object" && project.leadId?.role && (
                    <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {project.leadId.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Number of Members</p>
              <p className="mt-1 font-medium text-zinc-950 dark:text-white">
                {project.members}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Project Status</p>
              <p className="mt-1 font-medium text-zinc-950 dark:text-white">
                {project.status}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">Deadline</p>
              <p className="mt-1 font-medium text-zinc-950 dark:text-white">
                {project.dueDate}
              </p>
            </div>

            {project.createdAt && (
              <div>
                <p className="text-sm text-zinc-500">Created</p>
                <p className="mt-1 font-medium text-zinc-950 dark:text-white">
                  {new Date(project.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Clause 14: Project Removal Governance */}
        <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 dark:border-rose-500/20 dark:bg-rose-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <UserX className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    Clause 14: Member Removal Governance (حوكمة الإزالة من المشروع)
                  </h3>
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    Committee Approval Only
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Under Infinity Explorers internal policy, Project Leads and Team Leaders cannot unilaterally remove members from a project.
                  Removal requires documented warnings and a formal referral to an impartial 3+ member Governance Committee.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/dashboard/warnings?scope=project&search=${encodeURIComponent(project.name)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-zinc-800"
              >
                <AlertTriangle className="h-4 w-4" />
                View Warnings & Removal Referrals
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Project Team Roster */}
        <ProjectTeamRoster
          project={project}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onRemoveMember={handleRemoveMember}
          removingMemberId={removingMemberId}
        />

        {/* Tasks Section */}
        <TasksSection
          projectId={project._id ?? project.id ?? ""}
          projectMembers={(project.teamMembers as any) || []}
        />

        {/* Project Blockers & Delay Reporting Section */}
        <ProjectBlockersSection
          projectId={project._id ?? project.id ?? ""}
          projectName={project.name}
          onProjectUpdated={async () => {
            const res = await fetch(`/api/projects/${id}`);
            if (res.ok) {
              const data = await res.json();
              setProject(data);
            }
          }}
        />

        {/* Project Meetings & Attendance Section */}
        <ProjectMeetingsSection
          projectId={project._id ?? project.id ?? ""}
          projectName={project.name}
        />

      </div>

      {project && (
        <>
          <EditProjectModal
            project={project}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onUpdated={(updated) => {
              setProject(updated);
              setIsEditOpen(false);
            }}
          />

          <AddProjectMemberModal
            projectId={project._id ?? project.id ?? ""}
            currentTeamMemberIds={(project.teamMembers || []).map((m: any) =>
              typeof m === "object" && m._id ? m._id : m,
            )}
            isOpen={isAddMemberOpen}
            onClose={() => setIsAddMemberOpen(false)}
            onMemberAdded={(updated) => {
              setProject(updated);
            }}
          />

          <ProjectDiscordModal
            project={project}
            isOpen={isDiscordOpen}
            onClose={() => setIsDiscordOpen(false)}
            onUpdated={(updated) => {
              setProject(updated);
            }}
          />
        </>
      )}
    </DashboardShell>
  );
}
