import mongoose, { Schema, models, model } from "mongoose";

// Prevent Next.js hot-reload stale schema caching in development
if (process.env.NODE_ENV === "development" && models.Project) {
  delete models.Project;
}

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Planning", "Active", "Completed"],
      default: "Planning",
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    lead: {
      type: String,
      required: true,
      trim: true,
    },

    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Member",
      },
    ],

    memberRoster: [
      {
        memberId: {
          type: Schema.Types.ObjectId,
          ref: "Member",
          required: true,
        },
        projectRole: {
          type: String,
          enum: [
            "Project Lead",
            "Core Contributor",
            "Specialist",
            "Reviewer",
            "Observer",
          ],
          default: "Core Contributor",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["Active", "On Leave", "Suspended", "Removed"],
          default: "Active",
        },
      },
    ],

    members: {
      type: Number,
      default: 1,
      min: 1,
    },

    dueDate: {
      type: String,
      required: true,
    },

    workspaceId: {
      type: String,
      default: "infinity-explorers",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Project = models.Project || model("Project", projectSchema);

export default Project;
