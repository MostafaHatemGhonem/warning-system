"use client";

import { useState } from "react";
import { Check, CheckCircle2, Crown, Loader2, Mail, Shield, User, UserCheck } from "lucide-react";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isCommitteeMember?: boolean;
  isActive: boolean;
  createdAt: string;
};

type ProfileTabProps = {
  member: Member;
  onUpdateSuccess: (updated: Member) => void;
};

export default function ProfileTab({ member, onUpdateSuccess }: ProfileTabProps) {
  const [name, setName] = useState(member.name);
  const [avatar, setAvatar] = useState(member.avatar || "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuper = member.role === "Super Admin";
  const isAdmin = member.role === "Admin";
  const isHR = member.role === "HR";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Name must be at least 2 characters long.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatar.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update profile.");
      }

      setSuccessMessage("Profile updated successfully.");
      onUpdateSuccess(json.data);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred updating profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
            Personal Information
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Update your personal details and how you appear to team members.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                />
              </div>
            </div>

            {/* Email (Read-Only) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={member.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Official organization email managed by administration.
              </p>
            </div>

            {/* Avatar URL */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Profile Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Leave empty to use automatic initials placeholder.
              </p>
            </div>

          </div>
        </div>

        {/* Role & Privileges Card (Read Only) */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
            Workspace Role & Privileges
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Your assigned authorization level within the Infinity Explorers governance framework.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">Assigned Role:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                  isSuper
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : isAdmin
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : isHR
                    ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                    : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {isSuper ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {member.role}
              </span>
            </div>

            {member.isCommitteeMember && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 dark:border-indigo-900/40 dark:bg-indigo-950/40">
                <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                  Governance Committee Seated
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 touch-manipulation active:scale-[0.99]"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Save Profile Changes</span>
          </button>
        </div>

      </form>

    </div>
  );
}
