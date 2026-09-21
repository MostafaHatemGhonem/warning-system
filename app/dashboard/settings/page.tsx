"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Crown,
  KeyRound,
  Loader2,
  Lock,
  Palette,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import ProfileTab from "./components/profile-tab";
import SecurityTab from "./components/security-tab";
import PreferencesTab from "./components/preferences-tab";
import AccountTab from "./components/account-tab";

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

export default function SettingsPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "preferences" | "account">("profile");

  useEffect(() => {
    async function loadMember() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/auth/me", {
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load account settings.");
        }

        setMember(json.data);
      } catch (err: any) {
        setError(err.message || "An error occurred fetching account information.");
      } finally {
        setIsLoading(false);
      }
    }

    loadMember();
  }, []);

  // ── Loading Skeleton ────────────────────────────────────────────────────────
  if (isLoading && !member) {
    return (
      <DashboardShell>
        <div className="space-y-6 p-4">
          <div className="h-10 w-1/4 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </DashboardShell>
    );
  }

  const isSuper = member?.role === "Super Admin";
  const isAdmin = member?.role === "Admin";
  const isHR = member?.role === "HR";

  return (
    <DashboardShell userRole={member?.role as any}>
      <div className="space-y-8">
        
        {/* ── 1. Page Header ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-md dark:bg-white dark:text-zinc-950">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Account Settings
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your personal profile, credentials, and application preferences.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. User Hero Identity Card ───────────────────────────────────── */}
        {member && (
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-xl font-bold text-white shadow-lg dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-950">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                    {member.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      isSuper
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : isAdmin
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        : isHR
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {isSuper ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {member.role}
                  </span>
                  {member.isCommitteeMember && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Committee
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-100 pt-3 sm:border-t-0 sm:pt-0 dark:border-zinc-800">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Account
              </span>
            </div>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* ── 3. Tabs Navigation ───────────────────────────────────────────── */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "profile"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile Information</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "security"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Security & Password</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "preferences"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>Appearance & Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === "account"
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Workspace & Identifiers</span>
          </button>
        </div>

        {/* ── 4. Active Tab Content ────────────────────────────────────────── */}
        {member && activeTab === "profile" && (
          <ProfileTab
            member={member}
            onUpdateSuccess={(updated) => setMember(updated)}
          />
        )}

        {member && activeTab === "security" && <SecurityTab />}

        {member && activeTab === "preferences" && <PreferencesTab />}

        {member && activeTab === "account" && <AccountTab member={member} />}

      </div>
    </DashboardShell>
  );
}
