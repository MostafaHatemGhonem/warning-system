import mongoose, { Schema, models, model } from "mongoose";

if (process.env.NODE_ENV === "development" && models.Meeting) {
  delete (models as Record<string, unknown>).Meeting;
}

const attendeeSchema = new Schema(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "present", "absent", "excused", "late"],
      default: "pending",
    },
    excuseReason: {
      type: String,
      default: "",
      trim: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true },
);

const meetingSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "Sprint_Sync",
        "Project_Review",
        "General_Meeting",
        "Emergency_Session",
        "One_On_One",
      ],
      default: "Sprint_Sync",
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationMinutes: {
      type: Number,
      default: 45,
      min: 10,
      max: 480,
    },

    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "Online",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Scheduled", "In_Progress", "Completed", "Cancelled"],
      default: "Scheduled",
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    agenda: [
      {
        type: String,
        trim: true,
      },
    ],

    minutesOfMeeting: {
      type: String,
      default: "",
      trim: true,
    },

    attendees: [attendeeSchema],

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

const Meeting = models.Meeting || model("Meeting", meetingSchema);

export default Meeting;
