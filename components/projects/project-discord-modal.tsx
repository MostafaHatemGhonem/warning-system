"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, X, Check, Sparkles } from "lucide-react";
import type { Project } from "@/types/project";

type ProjectDiscordModalProps = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedProject: Project) => void;
};

export default function ProjectDiscordModal({
  project,
  isOpen,
  onClose,
  onUpdated,
}: ProjectDiscordModalProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleTest() {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);

      const targetId = project._id || project.id;
      const res = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetId,
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      setTestResult({
        success: res.ok && json.success,
        message: json.message || (res.ok ? "Test notification delivered!" : "Failed to test webhook."),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to reach test endpoint.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(remove = false) {
    try {
      setIsSubmitting(true);
      setError(null);

      const targetId = project._id || project.id;
      const payload: Record<string, any> = {
        discordWebhookUrl: remove ? null : webhookUrl.trim(),
      };

      const res = await fetch(`/api/projects/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update webhook settings");
      }

      onUpdated(data);
      setIsEditing(false);
      setWebhookUrl("");
      setTestResult(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update webhook.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Discord Webhook Integration
              </h2>
              <p className="text-xs text-zinc-500">
                Project: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{project.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <p className="leading-relaxed">
              When configured, any new tasks created in this project will automatically trigger rich ClickUp-style notification cards in your designated Discord channel.
            </p>
          </div>

          {/* Current Status */}
          {project.hasDiscordWebhook && !isEditing ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Active Webhook URL
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 break-all">
                {project.maskedDiscordWebhook || "•••••••••••••••••••• (Active)"}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-900/60 dark:bg-zinc-900 dark:text-indigo-400 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setTestResult(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Change URL
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="discord-webhook-input"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Discord Webhook URL
              </label>
              <input
                id="discord-webhook-input"
                type="url"
                placeholder="https://discord.com/api/webhooks/1234567890/..."
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  setTestResult(null);
                }}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-zinc-400">
                To create a webhook: In Discord, open your Channel Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.
              </p>

              {webhookUrl.trim() && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-50 transition"
                >
                  {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test This Webhook First"}
                </button>
              )}
            </div>
          )}

          {/* Test Feedback */}
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

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          {(!project.hasDiscordWebhook || isEditing) && (
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting || !webhookUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save Webhook"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
