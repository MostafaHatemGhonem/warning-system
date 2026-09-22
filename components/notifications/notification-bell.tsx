"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Info,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

export type NotificationItem = {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  actor?: {
    _id?: string;
    name?: string;
    role?: string;
    avatar?: string;
  } | null;
  createdAt: string;
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "task_assigned":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "task_status":
      return <Clock3 className="h-4 w-4 text-amber-500" />;
    case "project_created":
      return <FolderKanban className="h-4 w-4 text-blue-500" />;
    case "project_member_added":
      return <UserPlus className="h-4 w-4 text-purple-500" />;
    case "warning_issued":
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    default:
      return <Info className="h-4 w-4 text-zinc-500" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data || []);
          setUnreadCount(json.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, []);

  // Initial load and periodic poll every 25 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Open dropdown and refresh
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Click single notification
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif._id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Error marking notification read:", err);
      }
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Clear read notifications
  const handleClearRead = async () => {
    try {
      const res = await fetch("/api/notifications?clearRead=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.read));
      }
    } catch (err) {
      console.error("Error clearing read notifications:", err);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
        className={`relative rounded-xl border p-2.5 transition sm:block ${
          isOpen
            ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            : "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        }`}
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-zinc-950 animate-in zoom-in duration-150">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-2.5 top-18 sm:top-full sm:absolute sm:inset-auto sm:right-0 sm:w-96 z-50 mt-1 max-w-md mx-auto sm:mx-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82vh] sm:max-h-[32rem]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-950 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
                  >
                    {isMarkingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    Mark all as read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:hidden"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  No notifications yet
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  You will be notified when projects, tasks, or role events occur.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group flex items-start gap-3 p-3.5 cursor-pointer transition ${
                    notif.read
                      ? "bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/60"
                      : "bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          notif.read
                            ? "font-semibold text-zinc-800 dark:text-zinc-200"
                            : "font-bold text-zinc-950 dark:text-white"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.actor?.name && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400">
                        <span>by {notif.actor.name}</span>
                        {notif.actor.role && <span>({notif.actor.role})</span>}
                      </div>
                    )}
                  </div>

                  {!notif.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.some((n) => n.read) && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <span className="text-[10px] text-zinc-400">
                {notifications.length} total notification{notifications.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleClearRead}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition"
              >
                <Trash2 className="h-3 w-3" />
                Clear read
              </button>
            </div>
          )}

          </div>
        </>
      )}
    </div>
  );
}
