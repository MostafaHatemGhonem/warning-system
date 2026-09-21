"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import type { Project, ProjectMember, ProjectRole } from "@/types/project";

type ProjectTeamRosterProps = {
  project: Project;
  onOpenAddMember: () => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
  removingMemberId: string | null;
};

const PROJECT_ROLE_BADGES: Record<ProjectRole, { label: string; color: string }> = {
  "Project Lead": {
    label: "Project Lead (قائد المشروع)",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  "Core Contributor": {
    label: "Core Contributor (مساهم رئيسي)",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  Specialist: {
    label: "Specialist (أخصائي / خبير)",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  },
  Reviewer: {
    label: "Reviewer (مراجع جودة)",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  Observer: {
    label: "Observer (متابع)",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export default function ProjectTeamRoster({
  project,
  onOpenAddMember,
  onRemoveMember,
  removingMemberId,
}: ProjectTeamRosterProps) {
  const teamMembers = (project.teamMembers || []) as ProjectMember[];

  const leadIdStr =
    typeof project.leadId === "object" && project.leadId?._id
      ? project.leadId._id.toString()
      : typeof project.leadId === "string"
      ? project.leadId
      : "";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Section Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Project Team Roster (سجل عضوية فريق المشروع)
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {teamMembers.length} Active Member{teamMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Real membership governance: roles, join dates, and project contribution privileges.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddMember}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <UserPlus size={15} />
          Add Team Member
        </button>
      </div>

      {/* Roster Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const isLead =
            (leadIdStr && leadIdStr === member._id) || project.lead === member.name;

          const projRole: ProjectRole =
            member.projectRole || (isLead ? "Project Lead" : "Core Contributor");
          const roleBadge = PROJECT_ROLE_BADGES[projRole] || PROJECT_ROLE_BADGES["Core Contributor"];

          const joinedDateStr = member.joinedAt
            ? new Date(member.joinedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Project Inception";

          return (
            <div
              key={member._id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 transition hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60"
            >
              <div>
                {/* Top Row: Avatar + Name + Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {(member.name || "M").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-950 dark:text-white">
                          {member.name}
                        </p>
                        {isLead && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            <ShieldCheck className="h-3 w-3" />
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                        {member.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 shadow-xs dark:bg-zinc-800 dark:text-zinc-300">
                    {member.role}
                  </span>
                </div>

                {/* Project Role Badge & Enrolled Date */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-zinc-500">Project Role:</span>
                    <span className={`rounded-md px-2 py-0.5 font-bold ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-zinc-400" />
                      Joined:
                    </span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {joinedDateStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-800/80">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} />
                  Active in Team
                </span>

                {!isLead && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member._id, member.name)}
                    disabled={removingMemberId === member._id}
                    title="Remove from project"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
