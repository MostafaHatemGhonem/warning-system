"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { WarningItem } from "@/lib/client-permissions";

type WarningsHeaderProps = {
  warnings: WarningItem[];
};

export function WarningsHeader({ warnings }: WarningsHeaderProps) {
  const activeCount = warnings.filter(
    (w) => w.status === "Active" || w.status === "Extended"
  ).length;

  const pendingApprovalCount = warnings.filter(
    (w) => w.status === "Pending_Approval"
  ).length;

  const suspendedCount = warnings.filter(
    (w) => w.suspension?.isSuspended
  ).length;

  const activePlanCount = warnings.filter(
    (w) => w.improvementPlan?.isActive
  ).length;

  const removalCount = warnings.filter(
    (w) => w.review?.disciplinaryRecommendation === "Refer_To_Formal_Removal_Review"
  ).length;

  const stats = [
    {
      title: "Active Warnings",
      value: activeCount,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      desc: "Currently running 30d/60d cycles",
    },
    {
      title: "Pending Approval",
      value: pendingApprovalCount,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      desc: "Requires Neutral Committee Approval",
    },
    {
      title: "Project Removals",
      value: removalCount,
      icon: AlertOctagon,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      desc: "Clause 14 Committee Referrals",
    },
    {
      title: "Protective Suspensions",
      value: suspendedCount,
      icon: AlertOctagon,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
      desc: "Temporary holds (max 48 hours)",
    },
    {
      title: "Active Improvement Plans",
      value: activePlanCount,
      icon: ShieldAlert,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
      desc: "7 to 60-day development track",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${item.bg} bg-white dark:bg-zinc-900/60`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {item.title}
              </span>
              <div className={`rounded-xl p-2.5 ${item.bg}`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {item.value}
              </span>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {item.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
