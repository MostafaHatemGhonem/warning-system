"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  IdCard,
  LogOut,
  Shield,
  ShieldCheck,
} from "lucide-react";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
};

type AccountTabProps = {
  member: Member;
};

export default function AccountTab({ member }: AccountTabProps) {
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(member._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Organization Details */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Organization & Workspace
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Infinity Explorers Enterprise Governance Platform.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">Organization Name</span>
            <p className="mt-1 font-bold text-zinc-900 dark:text-white">Infinity Explorers</p>
          </div>

          <div className="rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">Governance Platform</span>
            <p className="mt-1 font-bold text-zinc-900 dark:text-white">Warning & Disciplinary Management</p>
          </div>
        </div>
      </div>

      {/* Account Credentials & Identifiers */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <IdCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Member Record Details
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Unique identifiers and membership lifecycle metadata.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-xs">
          
          {/* Member ID */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Internal Member ID</span>
              <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                {member._id}
              </p>
            </div>
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
              <span>{copied ? "Copied" : "Copy ID"}</span>
            </button>
          </div>

          {/* Account Status */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Account Standing</span>
              <p className="mt-0.5 font-bold text-zinc-900 dark:text-white">
                {member.isActive ? "Active & Authorized" : "Inactive"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Good Standing
            </span>
          </div>

          {/* Registration Date */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Member Since</span>
              <p className="mt-0.5 font-bold text-zinc-900 dark:text-white">
                {new Date(member.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

        </div>

        {/* Logout Action */}
        <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out of this Account</span>
          </button>
        </div>

      </div>

    </div>
  );
}
