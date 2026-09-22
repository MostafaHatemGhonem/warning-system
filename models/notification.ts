import mongoose, { Schema, models, model } from "mongoose";

// Prevent Next.js hot-reload stale schema caching in development
if (process.env.NODE_ENV === "development" && models.Notification) {
  delete models.Notification;
}

export type NotificationType =
  | "task_assigned"
  | "task_status"
  | "project_created"
  | "project_member_added"
  | "project_member_removed"
  | "warning_issued"
  | "appeal_decision"
  | "system";

export interface INotification {
  _id: string;
  recipient: mongoose.Types.ObjectId | string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  emailSent?: boolean;
  actor?: {
    _id?: string;
    name?: string;
    role?: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_status",
        "project_created",
        "project_member_added",
        "project_member_removed",
        "warning_issued",
        "appeal_decision",
        "system",
      ],
      default: "system",
      index: true,
    },

    link: {
      type: String,
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailSent: {
      type: Boolean,
      default: false,
      index: true,
    },

    actor: {
      _id: { type: Schema.Types.ObjectId, ref: "Member", default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
      avatar: { type: String, default: null },
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

const Notification = models.Notification || model("Notification", notificationSchema);

export default Notification;
