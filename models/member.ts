import mongoose, { Schema, models, model } from "mongoose";

export const MEMBER_ROLES = [
  "Member",
  "Team Leader",
  "HR",
  "Committee",
  "Admin",
  "Super Admin",
] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

const memberSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: MEMBER_ROLES,
      default: "Member",
    },

    isCommitteeMember: {
      type: Boolean,
      default: false,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    passwordHash: {
      type: String,
      default: "",
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for workspace-scoped queries (ready for multi-tenant)
if (process.env.NODE_ENV === "development" && models.Member) {
  delete (models as Record<string, unknown>).Member;
}

const Member = models.Member || model("Member", memberSchema);

export default Member;
