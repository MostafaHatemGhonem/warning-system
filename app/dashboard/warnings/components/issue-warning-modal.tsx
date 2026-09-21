"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert, Sparkles, X } from "lucide-react";
import type { CurrentUser } from "@/lib/client-permissions";
import type { WarningLevel, WarningType, WarningSeverity } from "@/models/warning";

type MemberOption = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type ProjectOption = {
  _id: string;
  name: string;
};

type IssueWarningModalProps = {
  isOpen: boolean;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function IssueWarningModal({
  isOpen,
  currentUser,
  onClose,
  onSuccess,
}: IssueWarningModalProps) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<WarningType>("Project");
  const [projectId, setProjectId] = useState("");
  const [level, setLevel] = useState<WarningLevel>("Warning 1");
  const [severity, setSeverity] = useState<WarningSeverity>(1);
  const [points, setPoints] = useState<number>(1);
  const [isDirectFinal, setIsDirectFinal] = useState(false);
  const [directReason, setDirectReason] = useState("");
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [evidenceInput, setEvidenceInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingOptions(true);
    setError(null);

    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ])
      .then(([membersRes, projectsRes]) => {
        if (membersRes?.success && Array.isArray(membersRes.data)) {
          setMembers(membersRes.data);
        }
        if (Array.isArray(projectsRes)) {
          setProjects(projectsRes);
        } else if (projectsRes?.data && Array.isArray(projectsRes.data)) {
          setProjects(projectsRes.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load options:", err);
        setError("Failed to load members or projects");
      })
      .finally(() => setIsLoadingOptions(false));
  }, [isOpen]);

  const [superAdminBypass, setSuperAdminBypass] = useState(true);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === "Super Admin";
  const isAdmin = currentUser?.role === "Admin" || isSuperAdmin;
  const isExceptional = type === "Global" || isDirectFinal;
  const willAutoActivate = isSuperAdmin ? superAdminBypass : (type === "Project" && !isDirectFinal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberId) {
      setError("Please select a member");
      return;
    }

    if (type === "Project" && !projectId) {
      setError("Please select a project for Project Warnings");
      return;
    }

    if (!description.trim()) {
      setError("Factual incident description is required");
      return;
    }

    if (isDirectFinal) {
      if (level !== "Final Warning") {
        setError("Direct Final Warning must have level 'Final Warning'");
        return;
      }
      if (severity !== 3) {
        setError("Direct Final Warning requires Severe severity (Severity 3)");
        return;
      }
      if (!directReason.trim()) {
        setError("Justification reason is required when issuing a Direct Final Warning");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        member: memberId,
        type,
        level,
        severity,
        points: points || severity,
        isDirectFinalWarning: isDirectFinal,
        incidentDate: incidentDate ? new Date(incidentDate).toISOString() : new Date().toISOString(),
        description: description.trim(),
        evidence: evidenceInput
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (type === "Project") {
        payload.project = projectId;
      }

      if (willAutoActivate) {
        payload.autoActivate = true;
      }

      if (isDirectFinal) {
        payload.directIssuanceReason = directReason.trim();
      }

      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create warning");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-500/10 p-2 dark:bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Issue Disciplinary Warning
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Official regulatory record according to Infinity Explorers Policy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Dynamic Route Banner */}
        <div className="mt-4">
          {isSuperAdmin && willAutoActivate ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold">👑 Super Admin Universal Bypass Active</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400/90">
                  Universal administrative override enabled. This warning will become <strong>Active immediately</strong> upon submission for {level === "Final Warning" ? "60 days" : "30 days"}, bypassing committee approval holds.
                </p>
              </div>
            </div>
          ) : !isExceptional ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold">⚡ Normal Progression (Lead / Admin Authority)</p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-400/90">
                  Standard project warning will become <strong>Active immediately</strong> upon issuance for {level === "Final Warning" ? "60 days" : "30 days"}. No committee hold required.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-800 dark:text-blue-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold">🛡️ Committee Approval Required (Exceptional Path)</p>
                <p className="mt-0.5 text-blue-700 dark:text-blue-400/90">
                  Because this is {type === "Global" ? "a Global Warning" : "a Direct Final Warning bypassing normal stages"}, it will be held in <strong>Pending_Approval</strong> status until reviewed by a Neutral Committee member.
                </p>
              </div>
            </div>
          )}

          {isSuperAdmin && isExceptional && (
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                👑 Super Admin Bypass: Activate Immediately without Committee Hold
              </span>
              <input
                type="checkbox"
                checked={superAdminBypass}
                onChange={(e) => setSuperAdminBypass(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Subject Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={isLoadingOptions}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email}) - {m.role}
                </option>
              ))}
            </select>
          </div>

          {/* Scope and Project Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Warning Scope <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WarningType)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
              >
                <option value="Project">Project Warning</option>
                {isAdmin && <option value="Global">Global Warning (All Projects)</option>}
              </select>
              {!isAdmin && (
                <p className="mt-1 text-[11px] text-zinc-400">
                  * Global warnings require Admin / Committee authorization
                </p>
              )}
            </div>

            {type === "Project" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={isLoadingOptions}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Warning Level & Severity Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Warning Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => {
                  const newLvl = e.target.value as WarningLevel;
                  setLevel(newLvl);
                  if (newLvl !== "Final Warning") setIsDirectFinal(false);
                }}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
              >
                <option value="Warning 1">Warning 1 (30 days)</option>
                <option value="Warning 2">Warning 2 (30 days)</option>
                <option value="Final Warning">Final Warning (60 days)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => {
                  const s = Number(e.target.value) as WarningSeverity;
                  setSeverity(s);
                  setPoints(s);
                }}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
              >
                <option value={1}>1 - Low / Routine</option>
                <option value={2}>2 - Moderate</option>
                <option value={3}>3 - Severe Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Disciplinary Points
              </label>
              <input
                type="number"
                min={1}
                max={3}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Direct Final Warning Checkbox */}
          {level === "Final Warning" && isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDirectFinal}
                  onChange={(e) => {
                    setIsDirectFinal(e.target.checked);
                    if (e.target.checked) setSeverity(3);
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Direct Final Warning (Bypassing Progressive Stages W1 & W2)
                </span>
              </label>

              {isDirectFinal && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Justification Reason for Skipping Stages <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document the severe infraction that warrants bypassing Warning 1 and 2..."
                    value={directReason}
                    onChange={(e) => setDirectReason(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Incident Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Incident Date
            </label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Factual Incident Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="State the objective facts, dates, deliverables missed, or behavioral policy breached..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Evidence Links / Artifacts (one per line)
            </label>
            <textarea
              rows={2}
              placeholder="https://github.com/... or PR link, commit, attendance record"
              value={evidenceInput}
              onChange={(e) => setEvidenceInput(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isExceptional ? "Submit for Committee Approval" : "Issue Warning (Active Immediately)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
