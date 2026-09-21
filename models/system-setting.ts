import mongoose, { Schema, models, model } from "mongoose";

if (process.env.NODE_ENV === "development" && models.SystemSetting) {
  delete models.SystemSetting;
}

const systemSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const SystemSetting =
  models.SystemSetting || model("SystemSetting", systemSettingSchema);

export default SystemSetting;
