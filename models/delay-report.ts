import mongoose, { Schema, models, model } from "mongoose";

if (process.env.NODE_ENV === "development" && models.DelayReport) {
  delete (models as Record<string, unknown>).DelayReport;
}

const delayReportSchema = new Schema(
  {
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

    originalDueDate: {
      type: Date,
      required: true,
    },

    proposedNewDueDate: {
      type: Date,
      required: true,
    },

    delayReasonCategory: {
      type: String,
      enum: [
        "Technical_Dependency",
        "External_Blocker",
        "Scope_Change",
        "Resource_Shortage",
        "Personal_Excuse",
        "Other",
      ],
      default: "Technical_Dependency",
    },

    reasonDetails: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },

    impactLevel: {
      type: String,
      enum: ["Low", "Moderate", "High", "Critical"],
      default: "Moderate",
    },

    mitigationPlan: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNotes: {
      type: String,
      default: "",
      trim: true,
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

const DelayReport = models.DelayReport || model("DelayReport", delayReportSchema);

export default DelayReport;
