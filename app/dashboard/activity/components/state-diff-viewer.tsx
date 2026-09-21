"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileCode, GitCompare, Minus, Plus } from "lucide-react";

interface StateDiffViewerProps {
  previousState: any;
  newState: any;
}

type DiffItem = {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  prevVal?: any;
  newVal?: any;
};

function formatVal(val: any): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function StateDiffViewer({ previousState, newState }: StateDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [copied, setCopied] = useState(false);

  // Compute field-by-field diff
  const diffItems: DiffItem[] = useMemo(() => {
    const isCreate = !previousState && Boolean(newState);
    const isDelete = Boolean(previousState) && !newState;

    if (isCreate) {
      if (typeof newState === "object" && newState !== null) {
        return Object.keys(newState)
          .filter((k) => !k.startsWith("__"))
          .map((key) => ({
            key,
            type: "added" as const,
            newVal: newState[key],
          }));
      }
      return [{ key: "value", type: "added" as const, newVal: newState }];
    }

    if (isDelete) {
      if (typeof previousState === "object" && previousState !== null) {
        return Object.keys(previousState)
          .filter((k) => !k.startsWith("__"))
          .map((key) => ({
            key,
            type: "removed" as const,
            prevVal: previousState[key],
          }));
      }
      return [{ key: "value", type: "removed" as const, prevVal: previousState }];
    }

    // Both exist: compare keys
    if (
      typeof previousState === "object" &&
      previousState !== null &&
      typeof newState === "object" &&
      newState !== null
    ) {
      const allKeys = Array.from(
        new Set([...Object.keys(previousState), ...Object.keys(newState)]),
      ).filter((k) => !k.startsWith("__"));

      const items: DiffItem[] = [];

      allKeys.forEach((key) => {
        const hasPrev = key in previousState;
        const hasNew = key in newState;
        const prevV = previousState[key];
        const newV = newState[key];

        if (!hasPrev && hasNew) {
          items.push({ key, type: "added", newVal: newV });
        } else if (hasPrev && !hasNew) {
          items.push({ key, type: "removed", prevVal: prevV });
        } else {
          const prevStr = JSON.stringify(prevV);
          const newStr = JSON.stringify(newV);
          if (prevStr !== newStr) {
            items.push({ key, type: "changed", prevVal: prevV, newVal: newV });
          } else {
            items.push({ key, type: "unchanged", prevVal: prevV, newVal: newV });
          }
        }
      });

      return items;
    }

    return [];
  }, [previousState, newState]);

  const changedCount = diffItems.filter((i) => i.type !== "unchanged").length;

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify({ previousState, newState }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60">
      {/* Diff Controls Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <GitCompare size={15} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            State Delta & Mutation
          </span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {changedCount} {changedCount === 1 ? "field changed" : "fields changed"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                viewMode === "visual"
                  ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <GitCompare size={12} />
              Visual Diff
            </button>
            <button
              type="button"
              onClick={() => setViewMode("json")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                viewMode === "json"
                  ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <FileCode size={12} />
              Raw JSON
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyJson}
            title="Copy snapshot JSON"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Visual Diff View */}
      {viewMode === "visual" ? (
        <div className="max-h-80 overflow-y-auto p-3 text-xs">
          {diffItems.length === 0 ? (
            <div className="py-6 text-center text-zinc-400">
              No previous or new state recorded for this event.
            </div>
          ) : (
            <div className="space-y-2">
              {diffItems.map((item) => {
                if (item.type === "added") {
                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 font-mono dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    >
                      <Plus size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-emerald-950 dark:text-emerald-300">
                          {item.key}:
                        </span>{" "}
                        <span className="text-emerald-800 dark:text-emerald-200">
                          {formatVal(item.newVal)}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === "removed") {
                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/50 p-2 font-mono dark:border-rose-900/50 dark:bg-rose-950/20"
                    >
                      <Minus size={14} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-rose-950 dark:text-rose-300">
                          {item.key}:
                        </span>{" "}
                        <span className="text-rose-800 line-through dark:text-rose-200">
                          {formatVal(item.prevVal)}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === "changed") {
                  return (
                    <div
                      key={item.key}
                      className="rounded-lg border border-amber-200 bg-amber-50/40 p-2.5 font-mono dark:border-amber-900/50 dark:bg-amber-950/20"
                    >
                      <div className="mb-1 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                        {item.key}
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <div className="rounded bg-red-100/60 px-2 py-1 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                            BEFORE:
                          </span>{" "}
                          <span className="line-through">{formatVal(item.prevVal)}</span>
                        </div>
                        <div className="rounded bg-emerald-100/60 px-2 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            AFTER:
                          </span>{" "}
                          <span>{formatVal(item.newVal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Unchanged summary toggle */}
              {diffItems.some((i) => i.type === "unchanged") && (
                <details className="mt-2 rounded-lg border border-zinc-200 p-2 text-zinc-500 dark:border-zinc-800">
                  <summary className="cursor-pointer text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
                    Show {diffItems.filter((i) => i.type === "unchanged").length} unchanged fields
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px]">
                    {diffItems
                      .filter((i) => i.type === "unchanged")
                      .map((item) => (
                        <div key={item.key} className="text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold">{item.key}:</span> {formatVal(item.newVal)}
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Raw JSON View */
        <div className="grid max-h-80 gap-2 overflow-y-auto p-3 font-mono text-[11px] sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Previous State
            </div>
            <pre className="overflow-x-auto text-zinc-700 dark:text-zinc-300">
              {previousState ? JSON.stringify(previousState, null, 2) : "null (No prior state)"}
            </pre>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              New State
            </div>
            <pre className="overflow-x-auto text-zinc-700 dark:text-zinc-300">
              {newState ? JSON.stringify(newState, null, 2) : "null (Resource deleted)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
