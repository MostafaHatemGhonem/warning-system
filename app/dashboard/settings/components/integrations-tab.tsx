"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  FolderKanban,
  Globe,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlink,
} from "lucide-react";
import type { Project } from "@/types/project";

type IntegrationsTabProps = {
  member: {
    _id: string;
    name: string;
    role: string;
  };
};

export default function IntegrationsTab({ member }: IntegrationsTabProps) {
  const isSuperAdminOrAdmin = ["Super Admin", "Admin"].includes(member.role);

  const [globalData, setGlobalData] = useState<{
    hasGlobalWebhook: boolean;
    maskedWebhook: string | null;
    source: "database" | "env" | "none";
    updatedAt?: string | null;
  } | null>(null);

  const [webhookInput, setWebhookInput] = useState("");
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [isTestingGlobal, setIsTestingGlobal] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Quick project editing in tab
  const [activeEditingProject, setActiveEditingProject] = useState<Project | null>(null);
  const [projectWebhookInput, setProjectWebhookInput] = useState("");
  const [isSavingProjectWebhook, setIsSavingProjectWebhook] = useState(false);
  const [isTestingProjectWebhook, setIsTestingProjectWebhook] = useState(false);
  const [projectTestResult, setProjectTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load global webhook status
  async function loadGlobalIntegration() {
    try {
      setIsLoadingGlobal(true);
      const res = await fetch("/api/integrations/discord");
      const json = await res.json();
      if (json.success && json.data) {
        setGlobalData(json.data);
      }
    } catch (err) {
      console.error("Failed to load global integration:", err);
    } finally {
      setIsLoadingGlobal(false);
    }
  }

  // Load projects list
  async function loadProjects() {
    try {
      setIsLoadingProjects(true);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  useEffect(() => {
    loadGlobalIntegration();
    loadProjects();
  }, []);

  async function handleTestGlobal() {
    try {
      setIsTestingGlobal(true);
      setTestResult(null);

      const res = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      setTestResult({
        success: res.ok && json.success,
        message:
          json.message ||
          (res.ok ? "Test notification delivered to Discord!" : "Failed to test webhook."),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Error contacting test endpoint.",
      });
    } finally {
      setIsTestingGlobal(false);
    }
  }

  async function handleSaveGlobal(remove = false) {
    try {
      setIsSavingGlobal(true);
      setStatusMessage(null);

      const res = await fetch("/api/integrations/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: remove ? null : webhookInput.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update global webhook");
      }

      setGlobalData(json.data);
      setIsEditingGlobal(false);
      setWebhookInput("");
      setTestResult(null);
      setStatusMessage({
        type: "success",
        text: remove
          ? "Global Discord webhook disconnected."
          : "Global Discord webhook saved successfully.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to update global webhook.",
      });
    } finally {
      setIsSavingGlobal(false);
    }
  }

  async function handleSaveProjectWebhook(remove = false) {
    if (!activeEditingProject) return;

    try {
      setIsSavingProjectWebhook(true);
      const targetId = activeEditingProject._id || activeEditingProject.id;

      const res = await fetch(`/api/projects/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordWebhookUrl: remove ? null : projectWebhookInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update project webhook");
      }

      // Update project in local list
      setProjects((prev) =>
        prev.map((p) => ((p._id || p.id) === targetId ? data : p)),
      );

      setActiveEditingProject(null);
      setProjectWebhookInput("");
      setProjectTestResult(null);
    } catch (err: any) {
      alert(err?.message || "Failed to update project webhook");
    } finally {
      setIsSavingProjectWebhook(false);
    }
  }

  async function handleTestProjectWebhook() {
    if (!activeEditingProject) return;

    try {
      setIsTestingProjectWebhook(true);
      setProjectTestResult(null);

      const targetId = activeEditingProject._id || activeEditingProject.id;
      const res = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetId,
          webhookUrl: projectWebhookInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      setProjectTestResult({
        success: res.ok && json.success,
        message: json.message || (res.ok ? "Test card delivered!" : "Test failed."),
      });
    } catch (err: any) {
      setProjectTestResult({
        success: false,
        message: err?.message || "Failed to test.",
      });
    } finally {
      setIsTestingProjectWebhook(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Discord Webhook Integrations
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-2xl">
                Configure Discord Webhooks to automatically stream new tasks into your team’s Discord channels.
                Notifications are styled as interactive ClickUp-style cards with priority indicators, assignees, deadlines, and direct links.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              loadGlobalIntegration();
              loadProjects();
            }}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
          >
            <RefreshCw size={14} className={isLoadingGlobal || isLoadingProjects ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Fallback Webhook Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Organization Default Webhook (Global Fallback)
            </h3>
          </div>
          {globalData?.hasGlobalWebhook ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active ({globalData.source === "database" ? "UI Configured" : "Env Var"})
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              Not Configured
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          Any project that does not have a dedicated project webhook will automatically post task updates to this default channel.
        </p>

        {isLoadingGlobal ? (
          <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading integration status...
          </div>
        ) : globalData?.hasGlobalWebhook && !isEditingGlobal ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Configured Webhook URL
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Source: {globalData.source === "database" ? "Database" : ".env DISCORD_WEBHOOK_URL"}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 break-all">
              {globalData.maskedWebhook || "•••••••••••••••••••• (Protected)"}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestGlobal}
                disabled={isTestingGlobal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-900/60 dark:bg-zinc-900 dark:text-indigo-400 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {isTestingGlobal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Connection"}
              </button>
              {isSuperAdminOrAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingGlobal(true);
                      setTestResult(null);
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Change Webhook
                  </button>
                  {globalData.source === "database" && (
                    <button
                      type="button"
                      onClick={() => handleSaveGlobal(true)}
                      disabled={isSavingGlobal}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {isSavingGlobal ? "Disconnecting..." : "Disconnect"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : isSuperAdminOrAdmin ? (
          <div className="space-y-3 pt-2">
            <label
              htmlFor="global-webhook-input"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Add / Update Global Discord Webhook URL
            </label>
            <input
              id="global-webhook-input"
              type="url"
              placeholder="https://discord.com/api/webhooks/123456789/..."
              value={webhookInput}
              onChange={(e) => {
                setWebhookInput(e.target.value);
                setTestResult(null);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveGlobal(false)}
                disabled={isSavingGlobal || !webhookInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isSavingGlobal ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Global Webhook"
                )}
              </button>

              {webhookInput.trim() && (
                <button
                  type="button"
                  onClick={handleTestGlobal}
                  disabled={isTestingGlobal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
                >
                  {isTestingGlobal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test URL First"}
                </button>
              )}

              {isEditingGlobal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGlobal(false);
                    setWebhookInput("");
                    setTestResult(null);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">
            Only Administrators and Super Administrators can configure the organization-wide webhook.
          </p>
        )}

        {/* Global Feedback Messages */}
        {testResult && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${
              testResult.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            {testResult.message}
          </div>
        )}

        {statusMessage && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium transition ${
              statusMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Projects Webhook Directory */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Projects Discord Directory
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Manage Discord channels per project. You can route specific project notifications to dedicated Discord channels.
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-400">
            {projects.length} Total Projects
          </span>
        </div>

        {isLoadingProjects ? (
          <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
            No projects found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Discord Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {projects.map((proj) => {
                  const hasCustom = Boolean(proj.hasDiscordWebhook);

                  return (
                    <tr
                      key={proj._id || proj.id}
                      className="transition hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">
                        {proj.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {proj.lead}
                      </td>
                      <td className="px-4 py-3">
                        {hasCustom ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Custom Channel
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {proj.maskedDiscordWebhook}
                            </span>
                          </div>
                        ) : globalData?.hasGlobalWebhook ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                            Using Global Webhook
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveEditingProject(proj);
                            setProjectWebhookInput("");
                            setProjectTestResult(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                        >
                          {hasCustom ? "Manage" : "Add Webhook"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Modal to Edit Project Webhook from Tab */}
      {activeEditingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Configure Discord Webhook
                </h4>
                <p className="text-xs text-zinc-500">
                  Project: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{activeEditingProject.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditingProject(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {activeEditingProject.hasDiscordWebhook ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Current Webhook:
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Connected
                    </span>
                  </div>
                  <div className="font-mono text-xs text-zinc-600 dark:text-zinc-300 break-all">
                    {activeEditingProject.maskedDiscordWebhook}
                  </div>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="quick-webhook-input"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  {activeEditingProject.hasDiscordWebhook ? "Update Webhook URL" : "Enter Webhook URL"}
                </label>
                <input
                  id="quick-webhook-input"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={projectWebhookInput}
                  onChange={(e) => {
                    setProjectWebhookInput(e.target.value);
                    setProjectTestResult(null);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
                />
              </div>

              {projectTestResult && (
                <div
                  className={`rounded-xl border px-3.5 py-2 text-xs font-medium ${
                    projectTestResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                  }`}
                >
                  {projectTestResult.message}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestProjectWebhook}
                  disabled={isTestingProjectWebhook || (!projectWebhookInput.trim() && !activeEditingProject.hasDiscordWebhook)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
                >
                  {isTestingProjectWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Connection"}
                </button>

                {activeEditingProject.hasDiscordWebhook && (
                  <button
                    type="button"
                    onClick={() => handleSaveProjectWebhook(true)}
                    disabled={isSavingProjectWebhook}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-zinc-800 disabled:opacity-50 transition"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={() => setActiveEditingProject(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveProjectWebhook(false)}
                disabled={isSavingProjectWebhook || !projectWebhookInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isSavingProjectWebhook ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Webhook"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
