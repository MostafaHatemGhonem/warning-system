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

      const targetId = project._id || project.id;
      const res = await fetch(`/api/projects/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
          progress: Number(formData.progress),
          lead: formData.lead,
          leadId: formData.leadId,
          members: Math.max(1, Number(formData.members) || 1),
          dueDate: formData.dueDate,
          decisionReason: formData.decisionReason.trim() || undefined,
        }),
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
