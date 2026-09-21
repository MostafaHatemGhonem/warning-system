"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck, UserCheck, X } from "lucide-react";

import type { Project } from "@/types/project";

const ELIGIBLE_ROLES = ["Super Admin", "Admin", "Team Leader"];

type MemberOption = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
};

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  // Receives the full document returned by POST /api/projects
  onCreate: (project: Project) => void;
};

export function CreateProjectModal({
  open,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{ success: boolean; message: string } | null>(null);

  const [currentUser, setCurrentUser] = useState<MemberOption | null>(null);
  const [eligibleLeaders, setEligibleLeaders] = useState<MemberOption[]>([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch session and eligible leaders whenever modal opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function loadData() {
      try {
        setIsLoadingLeaders(true);
        setError(null);

        const [membersRes, meRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/auth/me"),
        ]);

        if (!membersRes.ok) throw new Error("Failed to load members list");
        const json = await membersRes.json();
        const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

        let currentMember: MemberOption | null = null;
        if (meRes.ok) {
          const meJson = await meRes.json();
          currentMember = meJson?.data || meJson?.member || null;
        }

        if (!isMounted) return;

        setCurrentUser(currentMember);

        // Role-based filtering for Project Lead:
        // 1. Team Leader: automatically themselves only
        // 2. Admin: Admin or Team Leader only (NO Super Admin)
        // 3. Super Admin: Super Admin, Admin, or Team Leader
        if (currentMember?.role === "Team Leader") {
          setSelectedLeaderId(currentMember._id);
          setEligibleLeaders([currentMember]);
        } else if (currentMember?.role === "Admin") {
          const filtered = rawList.filter(
            (m: MemberOption) =>
              m.isActive !== false && (m.role === "Admin" || m.role === "Team Leader"),
          );
          setEligibleLeaders(filtered);
          if (filtered.length > 0 && !selectedLeaderId) {
            setSelectedLeaderId(filtered[0]._id);
          }
        } else {
          // Super Admin or default
          const filtered = rawList.filter(
            (m: MemberOption) =>
              m.isActive !== false && ELIGIBLE_ROLES.includes(m.role),
          );
          setEligibleLeaders(filtered);
          if (filtered.length > 0 && !selectedLeaderId) {
            setSelectedLeaderId(filtered[0]._id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load leaders or auth:", err);
          setError("Could not load eligible Team Leaders. Please check connection.");
        }
      } finally {
        if (isMounted) setIsLoadingLeaders(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isTeamLeader = currentUser?.role === "Team Leader";
    const targetLeadId = isTeamLeader ? currentUser?._id : selectedLeaderId;

    if (!name.trim() || !targetLeadId || !dueDate) {
      setError("Please fill in project name, select a Team Leader, and choose a deadline.");
      return;
    }

    const leaderObj = isTeamLeader
      ? currentUser
      : eligibleLeaders.find((m) => m._id === targetLeadId);

    if (!leaderObj) {
      setError("Please select a valid Team Leader from the eligible list.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          lead: leaderObj.name,
          leadId: leaderObj._id,
          dueDate,
          status: "Planning",
          progress: 0,
          workspaceId: "infinity-explorers",
          discordWebhookUrl: discordWebhookUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create project");
      }

      // Notify parent with the saved project data
      onCreate(data);

      // Reset form
      setName("");
      setDescription("");
      setSelectedLeaderId("");
      setDueDate("");
      setDiscordWebhookUrl("");
      setTestWebhookResult(null);
      onClose();
    } catch (err) {
      console.error("Create project error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred while creating the project",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestWebhook() {
    if (!discordWebhookUrl.trim()) return;

    try {
      setIsTestingWebhook(true);
      setTestWebhookResult(null);

      const res = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl.trim() }),
      });

      const json = await res.json();
      setTestWebhookResult({
        success: res.ok && json.success,
        message: json.message || (res.ok ? "Webhook connected!" : "Failed to test webhook."),
      });
    } catch (err: any) {
      setTestWebhookResult({
        success: false,
        message: err?.message || "Failed to contact test endpoint.",
      });
    } finally {
      setIsTestingWebhook(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Create New Project
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Add a new deliverable and assign a verified Team Leader.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Project Name <span className="text-rose-500">*</span>
            </label>

            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Core System Hardening, Brand Identity"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Description / Objectives
            </label>

            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief summary of scope, deliverables, or project goals"
              rows={2}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Team Leader Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="project-lead"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Project Lead</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-zinc-400">
                {currentUser?.role === "Team Leader"
                  ? "Assigned to Creator"
                  : currentUser?.role === "Admin"
                  ? "Admin & Team Leader Only"
                  : "Super Admin, Admin & Team Leader"}
              </span>
            </div>

            {currentUser?.role === "Team Leader" ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
                      {(currentUser.name || "TL").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">
                        {currentUser.name}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {currentUser.email || "Team Leader"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    You (Project Lead)
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  As a Team Leader, you are automatically designated as the Project Lead for projects you create.
                </p>
              </div>
            ) : isLoadingLeaders ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading eligible leaders...</span>
              </div>
            ) : eligibleLeaders.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                No eligible members found for Project Lead.
              </div>
            ) : (
              <div className="relative">
                <select
                  id="project-lead"
                  value={selectedLeaderId}
                  onChange={(e) => setSelectedLeaderId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
                  required
                >
                  <option value="" disabled>Select Project Lead...</option>
                  {eligibleLeaders.map((m) => (
                    <option
                      key={m._id}
                      value={m._id}
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      {m.name} — ({m.role})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
            )}
            <p className="mt-1 text-[11px] text-zinc-400">
              {currentUser?.role === "Admin"
                ? "Admins can assign Admin or Team Leader members to lead this project."
                : currentUser?.role === "Team Leader"
                ? "Team members can be added after creating the project in the project details page."
                : "Super Admins can assign any eligible lead role."}
            </p>
          </div>

          {/* Target Deadline */}
          <div>
            <label
              htmlFor="project-due-date"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Target Deadline <span className="text-rose-500">*</span>
            </label>

            <input
              id="project-due-date"
              type="date"
              min={todayStr}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              required
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              You will be able to enroll team members and assign project tasks on the project details page.
            </p>
          </div>

          {/* Discord Webhook Integration */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="project-discord-webhook"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                <span className="text-indigo-500 font-normal text-sm">💬</span> Discord Webhook <span className="text-[10px] lowercase font-normal text-zinc-400">(optional)</span>
              </label>
              {discordWebhookUrl.trim() && (
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-50 transition"
                >
                  {isTestingWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test Webhook"}
                </button>
              )}
            </div>
            <input
              id="project-discord-webhook"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordWebhookUrl}
              onChange={(event) => {
                setDiscordWebhookUrl(event.target.value);
                setTestWebhookResult(null);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              New tasks added to this project will be automatically posted to Discord as rich ClickUp-style cards.
            </p>
            {testWebhookResult && (
              <div
                className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                  testWebhookResult.success
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
                }`}
              >
                {testWebhookResult.message}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isLoadingLeaders}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
