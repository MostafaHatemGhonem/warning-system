import mongoose, { Schema, model, models } from "mongoose";

const taskSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

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

    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

if (process.env.NODE_ENV === "development" && models.Task) {
  delete (models as Record<string, unknown>).Task;
}

const Task = models.Task || model("Task", taskSchema);

export default Task;
