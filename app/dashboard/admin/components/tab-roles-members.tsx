"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Crown,
  Edit2,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserCog,
  UserX,
  X,
} from "lucide-react";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  isCommitteeMember?: boolean;
  createdAt: string;
};

type TabRolesMembersProps = {
  members: Member[];
  roleBreakdown: {
    superAdmin: number;
    admin: number;
    hr: number;
    committee: number;
    teamLeader: number;
    member: number;
    committeeSeats: number;
  };
  isSuperAdmin: boolean;
  onRefresh: () => void;
};

const ROLES = ["Super Admin", "Admin", "HR", "Committee", "Team Leader", "Member"];

export default function TabRolesMembers({
  members,
  roleBreakdown,
  isSuperAdmin,
  onRefresh,
}: TabRolesMembersProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Filter members
  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleRoleChangeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember || !newRole) return;
    if (newRole === editingMember.role) {
      setEditingMember(null);
      return;
    }

    try {
      setIsUpdating(true);
      setActionError(null);

      const res = await fetch(`/api/members/${editingMember._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: newRole,
          overrideReason: changeReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update member role.");
      }

      setEditingMember(null);
      setChangeReason("");
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Error updating role.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggleStatus(member: Member) {
    try {
      setTogglingStatusId(member._id);
      setActionError(null);

      const res = await fetch(`/api/members/${member._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !member.isActive,
          overrideReason: `Status toggled to ${!member.isActive ? "Active" : "Inactive"} by executive administrator`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status.");
      }

      onRefresh();
    } catch (err: any) {
      setActionError(err.message || "Error toggling status.");
    } finally {
      setTogglingStatusId(null);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div
          onClick={() => setRoleFilter("Super Admin")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "Super Admin"
              ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Super Admin</span>
            <Crown className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.superAdmin}</p>
        </div>

        <div
          onClick={() => setRoleFilter("Admin")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "Admin"
              ? "border-purple-400 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-400">
            <span className="font-semibold">Admin</span>
            <Shield className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.admin}</p>
        </div>

        <div
          onClick={() => setRoleFilter("HR")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "HR"
              ? "border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-teal-700 dark:text-teal-400">
            <span className="font-semibold">HR</span>
            <UserCog className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.hr}</p>
        </div>

        <div
          onClick={() => setRoleFilter("Committee")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "Committee"
              ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400">
            <span className="font-semibold">Committee</span>
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.committee}</p>
        </div>

        <div
          onClick={() => setRoleFilter("Team Leader")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "Team Leader"
              ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400">
            <span className="font-semibold">Team Leader</span>
            <UserCheck className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.teamLeader}</p>
        </div>

        <div
          onClick={() => setRoleFilter("Member")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "Member"
              ? "border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold">Member</span>
            <UserCheck className="h-3.5 w-3.5" />
          </div>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{roleBreakdown.member}</p>
        </div>

        <div
          onClick={() => setRoleFilter("ALL")}
          className={`cursor-pointer rounded-xl border p-3 transition ${
            roleFilter === "ALL"
              ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">All Roles</span>
            <span>Total</span>
          </div>
          <p className="mt-1 text-xl font-bold">{members.length}</p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
          {actionError}
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member by name or email..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Showing <span className="font-bold text-zinc-900 dark:text-white">{filtered.length}</span> members
        </div>
      </div>

      {/* ── Members Table ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-100 bg-zinc-50/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Committee Seat</th>
                <th className="py-3 px-4 font-semibold">Account Status</th>
                <th className="py-3 px-4 font-semibold text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((m) => {
                const isSuper = m.role === "Super Admin";
                const isAdmin = m.role === "Admin";
                const isHR = m.role === "HR";

                return (
                  <tr key={m._id} className="transition hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{m.name}</p>
                          <p className="text-[11px] text-zinc-400">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          isSuper
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : isAdmin
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : isHR
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {m.isCommitteeMember ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Check className="h-3 w-3" /> Seated
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        disabled={togglingStatusId === m._id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                          m.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {togglingStatusId === m._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : m.isActive ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <UserX className="h-3 w-3" />
                        )}
                        <span>{m.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingMember(m);
                          setNewRole(m.role);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Edit2 className="h-3 w-3 text-zinc-400" />
                        <span>Edit Role</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Role Modal ─────────────────────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Modify Role for {editingMember.name}
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Select New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Administrative Justification (Recorded in Audit Log)
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for promoting or reassigning role..."
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Save Role Change</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
