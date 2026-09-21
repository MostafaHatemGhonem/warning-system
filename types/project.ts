/**
 * Shared Project types — single source of truth.
 * Must match the Mongoose schema enum in models/project.ts.
 */

export type ProjectStatus = "Planning" | "Active" | "Completed";

export type ProjectLeader = {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
};

export type ProjectRole =
  | "Project Lead"
  | "Core Contributor"
  | "Specialist"
  | "Reviewer"
  | "Observer";

export type ProjectMember = {
  _id: string;
  name: string;
  email?: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
  projectRole?: ProjectRole;
  joinedAt?: string;
  status?: string;
};

export type MemberRosterItem = {
  _id?: string;
  memberId: string | ProjectMember;
  projectRole: ProjectRole;
  joinedAt: string;
  status: "Active" | "On Leave" | "Suspended" | "Removed";
};

export type Project = {
  /** MongoDB ObjectId as string */
  _id?: string;
  /** Client-side alias for _id (used in list state) */
  id?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  lead: string;
  leadId?: string | ProjectLeader | null;
  teamMembers?: Array<string | ProjectMember>;
  memberRoster?: MemberRosterItem[];
  members: number;
  dueDate: string;
  workspaceId?: string;
  discordWebhookUrl?: string | null;
  hasDiscordWebhook?: boolean;
  maskedDiscordWebhook?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
