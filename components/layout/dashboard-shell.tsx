"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { MemberRole } from "@/models/member";

export function DashboardShell({
  children,
  userRole: initialRole,
}: {
  children: React.ReactNode;
  userRole?: MemberRole;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<MemberRole | undefined>(initialRole);

  useEffect(() => {
    if (initialRole) {
      setUserRole(initialRole);
      return;
    }
    let isMounted = true;
    async function fetchRole() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data?.role) {
            setUserRole(json.data.role);
          }
        }
      } catch (err) {
        console.error("DashboardShell fetchRole error:", err);
      }
    }
    fetchRole();
    return () => {
      isMounted = false;
    };
  }, [initialRole]);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
