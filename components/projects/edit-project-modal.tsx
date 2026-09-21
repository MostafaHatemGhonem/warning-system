"use client";

import { useEffect, useState } from "react";
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

type EditProjectModalProps = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (project: Project) => void;
};

export default function EditProjectModal({
  project,
  isOpen,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Planning" as Project["status"],
    progress: 0,
    lead: "",
    leadId: "",
    members: 1,
    dueDate: "",
    decisionReason: "",
  });

  const [eligibleLeaders, setEligibleLeaders] = useState<MemberOption[]>([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [removeDiscordWebhook, setRemoveDiscordWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch eligible leaders
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadLeaders() {
      try {
        setIsLoadingLeaders(true);
        const res = await fetch("/api/members");
        if (!res.ok) throw new Error("Failed to load members list");
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        if (isMounted) {
          const filtered = rawList.filter(
            (m: MemberOption) =>
              m.isActive !== false && ELIGIBLE_ROLES.includes(m.role),
          );
          setEligibleLeaders(filtered);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load eligible leaders:", err);
          setError("Could not load eligible Team Leaders.");
        }
      } finally {
        if (isMounted) setIsLoadingLeaders(false);
      }
    }

    loadLeaders();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sync form with project data whenever modal opens or project changes
  useEffect(() => {
    if (!project) return;

    const initialLeadId =
      typeof project.leadId === "object" && project.leadId
        ? project.leadId._id
        : typeof project.leadId === "string"
        ? project.leadId
        : "";

    setFormData({
      name: project.name ?? "",
      description: project.description ?? "",
      status: project.status ?? "Planning",
      progress: project.progress ?? 0,
      lead: project.lead ?? "",
      leadId: initialLeadId,
      members: project.members ?? 1,
      dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
      decisionReason: "",
    });
    setDiscordWebhookUrl("");
    setIsEditingWebhook(false);
    setRemoveDiscordWebhook(false);
    setTestWebhookResult(null);
    setError(null);
  }, [project, isOpen]);

  // If eligible leaders load and leadId is empty, try to match by lead name
  useEffect(() => {
    if (eligibleLeaders.length > 0 && !formData.leadId && formData.lead) {
      const match = eligibleLeaders.find(
        (m) => m.name.toLowerCase() === formData.lead.toLowerCase(),
      );
      if (match) {
        setFormData((prev) => ({ ...prev, leadId: match._id }));
      }
    }
  }, [eligibleLeaders, formData.lead, formData.leadId]);

  if (!isOpen) return null;

  function handleChange(field: keyof typeof formData, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleLeaderChange(leaderId: string) {
    const leaderObj = eligibleLeaders.find((m) => m._id === leaderId);
    setFormData((prev) => ({
      ...prev,
      leadId: leaderId,
      lead: leaderObj ? leaderObj.name : prev.lead,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim() || !formData.leadId || !formData.dueDate) {
      setError("Please specify project name, select a Team Leader, and set a due date.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Record<string, any> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        progress: Number(formData.progress),
        lead: formData.lead,
        leadId: formData.leadId,
        members: Math.max(1, Number(formData.members) || 1),
        dueDate: formData.dueDate,
        decisionReason: formData.decisionReason.trim() || undefined,
      };

      if (removeDiscordWebhook) {
        payload.discordWebhookUrl = null;
      } else if (discordWebhookUrl.trim()) {
        payload.discordWebhookUrl = discordWebhookUrl.trim();
      }

      const targetId = project._id || project.id;
      const res = await fetch(`/api/projects/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update project");
      }

      onUpdated(data);
      onClose();
    } catch (err) {
      console.error("Update project error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while updating the project");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestWebhook() {
    try {
      setIsTestingWebhook(true);
      setTestWebhookResult(null);

      const targetId = project._id || project.id;
      const res = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetId,
          webhookUrl: discordWebhookUrl.trim() || undefined,
        }),
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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Edit Project</h2>
            <p className="mt-1 text-xs text-zinc-500">Update project details, assign team leader, and adjust deliverables.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          {/* Team Leader Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-lead"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Team Leader (Project Lead)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-zinc-400">
                Super Admin, Admin, Team Leader
              </span>
            </div>

            {isLoadingLeaders ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading eligible leaders...</span>
              </div>
            ) : eligibleLeaders.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                No eligible members found with role Super Admin, Admin, or Team Leader.
              </div>
            ) : (
              <div className="relative">
                <select
                  id="edit-lead"
                  value={formData.leadId}
                  onChange={(e) => handleLeaderChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  required
                >
                  <option value="" disabled>Select Team Leader...</option>
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Status */}
            <div>
              <label htmlFor="edit-status" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as Project["status"])}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Progress */}
            <div>
              <label htmlFor="edit-progress" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Progress % ({formData.progress}%)
              </label>
              <input
                id="edit-progress"
                type="number"
                min={0}
                max={100}
                value={formData.progress}
                onChange={(e) => handleChange("progress", Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {/* Members Count */}
            <div>
              <label htmlFor="edit-members" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Team Members
              </label>
              <input
                id="edit-members"
                type="number"
                min={1}
                max={50}
                value={formData.members}
                onChange={(e) => handleChange("members", Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Due Date & Decision Reason */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-due-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Target Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange("dueDate", e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="edit-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Decision / Update Reason (Optional)
              </label>
              <input
                id="edit-reason"
                type="text"
                placeholder="e.g. Assigned new team leader, extended deadline"
                value={formData.decisionReason}
                onChange={(e) => handleChange("decisionReason", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Discord Webhook Integration */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="edit-discord-webhook"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                <span className="text-indigo-500 font-normal text-sm">💬</span> Discord Webhook Integration
              </label>

              {project.hasDiscordWebhook && !removeDiscordWebhook && !isEditingWebhook ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-50 transition"
                  >
                    {isTestingWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingWebhook(true)}
                    className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveDiscordWebhook(true)}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 transition"
                  >
                    Disconnect
                  </button>
                </div>
              ) : discordWebhookUrl.trim() || isEditingWebhook || removeDiscordWebhook ? (
                <div className="flex items-center gap-2">
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
                  {project.hasDiscordWebhook && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingWebhook(false);
                        setRemoveDiscordWebhook(false);
                        setDiscordWebhookUrl("");
                      }}
                      className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {project.hasDiscordWebhook && !removeDiscordWebhook && !isEditingWebhook ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {project.maskedDiscordWebhook || "•••••••••••••••• (Active)"}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Connected
                </span>
              </div>
            ) : removeDiscordWebhook ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 flex items-center justify-between">
                <span>Webhook will be disconnected upon saving.</span>
                <button
                  type="button"
                  onClick={() => setRemoveDiscordWebhook(false)}
                  className="font-semibold underline hover:no-underline"
                >
                  Undo
                </button>
              </div>
            ) : (
              <div>
                <input
                  id="edit-discord-webhook"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={(e) => {
                    setDiscordWebhookUrl(e.target.value);
                    setTestWebhookResult(null);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  New tasks in this project will trigger real-time ClickUp-style Discord notifications.
                </p>
              </div>
            )}

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

          {/* Error */}
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
                  <span>Saving...</span>
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
