import mongoose, { Schema, models, model } from "mongoose";

if (process.env.NODE_ENV === "development" && models.Blocker) {
  delete (models as Record<string, unknown>).Blocker;
}

const blockerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
    },

    status: {
      type: String,
      enum: ["Open", "In_Progress", "Resolved"],
      default: "Open",
      index: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    impactDescription: {
      type: String,
      default: "",
      trim: true,
    },

    resolutionNotes: {
      type: String,
      default: "",
      trim: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
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

const Blocker = models.Blocker || model("Blocker", blockerSchema);

export default Blocker;
