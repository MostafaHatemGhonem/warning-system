"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Search, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";

type TopbarProps = {
  onMenuClick: () => void;
};

type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.success) setUser(json.data);
        }
      } catch (err) {
        console.error("Failed to load user in topbar:", err);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 sm:h-20 items-center justify-between border-b border-zinc-200 bg-white px-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950 transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 text-zinc-700 hover:bg-zinc-100 active:scale-95 transition lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-900 touch-manipulation"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <p className="text-[11px] text-zinc-500 hidden sm:block">Welcome back,</p>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="font-semibold text-xs sm:text-sm text-zinc-950 dark:text-white truncate max-w-[110px] sm:max-w-none">
              {user ? user.name : "Member"}
            </h2>
            {user?.role && (
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                <Shield size={10} />
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 lg:flex dark:border-zinc-800">
          <Search size={16} className="text-zinc-500" />
          <input
            placeholder="Search..."
            className="w-36 bg-transparent text-xs outline-none"
          />
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Real-time Interactive Notification Bell */}
        <NotificationBell />

        {/* User Avatar */}
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-zinc-950 text-xs sm:text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
            {user ? initials(user.name) : "IE"}
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Log out"
          aria-label="Log out"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 sm:px-3 text-xs font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 dark:hover:text-red-400 touch-manipulation"
        >
          <LogOut size={15} />
          <span className="hidden md:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
