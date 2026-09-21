"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Plus,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";

type Attendee = {
  member: {
    _id: string;
    name: string;
    role?: string;
  };
  status: "pending" | "present" | "absent" | "excused" | "late";
  excuseReason?: string;
};

type Meeting = {
  _id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  status: string;
  attendees: Attendee[];
};

export default function ProjectMeetingsSection({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAttendanceMeeting, setActiveAttendanceMeeting] = useState<Meeting | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const fetchProjectMeetings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/meetings?projectId=${projectId}`);
      if (res.ok) {
        const json = await res.json();
        setMeetings(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectMeetings();
  }, [projectId]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Project Meetings & Attendance (اجتماعات وحضور المشروع)
            </h2>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              {meetings.length} Session{meetings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Sprint reviews, sync sessions, and attendee presence tracking for {projectName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsScheduleOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <Plus size={15} />
          Schedule Sync
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
          <CalendarDays className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-1" />
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            No meetings scheduled yet for this project
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Click &quot;Schedule Sync&quot; to arrange your first team session.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {meetings.map((m) => {
            const mDate = new Date(m.scheduledAt);
            const presentCount = m.attendees.filter(
              (a) => a.status === "present" || a.status === "late",
            ).length;

            return (
              <div
                key={m._id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                      {m.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        m.status === "Completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {mDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 size={12} />
                      {mDate.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>({m.durationMinutes}m)</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Attendance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {presentCount}/{m.attendees.length} present
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/60 pt-2.5 dark:border-zinc-800/80">
                  {m.meetingLink ? (
                    <a
                      href={m.meetingLink.startsWith("http") ? m.meetingLink : `https://${m.meetingLink}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <Video size={12} />
                      Join Link
                    </a>
                  ) : (
                    <span className="text-[10px] text-zinc-400">Room Sync</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveAttendanceMeeting(m)}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                  >
                    <UserCheck size={11} />
                    Take Attendance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Schedule Modal */}
      {isScheduleOpen && (
        <QuickProjectScheduleModal
          projectId={projectId}
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          onCreated={() => {
            fetchProjectMeetings();
            setIsScheduleOpen(false);
          }}
        />
      )}

      {/* Attendance Modal */}
      {activeAttendanceMeeting && (
        <QuickProjectAttendanceModal
          meeting={activeAttendanceMeeting}
          isOpen={Boolean(activeAttendanceMeeting)}
          onClose={() => setActiveAttendanceMeeting(null)}
          onSaved={() => {
            fetchProjectMeetings();
            setActiveAttendanceMeeting(null);
          }}
        />
      )}
    </section>
  );
}

function QuickProjectScheduleModal({
  projectId,
  isOpen,
  onClose,
  onCreated,
}: {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingLink, setMeetingLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project: projectId,
          type: "Sprint_Sync",
          scheduledAt,
          durationMinutes,
          meetingLink,
        }),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      onCreated();
    } catch (err: any) {
      alert(err.message || "Failed to schedule meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
            Schedule Project Sync
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Title *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Progress & Blocker Check"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
                Duration (mins)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1">
              Call Link
            </label>
            <input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            >
              {isSubmitting ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickProjectAttendanceModal({
  meeting,
  isOpen,
  onClose,
  onSaved,
}: {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [attendees, setAttendees] = useState(
    meeting.attendees.map((a) => ({
      memberId: a.member?._id,
      name: a.member?.name || "Member",
      status: a.status,
      excuseReason: a.excuseReason || "",
    })),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const updateStatus = (index: number, status: any) => {
    setAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, status } : a)),
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
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
            Record Attendance: {meeting.title}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-4 space-y-2.5">
          {attendees.map((a, idx) => (
            <div
              key={a.memberId || idx}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                {a.name}
              </span>
              <div className="flex items-center gap-1">
                {(["present", "late", "excused", "absent"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateStatus(idx, st)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize transition ${
                      a.status === st
                        ? st === "present"
                          ? "bg-emerald-600 text-white"
                          : st === "late"
                          ? "bg-amber-600 text-white"
                          : st === "excused"
                          ? "bg-blue-600 text-white"
                          : "bg-rose-600 text-white"
                        : "bg-white border border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="rounded-xl bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
          >
            {isSubmitting ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}
