"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";

export default function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Strength Calculation
  const hasMinLength = newPassword.length >= 8;
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage("Current password is required.");
      return;
    }
    if (!hasMinLength) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update password.");
      }

      setSuccessMessage("Password changed successfully. Your next login will use your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update password.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Password Change Form */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Change Account Password
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ensure your account is protected with a strong, distinct password.
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-lg space-y-4">
            
            {/* Current Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Hints */}
            {newPassword.length > 0 && (
              <div className="space-y-1 rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className={hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}>
                    {hasMinLength ? "✓" : "○"} At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasMixedCase ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}>
                    {hasMixedCase ? "✓" : "○"} Uppercase & lowercase letters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasNumberOrSymbol ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-400"}>
                    {hasNumberOrSymbol ? "✓" : "○"} Numbers or symbols
                  </span>
                </div>
              </div>
            )}

            {/* Confirm New Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[11px] text-rose-500">Passwords do not match.</p>
              )}
            </div>

          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-start">
            <button
              type="submit"
              disabled={isUpdating || !hasMinLength || !passwordsMatch}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 touch-manipulation active:scale-[0.99]"
            >
              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </div>
      </form>

      {/* Session Security Overview */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              Session & Cryptographic Protection
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Technical security parameters guarding your authenticated access.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <p className="font-bold text-zinc-900 dark:text-white">Active Authentication Token</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Hashed with SHA-256 and stored in HttpOnly, SameSite cookies with 7-day automatic TTL expiration.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 p-3.5 dark:border-zinc-800">
            <p className="font-bold text-zinc-900 dark:text-white">Credential Encryption</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Passwords salted and hashed using bcrypt with 12 rounds of cryptographic difficulty.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
