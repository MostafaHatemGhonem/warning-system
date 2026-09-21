"use client";

import { useState } from "react";
import {
  AlertOctagon,
  Calendar,
  Check,
  Clock3,
  Copy,
  FolderKanban,
  Hash,
  Info,
  Quote,
  Shield,
  User,
  X,
} from "lucide-react";
import { StateDiffViewer } from "./state-diff-viewer";

interface ActivityDetailsDrawerProps {
  log: any | null;
  onClose: () => void;
}

export function ActivityDetailsDrawer({
  log,
  onClose,
}: ActivityDetailsDrawerProps) {
  const [copiedRequestId, setCopiedRequestId] = useState(false);

  if (!log) return null;

  const isOverride = log.authorizationResult === "SUPER_ADMIN_OVERRIDE";

  const handleCopyRequestId = () => {
    navigator.clipboard.writeText(log.requestId || "");
    setCopiedRequestId(true);
    setTimeout(() => setCopiedRequestId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-zinc-950">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                AUDIT EVENT
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
            <h2 className="mt-1 font-mono text-base font-bold text-zinc-950 dark:text-white">
              {log.action}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs">
          {/* Super Admin Override Warning Callout */}
          {isOverride && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertOctagon size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="font-bold tracking-wide uppercase">
                  Executive Super Admin Override
                </span>
              </div>
              <p className="mt-2 text-amber-800 dark:text-amber-300">
                <strong>Justification:</strong> {log.overrideReason || "Documented executive decision"}
              </p>
            </div>
          )}

          {/* Actor & Resource Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Actor Card */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
                <User size={14} />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Actor (Initiator)
                </span>
              </div>
              <p className="text-sm font-bold text-zinc-950 dark:text-white">
                {log.actor?.name || "System"}
              </p>
              <p className="text-zinc-500">{log.actor?.email}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 font-semibold text-zinc-700 text-[10px] dark:bg-zinc-800 dark:text-zinc-300">
                  Role: {log.actor?.role}
                </span>
                {log.actor?.isCommitteeMember && (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-semibold text-indigo-700 text-[10px] dark:bg-indigo-950/50 dark:text-indigo-300">
                    Committee Seated
                  </span>
                )}
              </div>
            </div>

            {/* Target Resource Card */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
                <FolderKanban size={14} />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Target Resource
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-800 text-[10px] dark:bg-blue-950/50 dark:text-blue-300">
                  {log.resource?.type}
                </span>
                <span className="truncate font-semibold text-zinc-950 dark:text-white">
                  {log.resource?.identifier || "Resource"}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">
                ID: {String(log.resource?.id)}
              </p>
            </div>
          </div>

          {/* Decision Reason Callout */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
              <Quote size={14} />
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Decision Reason / Justification
              </span>
            </div>
            <blockquote className="border-l-2 border-blue-500 pl-3 italic text-zinc-800 dark:text-zinc-200">
              &quot;{log.decisionReason || "Action performed under standard workflow"}&quot;
            </blockquote>
          </div>

          {/* State Mutation & Changes Inspector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-700 dark:text-zinc-300">
                State Mutation Audit
              </span>
            </div>
            <StateDiffViewer
              previousState={log.previousState}
              newState={log.newState}
            />
          </div>

          {/* Technical Metadata & Audit Traceability */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="mb-2 flex items-center gap-1.5 text-zinc-500">
              <Hash size={14} />
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Audit Traceability Context
              </span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Request ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {log.requestId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRequestId}
                    title="Copy Request ID"
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {copiedRequestId ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Authorization:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {log.authorizationResult}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Exact ISO Timestamp:</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {log.createdAt}
                </span>
              </div>

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="pt-2">
                  <span className="text-zinc-500">Additional Metadata:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Immutable log ID: <code className="font-mono">{log._id}</code>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
