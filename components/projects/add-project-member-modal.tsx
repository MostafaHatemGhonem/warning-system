"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, Loader2, Plus, Search, User, UserPlus, X } from "lucide-react";
import type { Project } from "@/types/project";

type MemberOption = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
};

type AddProjectMemberModalProps = {
  projectId: string;
  currentTeamMemberIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: (updatedProject: Project) => void;
};

export default function AddProjectMemberModal({
  projectId,
  currentTeamMemberIds,
  isOpen,
  onClose,
  onMemberAdded,
}: AddProjectMemberModalProps) {
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<
    "Core Contributor" | "Specialist" | "Reviewer" | "Observer"
  >("Core Contributor");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadMembers() {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedMemberId(null);
        setProjectRole("Core Contributor");
        setSearch("");

        const res = await fetch("/api/members");
        if (!res.ok) throw new Error("Failed to load organization members");
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

        if (isMounted) {
          setAllMembers(rawList.filter((m: MemberOption) => m.isActive !== false));
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(err);
          setError("Failed to load members list. Please check your connection.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const availableMembers = useMemo(() => {
    return allMembers.filter((m) => !currentTeamMemberIds.includes(m._id));
  }, [allMembers, currentTeamMemberIds]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return availableMembers;
    const q = search.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q),
    );
  }, [availableMembers, search]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!selectedMemberId) {
      setError("Please select a member to add.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          projectRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to add member to project");
      }

      onMemberAdded(data);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Add Team Member
              </h2>
              <p className="text-xs text-zinc-500">
                Enroll a member into this project's team
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member by name, role, email..."
              className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Members List */}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 space-y-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading active members...</span>
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                All active organization members are already enrolled in this project.
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No members found matching &quot;{search}&quot;.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMemberId === m._id;
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => setSelectedMemberId(m._id)}
                    className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition ${
                      isSelected
                        ? "border border-blue-500/50 bg-blue-50/70 text-blue-900 dark:border-blue-500/50 dark:bg-blue-950/40 dark:text-blue-200"
                        : "border border-transparent bg-white hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {(m.name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {m.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {m.role}
                      </span>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Project Role Selector */}
          {selectedMemberId && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/40 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-zinc-900 dark:text-white">
                Project Role (الدور في هذا المشروع):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "Core Contributor", label: "Core Contributor (مساهم رئيسي)" },
                    { value: "Specialist", label: "Specialist (أخصائي / خبير)" },
                    { value: "Reviewer", label: "Reviewer (مراجع جودة / كود)" },
                    { value: "Observer", label: "Observer (مراقب / متابع)" },
                  ] as const
                ).map((roleOpt) => (
                  <button
                    key={roleOpt.value}
                    type="button"
                    onClick={() => setProjectRole(roleOpt.value)}
                    className={`rounded-lg border p-2 text-left text-[11px] font-semibold transition ${
                      projectRole === roleOpt.value
                        ? "border-blue-500 bg-blue-50/80 text-blue-900 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-200"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {roleOpt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Footer Actions */}
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
              type="button"
              onClick={handleSubmit}
              disabled={!selectedMemberId || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Adding Member...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
