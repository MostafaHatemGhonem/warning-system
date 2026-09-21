import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Warning from "@/models/warning";
import Member from "@/models/member";
import Committee from "@/models/committee";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import ExportComplianceReportModal from "@/components/hr/export-compliance-report-modal";
import {
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowUpRight,
  TrendingUp,
  Vote,
  Sparkles,
} from "lucide-react";

async function getHRDashboardData() {
  await connectToDatabase();
  const now = new Date();

  const [
    pendingApproval,
    activeWarnings,
    appealsOpen,
    suspensionsActive,
    recentWarnings,
    memberCount,
    activeMembers,
    committees,
  ] = await Promise.all([
    Warning.find({ status: "Pending_Approval" }).populate("member issuedBy", "name email role").lean(),
    Warning.find({ status: "Active" }).populate("member issuedBy", "name email role").lean(),
    Warning.find({ "review.status": { $in: ["Requested", "In_Progress"] } }).populate("member issuedBy", "name email role").lean(),
    Warning.find({ "suspension.isSuspended": true }).populate("member", "name email role").lean(),
    Warning.find({}).sort({ createdAt: -1 }).limit(10).populate("member issuedBy", "name email role").lean(),
    Member.countDocuments({}),
    Member.countDocuments({ isActive: true }),
    Committee.find({})
      .populate("members.memberId", "name email role")
      .populate("createdBy", "name email")
      .populate("resourceId", "level type status member points")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const suspensionsWithSLA = suspensionsActive.map((w: any) => {
    const suspendedUntil = w.suspension?.suspendedUntil ? new Date(w.suspension.suspendedUntil) : null;
    const hoursLeft = suspendedUntil ? (suspendedUntil.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
    return { ...w, hoursLeft };
  });

  const appealsWithSLA = appealsOpen.map((w: any) => {
    const requestedAt = w.review?.requestedAt ? new Date(w.review.requestedAt) : null;
    const deadlineDate = w.review?.appealDeadline
      ? new Date(w.review.appealDeadline)
      : requestedAt
        ? new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;
    const daysLeft = deadlineDate ? (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
    return { ...w, daysLeft };
  });

  const activeCommitteesCount = committees.filter((c: any) => c.status === "ACTIVE").length;
  const tiedCommitteesCount = committees.filter((c: any) => c.status === "TIED").length;

  return {
    pendingApproval,
    activeWarnings,
    appealsWithSLA,
    suspensionsWithSLA,
    recentWarnings,
    committees,
    stats: {
      memberCount,
      activeMembers,
      pendingApprovalCount: pendingApproval.length,
      activeWarningCount: activeWarnings.length,
      openAppealsCount: appealsOpen.length,
      activeSuspensionsCount: suspensionsActive.length,
      activeCommitteesCount,
      tiedCommitteesCount,
    },
  };
}

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-EG", { month: "short", day: "numeric" });
}

function getLevelColor(level?: string): string {
  switch (level) {
    case "Warning 1": return "text-amber-600 bg-amber-50 border-amber-200";
    case "Warning 2": return "text-orange-600 bg-orange-50 border-orange-200";
    case "Final Warning": return "text-red-600 bg-red-50 border-red-200";
    default: return "text-zinc-600 bg-zinc-50 border-zinc-200";
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "Active": return "text-emerald-700 bg-emerald-50";
    case "Pending_Approval": return "text-amber-700 bg-amber-50";
    case "Resolved": return "text-zinc-500 bg-zinc-100";
    case "Appealed": return "text-blue-700 bg-blue-50";
    default: return "text-zinc-500 bg-zinc-50";
  }
}

type PopulatedMember = { name?: string; email?: string; role?: string } | string | null;

function getMemberName(member: PopulatedMember): string {
  if (!member) return "Unknown";
  if (typeof member === "string") return member;
  return member.name ?? member.email ?? "Unknown";
}

export default async function HRGovernancePage() {
  const currentMember = await getCurrentMember();
  if (!currentMember) redirect("/login");

  const allowedRoles = ["HR", "Admin", "Super Admin"] as const;
  type AllowedRole = (typeof allowedRoles)[number];
  if (!allowedRoles.includes(currentMember.role as AllowedRole)) {
    redirect("/dashboard");
  }

  const data = await getHRDashboardData();
  const { stats, pendingApproval, appealsWithSLA, suspensionsWithSLA, recentWarnings, committees } = data;

  return (
    <DashboardShell userRole={currentMember.role}>
      <div className="space-y-8">

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                HR &amp; Governance
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Records, SLA monitoring, appeals docket &amp; audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportComplianceReportModal />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-800">
              <Shield className="h-3 w-3" />
              {currentMember.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { label: "Total Members", value: stats.memberCount, icon: Users, color: "text-zinc-600", bg: "bg-zinc-100 dark:bg-zinc-800" },
            { label: "Active Members", value: stats.activeMembers, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Pending Approval", value: stats.pendingApprovalCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Active Warnings", value: stats.activeWarningCount, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
            {
              label: stats.tiedCommitteesCount > 0 ? "Committees (Tied!)" : "Active Panels",
              value: stats.activeCommitteesCount + stats.tiedCommitteesCount,
              icon: Vote,
              color: stats.tiedCommitteesCount > 0 ? "text-amber-600" : "text-indigo-600",
              bg: stats.tiedCommitteesCount > 0 ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300" : "bg-indigo-50 dark:bg-indigo-900/20",
            },
            { label: "Open Appeals", value: stats.openAppealsCount, icon: FileText, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Suspensions", value: stats.activeSuspensionsCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={card.color} size={18} />
              </div>
              <p className="text-2xl font-bold text-zinc-950 dark:text-white">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{card.label}</p>
            </div>
          ))}
        </div>

        {/* ── Active Governance Panels & Democratic Voting Section ───────────── */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Vote className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Case Governance Panels &amp; Majority Voting
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ad-hoc impartial committees convened per sensitive case (requires &ge; 3 members and &gt; 50% strict majority)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {committees.length} Panel{committees.length === 1 ? "" : "s"} On Record
              </span>
            </div>
          </div>

          <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {committees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-500/80" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No active committee panels</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  When a sensitive warning or appeal requires governance, Super Admin establishes an ad-hoc committee.
                </p>
              </div>
            ) : (
              committees.map((c: any) => {
                const totalMembers = c.members?.length || 0;
                const votesCount = c.votes?.length || 0;
                const approveVotes = c.votes?.filter((v: any) => v.vote === "Approve").length || 0;
                const rejectVotes = c.votes?.filter((v: any) => v.vote === "Reject").length || 0;
                const threshold = Math.floor(totalMembers / 2) + 1;
                const targetWarningId = String(c.resourceId?._id || c.resourceId || "");

                return (
                  <div key={String(c._id)} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-950 dark:text-white">
                            {c.caseNumber}
                          </span>
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {c.caseType?.replace("_", " ")}
                          </span>

                          {/* Status badge */}
                          {c.status === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400" />
                              Voting ({votesCount}/{totalMembers})
                            </span>
                          )}
                          {c.status === "TIED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              Votes Tied (Tie-Breaker Required)
                            </span>
                          )}
                          {c.status === "DECIDED" && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                c.decisionOutcome === "APPROVED"
                                  ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Decided: {c.decisionOutcome}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {c.formationReason || "Impartial committee deliberation"} • Convened by {c.createdBy?.name || "Super Admin"}
                        </p>

                        {/* Seated members tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-semibold text-zinc-400">Seated Members:</span>
                          {c.members?.map((m: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                              {m.memberId?.name || "Member"}
                              <span className="text-[9px] text-zinc-400">({m.roleAtFormation})</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right column: Tally & Action button */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          <span className="text-emerald-600 dark:text-emerald-400">Approve: {approveVotes}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="text-rose-600 dark:text-rose-400">Reject: {rejectVotes}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="text-zinc-400">Threshold: {threshold}</span>
                        </div>

                        {targetWarningId && (
                          <a
                            href={`/dashboard/warnings?selected=${targetWarningId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                          >
                            <span>Open Case &amp; Adjudicate</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Suspension SLA (48h)</h2>
              </div>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                {suspensionsWithSLA.length} active
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {suspensionsWithSLA.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm text-zinc-500">No active suspensions</p>
                </div>
              ) : (
                suspensionsWithSLA.slice(0, 5).map((w) => {
                  const hoursLeft = w.hoursLeft ?? 0;
                  const isOverdue = hoursLeft < 0;
                  const pct = Math.max(0, Math.min(100, (hoursLeft / 48) * 100));
                  return (
                    <div key={String(w._id)} className="px-5 py-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-950 dark:text-white">
                            {getMemberName(w.member as PopulatedMember)}
                          </p>
                          <p className="text-xs text-zinc-500">{w.suspension?.reason ?? "No reason"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${isOverdue ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {isOverdue ? `${Math.abs(Math.round(hoursLeft))}h overdue` : `${Math.round(hoursLeft)}h left`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${isOverdue ? "bg-red-500" : hoursLeft < 12 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${isOverdue ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Appeals Docket (7d SLA)</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                {appealsWithSLA.length} pending
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {appealsWithSLA.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm text-zinc-500">No pending appeals</p>
                </div>
              ) : (
                appealsWithSLA.slice(0, 5).map((w) => {
                  const daysLeft = w.daysLeft ?? 0;
                  const isOverdue = daysLeft < 0;
                  return (
                    <div key={String(w._id)} className="flex items-center gap-4 px-5 py-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${isOverdue ? "bg-red-100 text-red-700" : daysLeft < 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {isOverdue ? "!" : `${Math.round(daysLeft)}d`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                          {getMemberName(w.member as PopulatedMember)}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{w.review?.reason ?? "No reason"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${getLevelColor(w.level)}`}>
                        {w.level ?? "Warning"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Pending Approval Queue</h2>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                {pendingApproval.length} queued
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingApproval.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm text-zinc-500">Queue is clear</p>
                </div>
              ) : (
                pendingApproval.slice(0, 5).map((w) => (
                  <div key={String(w._id)} className="flex items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getLevelColor(w.level)}`}>
                        {w.level ?? "Warning"}
                      </span>
                      <p className="mt-1 truncate text-sm font-medium text-zinc-950 dark:text-white">
                        {getMemberName(w.member as PopulatedMember)}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        by {getMemberName(w.issuedBy as PopulatedMember)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">{formatTimeAgo(w.createdAt as Date)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Warning Audit Record</h2>
              </div>
              <a href="/dashboard/warnings" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700">
                View all <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentWarnings.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm text-zinc-500">No warnings on record</p>
                </div>
              ) : (
                recentWarnings.slice(0, 6).map((w) => (
                  <div key={String(w._id)} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${w.level === "Final Warning" ? "bg-red-500" : w.level === "Warning 2" ? "bg-orange-500" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-950 dark:text-white">
                        <span className="font-medium">{getMemberName(w.member as PopulatedMember)}</span>
                        <span className="text-zinc-400"> — {w.level ?? "Warning"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(w.status)}`}>
                        {String(w.status ?? "").replace("_", " ")}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">{formatTimeAgo(w.createdAt as Date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {currentMember.role === "HR" && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 dark:border-violet-800 dark:bg-violet-900/10">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">HR Governance Boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-violet-700 dark:text-violet-300">
                  Your role is restricted to <strong>governance, records keeping, SLA monitoring, and appeals intake</strong>.
                  Final Warning approval, Global Warning approval, and appeal adjudication require <strong>neutral Committee authority</strong>.
                  These actions are blocked at the API level regardless of UI state.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
