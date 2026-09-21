"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Edit,
  Loader2,
  Mail,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserCircle2,
  Users,
  UserX,
  XCircle,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { MemberRole } from "@/models/member";
import AddMemberModal from "./components/add-member-modal";
import EditMemberModal from "./components/edit-member-modal";

// ─── Types ────────────────────────────────────────────────────────────────────
type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
};

type Member = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const roleConfig: Record<MemberRole, { label: string; bg: string; icon: typeof Shield }> = {
  "Super Admin": { label: "Super Admin", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", icon: Shield },
  Admin:         { label: "Admin",       bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", icon: Shield },
  Committee:     { label: "Committee",   bg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300", icon: Shield },
  HR:            { label: "HR",          bg: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300", icon: Shield },
  "Team Leader": { label: "Team Leader", bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",        icon: Shield },
  Member:        { label: "Member",      bg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",           icon: UserCircle2 },
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const [currentUser,       setCurrentUser]       = useState<CurrentUser | null>(null);
  const [members,           setMembers]           = useState<Member[]>([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [search,            setSearch]            = useState("");
  const [isAddOpen,         setIsAddOpen]         = useState(false);
  const [editingMember,     setEditingMember]     = useState<Member | null>(null);
  const [updatingMemberId,  setUpdatingMemberId]  = useState<string | null>(null);
  const [statusError,       setStatusError]       = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch current authenticated user
        fetch("/api/auth/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.success) setCurrentUser(d.data);
          })
          .catch(() => {});

        // Fetch all members
        const res = await fetch("/api/members");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to fetch");
        setMembers(json.data);
      } catch (err) {
        console.error(err);
        setError("Could not load members. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleToggleStatus = async (member: Member) => {
    if (member.role === "Super Admin") {
      alert("Super Admin accounts cannot be deactivated.");
      return;
    }

    if (currentUser?.role !== "Super Admin" && member.role === "Admin") {
      alert("Only Super Admins can deactivate Admin accounts.");
      return;
    }

    if (member._id === currentUser?._id && member.isActive) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const nextStatus = !member.isActive;

    const confirmed = window.confirm(
      nextStatus
        ? `Are you sure you want to activate ${member.name}?`
        : `Are you sure you want to deactivate ${member.name}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingMemberId(member._id);
      setStatusError(null);

      const response = await fetch(`/api/members/${member._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update member status");
      }

      setMembers((current) =>
        current.map((item) =>
          item._id === result.data._id ? result.data : item
        )
      );
    } catch (err) {
      console.error(err);
      setStatusError(
        err instanceof Error
          ? err.message
          : "Failed to update member status"
      );
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const canAddMember =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Team Leader" ||
    currentUser?.role === "HR" ||
    currentUser?.role === "Super Admin";

  const canEditMember =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Team Leader" ||
    currentUser?.role === "HR" ||
    currentUser?.role === "Super Admin";

  const canManageStatus =
    currentUser?.role === "Admin" ||
    currentUser?.role === "HR" ||
    currentUser?.role === "Super Admin";

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount   = members.filter((m) => m.isActive).length;
  const inactiveCount = members.length - activeCount;

  return (
    <DashboardShell userRole={currentUser?.role}>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Members</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {isLoading ? "Loading..." : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {canAddMember && (
            <button
              id="add-member-btn"
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Plus size={16} />
              Add Member
            </button>
          )}
        </div>

        {/* ── Stats cards ───────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Members",  value: members.length, icon: Users,        color: "text-zinc-500" },
            { label: "Active",         value: activeCount,    icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Inactive",       value: inactiveCount,  icon: XCircle,      color: "text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
                <Icon size={17} className={color} />
                {label}
              </div>
              <p className="text-2xl font-bold text-zinc-950 dark:text-white">
                {isLoading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search ────────────────────────────────────────────────────────── */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            id="member-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
        </div>

        {/* ── Status Error Banner ───────────────────────────────────────────── */}
        {statusError && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <span>{statusError}</span>
            <button
              type="button"
              onClick={() => setStatusError(null)}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Members table ─────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">

          {/* Loading */}
          {isLoading && <TableSkeleton />}

          {/* Load error */}
          {!isLoading && error && (
            <div className="p-10 text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && members.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                <Users size={24} />
              </div>
              <p className="font-medium text-zinc-950 dark:text-white">No members yet</p>
              <p className="mt-1 text-sm text-zinc-500">Add your first team member to get started.</p>
            </div>
          )}

          {/* No search results */}
          {!isLoading && !error && members.length > 0 && filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-zinc-500">No members match &quot;{search}&quot;</p>
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    {["Full Name", "Email", "Role", "Status", "Joined"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filtered.map((member) => {
                    const rc = roleConfig[member.role] ?? roleConfig.Member;
                    return (
                      <tr
                        key={member._id}
                        className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        {/* Member / Full Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {member.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                {initials(member.name)}
                              </div>
                            )}
                            <span className="font-medium text-zinc-950 dark:text-white">
                              {member.name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Mail size={14} />
                            {member.email}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rc.bg}`}>
                            {rc.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {member.isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CheckCircle2 size={12} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <XCircle size={12} />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-4 text-zinc-500">
                          {formatDate(member.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {canEditMember && (currentUser?.role === "Super Admin" || member.role !== "Super Admin") && (
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                disabled={updatingMemberId === member._id}
                                aria-label={`Edit ${member.name}`}
                                title="Edit member"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                              >
                                <Edit size={13} />
                                Edit
                              </button>
                            )}

                            {member.role === "Super Admin" ? (
                              <span
                                title="Super Admin accounts cannot be deactivated"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                <Shield size={12} />
                                Protected
                              </span>
                            ) : canManageStatus && (currentUser?.role === "Super Admin" || member.role !== "Admin") ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(member)}
                                disabled={updatingMemberId === member._id}
                                aria-label={`${member.isActive ? "Deactivate" : "Activate"} ${member.name}`}
                                title={member.isActive ? "Deactivate member" : "Activate member"}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                                  member.isActive
                                    ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                }`}
                              >
                                {updatingMemberId === member._id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : member.isActive ? (
                                  <UserX size={13} />
                                ) : (
                                  <UserCheck size={13} />
                                )}
                                {updatingMemberId === member._id
                                  ? "Updating…"
                                  : member.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <AddMemberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={(newMember) => setMembers((curr) => [newMember, ...curr])}
        currentUserRole={currentUser?.role}
      />

      <EditMemberModal
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onUpdated={(updated) => {
          setMembers((curr) =>
            curr.map((m) => (m._id === updated._id ? updated : m))
          );
        }}
        currentUserRole={currentUser?.role}
      />
    </DashboardShell>
  );
}
