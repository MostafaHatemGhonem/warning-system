"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Shield,
  Users,
  X,
} from "lucide-react";

type ReportSummary = {
  organization: string;
  reportTitle: string;
  monthLabel: string;
  generatedAt: string;
  generatedBy: {
    name: string;
    role: string;
    email: string;
  };
  stats: {
    totalMembers: number;
    activeMembersCount: number;
    totalMeetingsHeld: number;
    overallAttendanceRate: number;
    overallUnexcusedAbsences: number;
    activeWarningsCount: number;
    openAppealsCount: number;
    activeImprovementPlansCount: number;
  };
};

type MemberRosterItem = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  totalInvited: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
  activeWarningsCount: number;
  totalPoints: number;
  complianceStanding: string;
};

type WarningItem = {
  warningId: string;
  memberName: string;
  memberRole: string;
  issuedByName: string;
  level: string;
  type: string;
  status: string;
  points: number;
  reason: string;
  issuedAt: string;
  appealStatus: string;
  appealDecision: string;
  appealDecisionNotes: string;
};

type ImprovementPlanItem = {
  warningId: string;
  memberName: string;
  problemSummary: string;
  desiredBehavior: string;
  durationDays: number;
  startDate: string;
  targetCompletionDate: string;
  finalDecision: string;
  finalNotes: string;
  isActive: boolean;
};

export default function ExportComplianceReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"roster" | "warnings" | "pips">("roster");

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [memberRoster, setMemberRoster] = useState<MemberRosterItem[]>([]);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [improvementPlans, setImprovementPlans] = useState<ImprovementPlanItem[]>([]);

  const fetchReportData = async (month: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/hr/report?format=json&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary);
        setMemberRoster(json.memberRoster || []);
        setWarnings(json.warnings || []);
        setImprovementPlans(json.improvementPlans || []);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReportData(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  const handleDownloadCsv = () => {
    window.open(`/api/hr/report?format=csv&month=${selectedMonth}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition"
      >
        <FileSpreadsheet size={16} />
        <span>Export Monthly Report (تصدير التقرير الشهري)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Official Compliance & HR Report (التقرير الشهري للإدارة العليا)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Attendance, discipline, warning dockets & improvement plan compliance
                  </p>
                </div>
              </div>

              {/* Month Selector + Close */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                  <Calendar size={13} className="text-zinc-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-zinc-800 outline-none dark:text-zinc-200"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-emerald-600" />
                  <span className="text-xs font-semibold">Generating comprehensive compliance report...</span>
                </div>
              ) : summary ? (
                <>
                  {/* Executive Summary Cards */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <Users size={15} className="text-blue-500" />
                        Active Members
                      </div>
                      <p className="text-2xl font-bold text-zinc-950 dark:text-white">
                        {summary.stats.activeMembersCount}{" "}
                        <span className="text-xs font-normal text-zinc-400">
                          / {summary.stats.totalMembers} total
                        </span>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <CheckCircle2 size={15} className="text-emerald-500" />
                        Overall Attendance
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {summary.stats.overallAttendanceRate}%
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {summary.stats.overallUnexcusedAbsences} unexcused absence(s)
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <AlertTriangle size={15} className="text-amber-500" />
                        Active Warnings
                      </div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {summary.stats.activeWarningsCount}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {summary.stats.openAppealsCount} appeal(s) under review
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <Shield size={15} className="text-purple-500" />
                        Improvement Plans (PIPs)
                      </div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {summary.stats.activeImprovementPlansCount} Active
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Under HR monitoring</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab("roster")}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        activeTab === "roster"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      }`}
                    >
                      1. Attendance & Discipline Roster ({memberRoster.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("warnings")}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        activeTab === "warnings"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      }`}
                    >
                      2. Warnings & Appeals Log ({warnings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("pips")}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        activeTab === "pips"
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      }`}
                    >
                      3. Improvement Plans ({improvementPlans.length})
                    </button>
                  </div>

                  {/* Tab 1: Member Roster */}
                  {activeTab === "roster" && (
                    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-zinc-200 bg-zinc-50/80 font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                          <tr>
                            <th className="p-3">Member</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Meetings</th>
                            <th className="p-3">Present / Late</th>
                            <th className="p-3">Excused</th>
                            <th className="p-3">Unexcused</th>
                            <th className="p-3">Attendance %</th>
                            <th className="p-3">Warnings</th>
                            <th className="p-3">Standing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                          {memberRoster.map((m) => (
                            <tr key={m._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                              <td className="p-3 font-semibold text-zinc-950 dark:text-white">
                                {m.name}
                                <span className="block text-[10px] font-normal text-zinc-400">
                                  {m.email}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                  {m.role}
                                </span>
                              </td>
                              <td className="p-3 font-bold">{m.totalInvited}</td>
                              <td className="p-3 text-emerald-600 font-semibold">
                                {m.presentCount} {m.lateCount > 0 ? `(+${m.lateCount} late)` : ""}
                              </td>
                              <td className="p-3 text-blue-600">{m.excusedCount}</td>
                              <td className="p-3">
                                <span
                                  className={`font-bold ${
                                    m.absentCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-400"
                                  }`}
                                >
                                  {m.absentCount}
                                </span>
                              </td>
                              <td className="p-3 font-bold">
                                <span
                                  className={
                                    m.attendanceRate >= 80
                                      ? "text-emerald-600"
                                      : m.attendanceRate >= 60
                                      ? "text-amber-600"
                                      : "text-rose-600"
                                  }
                                >
                                  {m.attendanceRate}%
                                </span>
                              </td>
                              <td className="p-3 font-semibold">
                                {m.activeWarningsCount > 0 ? (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                    {m.activeWarningsCount} ({m.totalPoints} pts)
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 text-[11px]">0</span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                                {m.complianceStanding}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 2: Warnings & Appeals Log */}
                  {activeTab === "warnings" && (
                    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      {warnings.length === 0 ? (
                        <div className="py-10 text-center text-xs text-zinc-500">
                          No warnings recorded for this period.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-zinc-200 bg-zinc-50/80 font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                            <tr>
                              <th className="p-3">Member</th>
                              <th className="p-3">Level / Scope</th>
                              <th className="p-3">Reason</th>
                              <th className="p-3">Issued Date</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Appeal Status</th>
                              <th className="p-3">Decision</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                            {warnings.map((w) => (
                              <tr key={w.warningId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                                <td className="p-3 font-semibold text-zinc-950 dark:text-white">
                                  {w.memberName}
                                  <span className="block text-[10px] font-normal text-zinc-400">
                                    {w.memberRole}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-rose-600">{w.level}</span>
                                  <span className="block text-[10px] text-zinc-400">{w.type}</span>
                                </td>
                                <td className="p-3 max-w-xs text-[11px] text-zinc-600 dark:text-zinc-400">
                                  {w.reason}
                                </td>
                                <td className="p-3 text-[11px] text-zinc-500">
                                  {w.issuedAt ? new Date(w.issuedAt).toLocaleDateString("en-GB") : "-"}
                                </td>
                                <td className="p-3">
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold dark:bg-zinc-800">
                                    {w.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {w.appealStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-[11px]">
                                  {w.appealDecision}
                                  {w.appealDecisionNotes && (
                                    <span className="block text-[10px] text-zinc-400">
                                      {w.appealDecisionNotes}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Performance Improvement Plans */}
                  {activeTab === "pips" && (
                    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      {improvementPlans.length === 0 ? (
                        <div className="py-10 text-center text-xs text-zinc-500">
                          No members currently undergoing structured performance improvement plans.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-zinc-200 bg-zinc-50/80 font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                            <tr>
                              <th className="p-3">Member</th>
                              <th className="p-3">Problem Summary</th>
                              <th className="p-3">Desired Behavior</th>
                              <th className="p-3">Timeline</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Outcome Decision</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                            {improvementPlans.map((p) => (
                              <tr key={p.warningId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                                <td className="p-3 font-semibold text-zinc-950 dark:text-white">
                                  {p.memberName}
                                </td>
                                <td className="p-3 max-w-xs text-zinc-600 dark:text-zinc-400">
                                  {p.problemSummary}
                                </td>
                                <td className="p-3 max-w-xs text-zinc-600 dark:text-zinc-400">
                                  {p.desiredBehavior}
                                </td>
                                <td className="p-3 text-[11px] text-zinc-500">
                                  {p.durationDays} days (Due:{" "}
                                  {p.targetCompletionDate
                                    ? new Date(p.targetCompletionDate).toLocaleDateString("en-GB")
                                    : "-"}
                                  )
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      p.isActive
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    }`}
                                  >
                                    {p.isActive ? "In Progress" : "Closed"}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold">
                                  {p.finalDecision}
                                  {p.finalNotes && (
                                    <span className="block text-[10px] font-normal text-zinc-400">
                                      {p.finalNotes}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-xs text-zinc-500">
                Official document for Infinity Explorers Executive Leadership
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <Printer size={15} />
                  <span>Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Download size={15} />
                  <span>Download Excel / CSV</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
