"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Scale,
  ShieldAlert,
  User,
  UserPlus,
  Users,
} from "lucide-react";

type TiedCommittee = {
  _id: string;
  caseNumber: string;
  resourceType: string;
  resourceId?: any;
  status: string;
  decisionSummary?: string;
  createdAt: string;
  members: Array<{
    memberId: {
      _id: string;
      name: string;
      email: string;
      role: string;
      avatar?: string;
    };
    roleAtFormation: string;
  }>;
  votes?: Array<{
    memberId: string;
    vote: "Approve" | "Reject";
    reason: string;
  }>;
};

type Clause14Referral = {
  _id: string;
  type: string;
  level: string;
  points: number;
  status: string;
  project?: {
    _id: string;
    name: string;
  };
  member: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  issuedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  review?: {
    disciplinaryRecommendation?: string;
    reason?: string;
    requestedAt?: string;
  };
};

type Suspension = {
  _id: string;
  type: string;
  level: string;
  member: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  suspension?: {
    isSuspended: boolean;
    reason?: string;
    suspendedAt?: string;
    suspendedUntil?: string;
  };
  hoursLeft: number | null;
  isExpired: boolean;
};

type TabDeadlocksProps = {
  tiedCommittees: TiedCommittee[];
  clause14Referrals: Clause14Referral[];
  suspensions: Suspension[];
  isSuperAdmin: boolean;
  onOpenTieBreak: (committee: TiedCommittee) => void;
};

export default function TabDeadlocks({
  tiedCommittees,
  clause14Referrals,
  suspensions,
  isSuperAdmin,
  onOpenTieBreak,
}: TabDeadlocksProps) {
  return (
    <div className="space-y-8">
      
      {/* ── SECTION 1: Tied Committees ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Scale className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Deadlocked Committees (Tied Cases)
            </h2>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {tiedCommittees.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Requires Super Admin to appoint a tie-breaking member and reopen voting.
          </p>
        </div>

        {tiedCommittees.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-10 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No Deadlocked Committees</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              All seated committees have decisive majorities or are actively conducting votes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {tiedCommittees.map((committee) => (
              <div
                key={committee._id}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                        {committee.caseNumber}
                      </span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                        STATUS: TIED
                      </span>
                      <span className="text-xs text-zinc-500">
                        Scope: {committee.resourceType}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {committee.decisionSummary || "Vote results are tied. Committee voting deadlocked."}
                    </p>
                  </div>
                </div>

                {/* Seated Members & Votes */}
                <div className="mt-4 border-t border-rose-200/60 pt-3 dark:border-rose-900/40">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium">Seated Members ({committee.members.length}):</span>
                    <span>Created {new Date(committee.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {committee.members.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <User className="h-3 w-3 opacity-60" />
                        {m.memberId?.name || "Member"} ({m.roleAtFormation || "Role"})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 flex items-center justify-end gap-3 pt-2">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => onOpenTieBreak(committee)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Break Deadlock (Appoint Member)</span>
                    </button>
                  ) : (
                    <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                      Super Admin authorization required to expand committee
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Clause 14 Removals ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Clause 14 Project Removal Referrals
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {clause14Referrals.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Unilateral removal prohibited. Requires committee recommendation and executive oversight.
          </p>
        </div>

        {clause14Referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-8 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No Clause 14 Removal Referrals</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              No project leads have referred members for formal removal review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clause14Referrals.map((w) => (
              <div
                key={w._id}
                className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                      {w.member?.name || "Unknown Member"}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{w.member?.email}</p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {w.level}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  <p>
                    <span className="font-semibold">Project:</span> {w.project?.name || "General Workspace"}
                  </p>
                  <p>
                    <span className="font-semibold">Referred By:</span> {w.issuedBy?.name || "Team Lead"} ({w.issuedBy?.role})
                  </p>
                  {w.review?.reason && (
                    <p className="rounded-lg bg-zinc-50 p-2 text-[11px] italic text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                      &ldquo;{w.review.reason}&rdquo;
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
                  <span className="font-mono text-[11px] text-zinc-400">Points: {w.points}</span>
                  <Link
                    href={`/dashboard/warnings`}
                    className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline dark:text-amber-400"
                  >
                    <span>View Warning</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3: Active Suspensions (48h SLA) ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Active Suspensions (48h Emergency SLA)
            </h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              {suspensions.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Emergency precautionary suspensions must be reviewed within 48 hours.
          </p>
        </div>

        {suspensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-8 px-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">No Active Suspensions</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Zero accounts currently under precautionary temporary suspension.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suspensions.map((s) => (
              <div
                key={s._id}
                className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900/40 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{s.member?.name}</h3>
                    <p className="text-xs text-zinc-500">{s.member?.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.isExpired
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    }`}
                  >
                    {s.isExpired ? "SLA EXPIRED" : `${s.hoursLeft}h remaining`}
                  </span>
                </div>

                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">Suspension Reason:</p>
                  <p className="mt-1 rounded-lg bg-zinc-50 p-2 text-[11px] italic text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    &ldquo;{s.suspension?.reason || "Precautionary disciplinary review"}&rdquo;
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-400">Max SLA: 48h limit</span>
                  <Link
                    href={`/dashboard/warnings`}
                    className="inline-flex items-center gap-1 font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    <span>Manage Case</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
