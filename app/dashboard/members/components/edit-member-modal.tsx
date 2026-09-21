"use client";

import { FormEvent, useEffect, useState } from "react";
import { X, Shield } from "lucide-react";
import type { MemberRole } from "@/models/member";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar?: string;
  isActive: boolean;
  isCommitteeMember?: boolean;
  createdAt: string;
};

type EditMemberModalProps = {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (member: Member) => void;
  currentUserRole?: MemberRole;
};

const ALL_ROLES: MemberRole[] = [
  "Member",
  "Team Leader",
  "HR",
  "Committee",
  "Admin",
  "Super Admin",
];

export default function EditMemberModal({
  member,
  isOpen,
  onClose,
  onUpdated,
  currentUserRole,
}: EditMemberModalProps) {
  const availableRoles: MemberRole[] =
    currentUserRole === "Super Admin"
      ? ALL_ROLES
      : currentUserRole === "Admin"
      ? ["Member", "Team Leader", "HR", "Committee"]
      : ["Member", "Team Leader", "HR"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<MemberRole>("Member");
  const [avatar, setAvatar] = useState("");
  const [isCommitteeMember, setIsCommitteeMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync form when modal opens with a member
  useEffect(() => {
    if (!member || !isOpen) return;
    setName(member.name);
    setEmail(member.email);
    setPassword("");
    setRole(member.role);
    setAvatar(member.avatar ?? "");
    setIsCommitteeMember(Boolean(member.isCommitteeMember));
    setError("");
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  function handleClose() {
    setError("");
    setPassword("");
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!member) return;

    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (password.trim() && password.trim().length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    const memberId = member._id;

    try {
      setIsSubmitting(true);
      setError("");

      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role,
        avatar: avatar.trim(),
      };

      if (currentUserRole === "Super Admin") {
        payload.isCommitteeMember = isCommitteeMember;
      }

      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? "Failed to update member");

      onUpdated(data.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Edit Member</h2>
            <p className="mt-1 text-sm text-zinc-500">Update member details</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">

          {/* Name */}
          <div>
            <label htmlFor="edit-member-name" className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mostafa Hatem"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="edit-member-email" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mostafa@example.com"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Reset Password */}
          <div>
            <label htmlFor="edit-member-password" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reset Password <span className="text-xs font-normal text-zinc-400">(leave blank to keep current)</span>
            </label>
            <input
              id="edit-member-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="edit-member-role" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
            </label>
            <select
              id="edit-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Privileged Committee Membership Toggle (Super Admin Only) */}
          {currentUserRole === "Super Admin" && (
            <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-violet-600 dark:text-violet-400" />
                <div>
                  <label htmlFor="edit-member-committee" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Committee Authority (isCommitteeMember)
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Grants disciplinary committee authority to review and adjudicate appeals
                  </p>
                </div>
              </div>
              <input
                id="edit-member-committee"
                type="checkbox"
                checked={isCommitteeMember}
                onChange={(e) => setIsCommitteeMember(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          )}

          {/* Avatar URL */}
          <div>
            <label htmlFor="edit-member-avatar" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Avatar URL <span className="text-xs font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="edit-member-avatar"
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
