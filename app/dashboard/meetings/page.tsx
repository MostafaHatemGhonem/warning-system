"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  Plus,
  Search,
  UserCheck,
  Users,
  Video,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/layout/dashboard-shell";

type Attendee = {
  _id?: string;
  member: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    avatar?: string;
  };
  status: "pending" | "present" | "absent" | "excused" | "late";
  excuseReason?: string;
  checkInAt?: string;
  notes?: string;
};

type MeetingItem = {
  _id: string;
  title: string;
  description: string;
  project?: {
    _id: string;
    name: string;
    lead: string;
    status: string;
  } | null;
  type: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  location?: string;
  status: "Scheduled" | "In_Progress" | "Completed" | "Cancelled";
  createdBy: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  agenda?: string[];
  minutesOfMeeting?: string;
  attendees: Attendee[];
  createdAt: string;
};

type ProjectOption = {
  _id: string;
  name: string;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState<MeetingItem | null>(null);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/meetings");
      if (res.ok) {
        const json = await res.json();
        setMeetings(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load meetings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch projects for filters and creation
  useEffect(() => {
    fetchMeetings();
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json.data || [];
          setProjects(list.map((p: any) => ({ _id: p._id || p.id, name: p.name })));
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    }
    loadProjects();
  }, []);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.project?.name || "").toLowerCase().includes(search.toLowerCase());

      const matchesProject =
        filterProject === "ALL" || (m.project && m.project._id === filterProject);

      const matchesStatus =
        filterStatus === "ALL" || m.status === filterStatus;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [meetings, search, filterProject, filterStatus]);

  // High-level statistics
  const stats = useMemo(() => {
    const total = meetings.length;
    const upcoming = meetings.filter((m) => m.status === "Scheduled").length;
    const completed = meetings.filter((m) => m.status === "Completed").length;

    let totalAttendanceSlots = 0;
    let presentSlots = 0;
    let unexcusedAbsences = 0;

    meetings.forEach((m) => {
      m.attendees.forEach((a) => {
        if (a.status !== "pending") {
          totalAttendanceSlots++;
          if (a.status === "present" || a.status === "late") {
            presentSlots++;
          }
          if (a.status === "absent") {
            unexcusedAbsences++;
          }
        }
      });
    });

    const attendanceRate =
      totalAttendanceSlots > 0
        ? Math.round((presentSlots / totalAttendanceSlots) * 100)
        : 100;

    return { total, upcoming, completed, attendanceRate, unexcusedAbsences };
  }, [meetings]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
                Meetings & Attendance (الاجتماعات والحضور)
              </h1>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Schedule project syncs, take attendee attendance, and track team commitment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Plus size={16} />
            Schedule Meeting
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <Calendar size={16} className="text-blue-500" />
              Upcoming Meetings
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {stats.upcoming}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Completed Sessions
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {stats.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <UserCheck size={16} className="text-purple-500" />
              Overall Attendance Rate
            </div>
            <p className="text-2xl font-bold text-zinc-950 dark:text-white">
              {stats.attendanceRate}%
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <AlertCircle size={16} className="text-rose-500" />
              Unexcused Absences
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.unexcusedAbsences}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings by title or project..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-950 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Meetings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-800">
            <CalendarDays className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              No meetings found
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Schedule your first team sync or project review session.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map((m) => {
              const meetingDate = new Date(m.scheduledAt);
              const isPast = meetingDate < new Date();
              const presentCount = m.attendees.filter(
                (a) => a.status === "present" || a.status === "late",
              ).length;

              return (
                <div
                  key={m._id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div>
                    {/* Header: Project Badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {m.project ? m.project.name : "General Team Sync"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          m.status === "Completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : m.status === "Scheduled"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-zinc-950 dark:text-white">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                        {m.description}
                      </p>
                    )}

                    {/* Date, Time & Duration */}
                    <div className="mt-4 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-zinc-400" />
                        <span>
                          {meetingDate.toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 size={14} className="text-zinc-400" />
                        <span>
                          {meetingDate.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({m.durationMinutes} mins)
                        </span>
                      </div>
                    </div>

                    {/* Attendees & Attendance Status */}
                    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-zinc-500">
                          <Users size={14} />
                          Attendees ({m.attendees.length})
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {presentCount}/{m.attendees.length} present
                        </span>
                      </div>

                      {/* Small avatar list */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {m.attendees.slice(0, 6).map((a) => {
                          const statusColor =
                            a.status === "present"
                              ? "ring-emerald-500 bg-emerald-50 text-emerald-700"
                              : a.status === "late"
                              ? "ring-amber-500 bg-amber-50 text-amber-700"
                              : a.status === "excused"
                              ? "ring-blue-500 bg-blue-50 text-blue-700"
                              : a.status === "absent"
                              ? "ring-rose-500 bg-rose-50 text-rose-700"
                              : "ring-zinc-300 bg-zinc-100 text-zinc-600";

                          return (
                            <span
                              key={a.member?._id || Math.random()}
                              title={`${a.member?.name || "Member"} (${a.status})`}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ${statusColor}`}
                            >
                              {(a.member?.name || "M").charAt(0).toUpperCase()}
                            </span>
                          );
                        })}
                        {m.attendees.length > 6 && (
                          <span className="text-[10px] font-semibold text-zinc-400">
                            +{m.attendees.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                    {m.meetingLink ? (
                      <a
                        href={m.meetingLink.startsWith("http") ? m.meetingLink : `https://${m.meetingLink}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        <Video size={13} className="text-blue-500" />
                        Join Call
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-400">In Person / Online</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setAttendanceMeeting(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      <UserCheck size={13} />
                      Attendance (تسجيل الحضور)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Attendance Modal */}
      {attendanceMeeting && (
        <AttendanceModal
          meeting={attendanceMeeting}
          isOpen={Boolean(attendanceMeeting)}
          onClose={() => setAttendanceMeeting(null)}
          onUpdated={(updated) => {
            setMeetings((prev) =>
              prev.map((m) => (m._id === updated._id ? updated : m)),
            );
            setAttendanceMeeting(null);
          }}
        />
      )}

      {/* Schedule Meeting Modal */}
      {isCreateOpen && (
        <CreateMeetingModal
          projects={projects}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newMeeting) => {
            setMeetings((prev) => [newMeeting, ...prev]);
            setIsCreateOpen(false);
          }}
        />
      )}
    </DashboardShell>
  );
}

// ─── Attendance Modal ────────────────────────────────────────────────────────
function AttendanceModal({
  meeting,
  isOpen,
  onClose,
  onUpdated,
}: {
  meeting: MeetingItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: MeetingItem) => void;
}) {
  const [attendees, setAttendees] = useState<
    Array<{
      memberId: string;
      name: string;
      role: string;
      status: "pending" | "present" | "absent" | "excused" | "late";
      excuseReason: string;
      notes: string;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (meeting) {
      setAttendees(
        meeting.attendees.map((a) => ({
          memberId: a.member?._id || "",
          name: a.member?.name || "Member",
          role: a.member?.role || "Member",
          status: a.status || "pending",
          excuseReason: a.excuseReason || "",
          notes: a.notes || "",
        })),
      );
    }
  }, [meeting]);

  if (!isOpen) return null;

  const updateStatus = (
    index: number,
    newStatus: "pending" | "present" | "absent" | "excused" | "late",
  ) => {
    setAttendees((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: newStatus } : item)),
    );
  };

  const updateExcuse = (index: number, text: string) => {
    setAttendees((prev) =>
      prev.map((item, i) => (i === index ? { ...item, excuseReason: text } : item)),
    );
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/meetings/${meeting._id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: attendees.map((a) => ({
            memberId: a.memberId,
            status: a.status,
            excuseReason: a.excuseReason,
            notes: a.notes,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save attendance");
      const json = await res.json();
      onUpdated(json.data);
    } catch (err: any) {
      alert(err.message || "Failed to save attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Take Attendance: {meeting.title}
            </h2>
            <p className="text-xs text-zinc-500">
              Record attendance statuses for {attendees.length} invited member(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Attendance items */}
        <div className="max-h-96 overflow-y-auto p-6 space-y-3">
          {attendees.map((att, idx) => (
            <div
              key={att.memberId || idx}
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-zinc-950 dark:text-white">
                    {att.name}
                  </p>
                  <p className="text-[10px] text-zinc-500">{att.role}</p>
                </div>

                {/* Status toggle buttons */}
                <div className="flex items-center gap-1">
                  {(
                    [
                      { key: "present", label: "Present (حاضر)", color: "emerald" },
                      { key: "late", label: "Late (متأخر)", color: "amber" },
                      { key: "excused", label: "Excused (معذور)", color: "blue" },
                      { key: "absent", label: "Absent (غائب)", color: "rose" },
                    ] as const
                  ).map((st) => {
                    const isSelected = att.status === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => updateStatus(idx, st.key)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                          isSelected
                            ? st.color === "emerald"
                              ? "bg-emerald-600 text-white"
                              : st.color === "amber"
                              ? "bg-amber-600 text-white"
                              : st.color === "blue"
                              ? "bg-blue-600 text-white"
                              : "bg-rose-600 text-white"
                            : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Excuse input if excused or late or absent */}
              {(att.status === "excused" || att.status === "absent" || att.status === "late") && (
                <input
                  type="text"
                  value={att.excuseReason}
                  onChange={(e) => updateExcuse(idx, e.target.value)}
                  placeholder={
                    att.status === "excused"
                      ? "Reason for excuse (سبب العذر المقبول)..."
                      : att.status === "absent"
                      ? "Absence reason / Policy notes (ملاحظة الغياب بدون إذن)..."
                      : "Reason for delay (سبب التأخير)..."
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Save Attendance</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Meeting Modal ───────────────────────────────────────────────────
function CreateMeetingModal({
  projects,
  isOpen,
  onClose,
  onCreated,
}: {
  projects: ProjectOption[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newMeeting: MeetingItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [type, setType] = useState("Sprint_Sync");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingLink, setMeetingLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      setError("Please fill in meeting title and date/time");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          project: project || null,
          type,
          scheduledAt,
          durationMinutes,
          meetingLink,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to schedule meeting");

      onCreated(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">
            Schedule New Meeting
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Radar Sprint Review"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Project
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              >
                <option value="">General (No project)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Meeting Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              >
                <option value="Sprint_Sync">Sprint Sync</option>
                <option value="Project_Review">Project Review</option>
                <option value="General_Meeting">General Meeting</option>
                <option value="Emergency_Session">Emergency Session</option>
                <option value="One_On_One">1-on-1 Session</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={10}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Call Link (Google Meet / Zoom / Teams)
            </label>
            <input
              type="text"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda or purpose..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Schedule & Notify</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
