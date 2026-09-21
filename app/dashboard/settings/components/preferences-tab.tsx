"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Globe,
  Languages,
  Moon,
  Monitor,
  Palette,
  Sun,
} from "lucide-react";

export default function PreferencesTab() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [emailWarnings, setEmailWarnings] = useState(true);
  const [emailCommittees, setEmailCommittees] = useState(true);
  const [emailTasks, setEmailTasks] = useState(true);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") {
        setTheme("dark");
      } else if (stored === "light") {
        setTheme("light");
      } else {
        setTheme("system");
      }
    };
    syncTheme();

    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, []);

  function handleThemeChange(newTheme: "light" | "dark" | "system") {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      localStorage.removeItem("theme");
    }
    window.dispatchEvent(new Event("theme-change"));
    triggerSaveToast();
  }

  function triggerSaveToast() {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  }

  return (
    <div className="space-y-6">
      
      {saveToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Preferences updated and saved.</span>
        </div>
      )}

      {/* Theme Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Appearance & Theme
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Customize the visual styling of your workspace interface.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition ${
              theme === "light"
                ? "border-zinc-950 bg-zinc-50 ring-2 ring-zinc-950/10 dark:border-white dark:bg-zinc-800"
                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Light Mode</p>
              <p className="text-[11px] text-zinc-500">Clean bright appearance</p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition ${
              theme === "dark"
                ? "border-zinc-950 bg-zinc-50 ring-2 ring-zinc-950/10 dark:border-white dark:bg-zinc-800"
                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Dark Mode</p>
              <p className="text-[11px] text-zinc-500">High contrast sleek look</p>
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition ${
              theme === "system"
                ? "border-zinc-950 bg-zinc-50 ring-2 ring-zinc-950/10 dark:border-white dark:bg-zinc-800"
                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">System Default</p>
              <p className="text-[11px] text-zinc-500">Matches OS settings</p>
            </div>
          </button>

        </div>
      </div>

      {/* Notifications Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Notification Preferences
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure which platform events trigger notifications.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Warnings & Disciplinary Action Alerts
              </p>
              <p className="text-[11px] text-zinc-500">
                Receive notifications when a warning is issued, appealed, or modified.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailWarnings(!emailWarnings);
                triggerSaveToast();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                emailWarnings ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition ${
                  emailWarnings
                    ? "translate-x-6 bg-white dark:bg-zinc-950"
                    : "translate-x-1 bg-white dark:bg-zinc-400"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Committee Cases & Quorum Requests
              </p>
              <p className="text-[11px] text-zinc-500">
                Alerts when assigned to an inquiry committee or when a vote is pending.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailCommittees(!emailCommittees);
                triggerSaveToast();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                emailCommittees ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition ${
                  emailCommittees
                    ? "translate-x-6 bg-white dark:bg-zinc-950"
                    : "translate-x-1 bg-white dark:bg-zinc-400"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Task & Project Assignments
              </p>
              <p className="text-[11px] text-zinc-500">
                Receive notifications when you are assigned to new tasks or project milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailTasks(!emailTasks);
                triggerSaveToast();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                emailTasks ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition ${
                  emailTasks
                    ? "translate-x-6 bg-white dark:bg-zinc-950"
                    : "translate-x-1 bg-white dark:bg-zinc-400"
                }`}
              />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
