"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  KeyRound,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";

type AuditItem = {
  _id: string;
  requestId: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  resource: {
    type: string;
    identifier?: string;
  };
  decisionReason?: string;
  overrideReason?: string;
  authorizationResult: string;
  timestamp: string;
};

type TabActivityStreamProps = {
  recentOverrides: AuditItem[];
  recentAdminActions: AuditItem[];
};

export default function TabActivityStream({
  recentOverrides,
  recentAdminActions,
}: TabActivityStreamProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8">
      
      {/* ── SECTION 1: Super Admin Executive Overrides ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Super Admin Overrides Feed
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {recentOverrides.length}
            </span>
          </div>
          <Link
            href="/dashboard/activity"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
          >
            <span>Full Audit Trail</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {recentOverrides.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No Executive Overrides</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              All governance actions have adhered to standard policy paths.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentOverrides.map((log) => (
              <div
                key={log._id}
                className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      OVERRIDE
                    </span>
                    <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="mt-2 text-xs">
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Actor: {log.actor?.name || "Super Admin"} ({log.actor?.role})
                  </p>
                  <p className="text-zinc-500">Resource: {log.resource?.type} - {log.resource?.identifier}</p>
                </div>

                {log.overrideReason && (
                  <div className="mt-2 rounded-lg bg-white/80 p-2 text-xs text-amber-950 dark:bg-zinc-900 dark:text-amber-200">
                    <span className="font-bold">Override Justification: </span>
                    {log.overrideReason}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-amber-200/40 pt-2 text-[10px] text-zinc-400 dark:border-amber-900/30">
                  <span className="font-mono truncate max-w-[200px]">Req: {log.requestId}</span>
                  <button
                    onClick={() => copyText(log.requestId)}
                    className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {copiedId === log.requestId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === log.requestId ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: General Admin Activity Stream ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Recent Administrative Actions
            </h2>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {recentAdminActions.map((log) => (
            <div key={log._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {log.actor?.name?.slice(0, 2).toUpperCase() || "AD"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-950 dark:text-white">
                      {log.actor?.name}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {log.actor?.role}
                    </span>
                    <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {log.action}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {log.decisionReason || `Affected ${log.resource?.type} (${log.resource?.identifier || ""})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right sm:flex-col sm:items-end sm:gap-1">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {log.authorizationResult}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {new Date(log.timestamp).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
