"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { MemberRole } from "@/models/member";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  userRole?: MemberRole;
};

const coreNavigation = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
    exact: false,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    exact: false,
  },
  {
    label: "Meetings",
    href: "/dashboard/meetings",
    icon: CalendarDays,
    exact: false,
  },
  {
    label: "Members",
    href: "/dashboard/members",
    icon: Users,
    exact: false,
  },
  {
    label: "Warnings",
    href: "/dashboard/warnings",
    icon: AlertTriangle,
    exact: false,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    exact: false,
  },
];

const adminAuditNavigation = [
  {
    label: "Administration",
    href: "/dashboard/admin",
    icon: ShieldCheck,
    exact: false,
  },
  {
    label: "Activity Logs",
    href: "/dashboard/activity",
    icon: Activity,
    exact: false,
  },
];

const governanceNavigation = [
  {
    label: "HR & Governance",
    href: "/dashboard/hr",
    icon: Shield,
    exact: false,
  },
];

const GOVERNANCE_ROLES: MemberRole[] = ["HR", "Admin", "Super Admin"];
const ADMIN_AUDIT_ROLES: MemberRole[] = ["Admin", "Super Admin"];

export function Sidebar({ open, onClose, userRole }: SidebarProps) {
  const pathname = usePathname();
  const showGovernance = userRole && GOVERNANCE_ROLES.includes(userRole);
  const showAdminAudit = userRole && ADMIN_AUDIT_ROLES.includes(userRole);

  const navigation = [
    ...coreNavigation,
    ...(showAdminAudit ? adminAuditNavigation : []),
    ...(showGovernance ? governanceNavigation : []),
  ];

  function isActive(item: (typeof navigation)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-200 bg-white transition-transform dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">

          {/* ── Logo / Brand ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 dark:bg-white">
                <span className="text-xs font-bold text-white dark:text-zinc-950">IE</span>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-950 dark:text-white">Infinity Explorers</p>
                <p className="text-xs text-zinc-500">Team Management</p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-900"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navigation.map((item) => {
              const Icon    = item.icon;
              const active  = isActive(item);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}            // close on mobile after nav
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Workspace card ─────────────────────────────────────────────── */}
          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
              <div className="mb-1 flex items-center gap-2">
                <BarChart3 size={16} className="text-zinc-500" />
                <span className="text-xs font-semibold text-zinc-950 dark:text-white">Workspace</span>
              </div>
              <p className="text-xs text-zinc-500">Infinity Explorers Team</p>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
