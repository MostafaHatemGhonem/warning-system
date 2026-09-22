import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Notification, { NotificationType } from "@/models/notification";

export type CreateNotificationParams = {
  recipientId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  actor?: {
    _id?: string | mongoose.Types.ObjectId;
    name?: string;
    role?: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  workspaceId?: string;
  emailSent?: boolean;
};

export type CreateBulkNotificationsParams = {
  recipientIds: (string | mongoose.Types.ObjectId)[];
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  actor?: {
    _id?: string | mongoose.Types.ObjectId;
    name?: string;
    role?: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  workspaceId?: string;
};

/**
 * Creates a single notification for a specific recipient.
 * Wrapped in try/catch to ensure non-blocking execution in API routes.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    if (!params.recipientId) return null;
    await connectToDatabase();

    const notif = await Notification.create({
      recipient: params.recipientId,
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type,
      link: params.link || null,
      actor: params.actor || null,
      metadata: params.metadata || {},
      workspaceId: params.workspaceId || "infinity-explorers",
      read: false,
      emailSent: Boolean(params.emailSent),
    });

    return notif;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Creates multiple notifications for a group of recipients simultaneously.
 */
export async function createBulkNotifications(params: CreateBulkNotificationsParams) {
  try {
    if (!params.recipientIds || params.recipientIds.length === 0) return [];
    await connectToDatabase();

    // Deduplicate recipients and exclude null/undefined
    const uniqueRecipients = Array.from(
      new Set(
        params.recipientIds
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    );

    if (uniqueRecipients.length === 0) return [];

    const docs = uniqueRecipients.map((recipientId) => ({
      recipient: recipientId,
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type,
      link: params.link || null,
      actor: params.actor || null,
      metadata: params.metadata || {},
      workspaceId: params.workspaceId || "infinity-explorers",
      read: false,
    }));

    const result = await Notification.insertMany(docs);
    return result;
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
    return [];
  }
}
