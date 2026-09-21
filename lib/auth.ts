import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Member, { MemberRole } from "@/models/member";
import Session, { ISession } from "@/models/session";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_DURATION_DAYS = 7;
export const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export type SafeMember = {
  _id: string;
  name: string;
  email: string;
  role: MemberRole;
  isCommitteeMember?: boolean;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionValidationResult = {
  session: ISession;
  member: SafeMember;
} | null;

// ─── Password Utilities ───────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

// ─── Token Utilities ──────────────────────────────────────────────────────────
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Session Lifecycle ────────────────────────────────────────────────────────
export async function createSession(
  memberId: string | mongoose.Types.ObjectId,
): Promise<{ token: string; expiresAt: Date; session: ISession }> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await Session.create({
    memberId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt, session };
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  if (!token) return null;

  await connectToDatabase();

  const tokenHash = hashSessionToken(token);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await Session.findByIdAndDelete(session._id);
    return null;
  }

  // Retrieve member associated with this session (excluding passwordHash)
  const member = await Member.findById(session.memberId).lean<SafeMember>();

  if (!member || !member.isActive) {
    await Session.findByIdAndDelete(session._id);
    return null;
  }

  // Sliding window extension: if session is more than half expired, extend it
  const halfDuration = SESSION_DURATION_MS / 2;
  if (session.expiresAt.getTime() - Date.now() < halfDuration) {
    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await session.save();
  }

  return {
    session,
    member: {
      _id: member._id.toString(),
      name: member.name,
      email: member.email,
      role: member.role,
      isCommitteeMember: Boolean(member.isCommitteeMember),
      avatar: member.avatar,
      isActive: member.isActive,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    },
  };
}

export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  await connectToDatabase();
  const tokenHash = hashSessionToken(token);
  await Session.deleteOne({ tokenHash });
}

export async function invalidateAllMemberSessions(
  memberId: string | mongoose.Types.ObjectId,
): Promise<void> {
  await connectToDatabase();
  await Session.deleteMany({ memberId });
}

// ─── Cookie Utilities (Next.js Server Context) ────────────────────────────────
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentMember(): Promise<SafeMember | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const result = await validateSessionToken(token);
  if (!result) return null;

  return result.member;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = await getSessionTokenFromCookie();
  if (token) {
    await invalidateSession(token);
  }
  await deleteSessionCookie();
}
