/**
 * Discord Webhook Notification Helper
 * Provides ClickUp-style Discord notifications for tasks, webhook validation, and URL masking.
 */

import SystemSetting from "@/models/system-setting";

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  author?: {
    name: string;
    icon_url?: string;
    url?: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordNotificationResult {
  attempted: boolean;
  delivered: boolean;
  scope: "project" | "global" | "none";
  error?: string;
}

const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

/**
 * Validates whether a given string is a valid Discord webhook URL.
 */
export function isValidDiscordWebhookUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

/**
 * Masks a Discord webhook URL for safe display in UI/API responses.
 * Example: https://discord.com/api/webhooks/123456789/AbCdEfGhIjKlMnOp -> https://discord.com/api/webhooks/123456789/••••••••MnOp
 */
export function maskDiscordWebhookUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);
    // Path structure is typically /api/webhooks/{id}/{token}
    if (parts.length >= 4) {
      const webhookId = parts[2];
      const token = parts[3];
      const maskedToken =
        token.length > 4 ? `••••••••${token.slice(-4)}` : "••••••••";
      return `${parsed.origin}/api/webhooks/${webhookId}/${maskedToken}`;
    }
  } catch {
    // If not a parseable URL
  }
  return "https://discord.com/api/webhooks/••••••••";
}

export const CANONICAL_APP_URL = "https://infinity-explorers.vercel.app";
export const INFINITY_EXPLORERS_LOGO_URL = `${CANONICAL_APP_URL}/infinity-explorers.png`;

/**
 * Resolves the base web application URL for Discord notifications.
 * Automatically maps localhost / 127.0.0.1 to https://infinity-explorers.vercel.app
 * so links delivered to Discord always point to the production web app.
 */
export function resolveAppBaseUrl(providedUrl?: string | null): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL.trim();
    if (!envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl.replace(/\/$/, "");
    }
  }

  if (providedUrl) {
    const trimmed = providedUrl.trim();
    if (!trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
      return trimmed.replace(/\/$/, "");
    }
  }

  return CANONICAL_APP_URL;
}

/**
 * Resolves priority color and emoji in ClickUp style.
 */
function getPriorityDetails(priority?: string): { color: number; label: string } {
  switch ((priority || "").toLowerCase()) {
    case "high":
    case "urgent":
      return { color: 0xef4444, label: "🔴 High" };
    case "medium":
      return { color: 0xf59e0b, label: "🟡 Medium" };
    case "low":
      return { color: 0x10b981, label: "🟢 Low" };
    default:
      return { color: 0x7b68ee, label: "⚪ Normal" }; // ClickUp Purple
  }
}

/**
 * Formats a clean date string for Discord embeds (e.g. "Sep 25, 2026").
 */
function formatDateForEmbed(dateInput?: string | Date | null): string {
  if (!dateInput) return "No due date";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "No due date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "No due date";
  }
}

/**
 * Sends a ClickUp-style Discord notification when a new task is created.
 * Isolates all network and serialization errors to ensure task creation never fails.
 */
export async function sendDiscordTaskNotification(params: {
  task: {
    _id: string | any;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string | Date | null;
  };
  project: {
    _id: string | any;
    name: string;
    discordWebhookUrl?: string | null;
  };
  assignedMember?: {
    name: string;
    email?: string;
  } | null;
  creator: {
    name: string;
    role: string;
  };
  appUrl?: string;
}): Promise<DiscordNotificationResult> {
  // 1. Resolve Webhook Target (Project > Global)
  let webhookUrl: string | null = null;
  let scope: "project" | "global" | "none" = "none";

  if (params.project.discordWebhookUrl && isValidDiscordWebhookUrl(params.project.discordWebhookUrl)) {
    webhookUrl = params.project.discordWebhookUrl.trim();
    scope = "project";
  } else {
    // Check dynamic global setting stored in database
    try {
      const dbSetting = await SystemSetting.findOne({ key: "discord_global_webhook" }).lean();
      if (dbSetting?.value && isValidDiscordWebhookUrl(String(dbSetting.value))) {
        webhookUrl = String(dbSetting.value).trim();
        scope = "global";
      }
    } catch {
      // Ignore DB lookup error and proceed to env fallback
    }

    // Fallback to environment variable
    if (!webhookUrl && process.env.DISCORD_WEBHOOK_URL && isValidDiscordWebhookUrl(process.env.DISCORD_WEBHOOK_URL)) {
      webhookUrl = process.env.DISCORD_WEBHOOK_URL.trim();
      scope = "global";
    }
  }

  if (!webhookUrl) {
    return { attempted: false, delivered: false, scope: "none" };
  }

  // 2. Format ClickUp-Style Embed
  try {
    const priorityInfo = getPriorityDetails(params.task.priority);
    const baseUrl = resolveAppBaseUrl(params.appUrl);
    const projectLink = `${baseUrl}/dashboard/projects/${params.project._id}`;

    // Status format: "todo" -> "TO DO"
    const formattedStatus = (params.task.status || "todo")
      .replace(/-/g, " ")
      .toUpperCase();

    // Assignee text with email if available
    const assigneeText = params.assignedMember
      ? params.assignedMember.email
        ? `**${params.assignedMember.name}**\n${params.assignedMember.email}`
        : `**${params.assignedMember.name}**`
      : "*Unassigned*";

    // Description (clean truncation)
    let desc = params.task.description?.trim() || "";
    if (desc.length > 500) {
      desc = desc.substring(0, 497) + "...";
    }

    const embed: DiscordEmbed = {
      title: `📋 New Task Created: ${params.task.title}`,
      url: projectLink,
      description: desc || undefined,
      color: priorityInfo.color,
      fields: [
        {
          name: "📁 Project",
          value: params.project.name || "Untitled Project",
          inline: true,
        },
        {
          name: "⚡ Priority",
          value: priorityInfo.label,
          inline: true,
        },
        {
          name: "🎯 Status",
          value: formattedStatus,
          inline: true,
        },
        {
          name: "👤 Assignee",
          value: assigneeText,
          inline: true,
        },
        {
          name: "📅 Due Date",
          value: formatDateForEmbed(params.task.dueDate),
          inline: true,
        },
        {
          name: "✍️ Created By",
          value: `${params.creator.name} — ${params.creator.role}`,
          inline: true,
        },
      ],
      footer: {
        text: "Infinity Explorers System",
        icon_url: INFINITY_EXPLORERS_LOGO_URL,
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: "Infinity Explorers Task Tracker",
      avatar_url: INFINITY_EXPLORERS_LOGO_URL,
      embeds: [embed],
    };

    // 3. Dispatch to Discord with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 204) {
      return { attempted: true, delivered: true, scope };
    }

    const errorStatus = response.status;
    console.warn(`[Discord Webhook] Delivery returned status ${errorStatus} (Scope: ${scope})`);
    return {
      attempted: true,
      delivered: false,
      scope,
      error: `HTTP ${errorStatus}`,
    };
  } catch (err: any) {
    // Secret protection: NEVER log the webhookUrl in error traces
    console.error("[Discord Webhook] Failed to deliver task notification:", err?.message || err);
    return {
      attempted: true,
      delivered: false,
      scope,
      error: err?.message || "Network error",
    };
  }
}

/**
 * Resolves task status details (color, label, emoji)
 */
export function getTaskStatusDetails(status?: string): { color: number; label: string; emoji: string } {
  switch ((status || "").toLowerCase()) {
    case "done":
    case "completed":
      return { color: 0x10b981, label: "DONE", emoji: "✅" };
    case "in-progress":
    case "in_progress":
      return { color: 0x3b82f6, label: "IN PROGRESS", emoji: "⚡" };
    case "todo":
    default:
      return { color: 0x64748b, label: "TO DO", emoji: "📋" };
  }
}

/**
 * Sends a rich ClickUp-style Discord notification when a task status is updated.
 * Isolates all network and serialization errors to ensure task status updates never fail.
 */
export async function sendDiscordTaskStatusUpdateNotification(params: {
  task: {
    _id: string | any;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string | Date | null;
  };
  oldStatus: string;
  newStatus: string;
  project: {
    _id: string | any;
    name: string;
    discordWebhookUrl?: string | null;
  };
  assignedMember?: {
    name: string;
    email?: string;
  } | null;
  updater: {
    name: string;
    role: string;
  };
  appUrl?: string;
}): Promise<DiscordNotificationResult> {
  // 1. Resolve Webhook Target (Project > Global DB > Global Env)
  let webhookUrl: string | null = null;
  let scope: "project" | "global" | "none" = "none";

  if (params.project.discordWebhookUrl && isValidDiscordWebhookUrl(params.project.discordWebhookUrl)) {
    webhookUrl = params.project.discordWebhookUrl.trim();
    scope = "project";
  } else {
    try {
      const dbSetting = await SystemSetting.findOne({ key: "discord_global_webhook" }).lean();
      if (dbSetting?.value && isValidDiscordWebhookUrl(String(dbSetting.value))) {
        webhookUrl = String(dbSetting.value).trim();
        scope = "global";
      }
    } catch {
      // Ignore DB lookup error
    }

    if (!webhookUrl && process.env.DISCORD_WEBHOOK_URL && isValidDiscordWebhookUrl(process.env.DISCORD_WEBHOOK_URL)) {
      webhookUrl = process.env.DISCORD_WEBHOOK_URL.trim();
      scope = "global";
    }
  }

  if (!webhookUrl) {
    return { attempted: false, delivered: false, scope: "none" };
  }

  // 2. Format ClickUp-Style Status Update Embed
  try {
    const oldStatusInfo = getTaskStatusDetails(params.oldStatus);
    const newStatusInfo = getTaskStatusDetails(params.newStatus);
    const priorityInfo = getPriorityDetails(params.task.priority);
    const baseUrl = resolveAppBaseUrl(params.appUrl);
    const projectLink = `${baseUrl}/dashboard/projects/${params.project._id}`;

    const assigneeText = params.assignedMember
      ? params.assignedMember.email
        ? `**${params.assignedMember.name}**\n${params.assignedMember.email}`
        : `**${params.assignedMember.name}**`
      : "*Unassigned*";

    let title = `${newStatusInfo.emoji} Task Status Changed: ${params.task.title}`;
    if (params.newStatus === "done") {
      title = `✅ Task Completed: ${params.task.title}`;
    } else if (params.newStatus === "in-progress") {
      title = `⚡ Task In Progress: ${params.task.title}`;
    }

    const embed: DiscordEmbed = {
      title,
      url: projectLink,
      description: `Task status updated from **${oldStatusInfo.label}** to **${newStatusInfo.label}**`,
      color: newStatusInfo.color,
      fields: [
        {
          name: "🔄 Status",
          value: `${oldStatusInfo.emoji} ${oldStatusInfo.label} ➔ ${newStatusInfo.emoji} ${newStatusInfo.label}`,
          inline: true,
        },
        {
          name: "📁 Project",
          value: params.project.name || "Untitled Project",
          inline: true,
        },
        {
          name: "⚡ Priority",
          value: priorityInfo.label,
          inline: true,
        },
        {
          name: "👤 Assignee",
          value: assigneeText,
          inline: true,
        },
        {
          name: "📅 Due Date",
          value: formatDateForEmbed(params.task.dueDate),
          inline: true,
        },
        {
          name: "✍️ Updated By",
          value: `${params.updater.name} — ${params.updater.role}`,
          inline: true,
        },
      ],
      footer: {
        text: "Infinity Explorers System",
        icon_url: INFINITY_EXPLORERS_LOGO_URL,
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: "Infinity Explorers Task Tracker",
      avatar_url: INFINITY_EXPLORERS_LOGO_URL,
      embeds: [embed],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 204) {
      return { attempted: true, delivered: true, scope };
    }

    const errorStatus = response.status;
    console.warn(`[Discord Webhook] Status update returned status ${errorStatus} (Scope: ${scope})`);
    return {
      attempted: true,
      delivered: false,
      scope,
      error: `HTTP ${errorStatus}`,
    };
  } catch (err: any) {
    console.error("[Discord Webhook] Failed to deliver task status update notification:", err?.message || err);
    return {
      attempted: true,
      delivered: false,
      scope,
      error: err?.message || "Network error",
    };
  }
}

/**
 * Resolves color and label for meeting type
 */
function getMeetingTypeDetails(type?: string): { color: number; label: string } {
  switch (type) {
    case "Emergency_Session":
      return { color: 0xef4444, label: "🚨 Emergency Session" };
    case "Sprint_Sync":
      return { color: 0x3b82f6, label: "⚡ Sprint Sync" };
    case "Project_Review":
      return { color: 0xf59e0b, label: "📋 Project Review" };
    case "One_On_One":
      return { color: 0x8b5cf6, label: "🤝 1-on-1 Session" };
    case "General_Meeting":
    default:
      return { color: 0x7b68ee, label: "👥 General Meeting" };
  }
}

/**
 * Formats date and time for meeting embed (e.g. "Mon, Sep 22, 2026 at 3:00 PM")
 */
function formatMeetingDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "TBD";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "TBD";
  }
}

/**
 * Sends a rich ClickUp/Calendar-style Discord notification when a new meeting is scheduled.
 * Isolates all network and serialization errors to ensure meeting creation never fails.
 */
export async function sendDiscordMeetingNotification(params: {
  meeting: {
    _id: string | any;
    title: string;
    description?: string;
    type: string;
    scheduledAt: string | Date;
    durationMinutes: number;
    meetingLink?: string;
    location?: string;
    agenda?: string[];
    attendees?: any[];
  };
  project?: {
    _id: string | any;
    name: string;
    discordWebhookUrl?: string | null;
  } | null;
  creator: {
    name: string;
    role: string;
  };
  appUrl?: string;
}): Promise<DiscordNotificationResult> {
  // 1. Resolve target webhook (Project > DB Global > Env Global)
  let webhookUrl: string | null = null;
  let scope: "project" | "global" | "none" = "none";

  if (params.project?.discordWebhookUrl && isValidDiscordWebhookUrl(params.project.discordWebhookUrl)) {
    webhookUrl = params.project.discordWebhookUrl.trim();
    scope = "project";
  } else {
    // Check dynamic global setting in DB
    try {
      const dbSetting = await SystemSetting.findOne({ key: "discord_global_webhook" }).lean();
      if (dbSetting?.value && isValidDiscordWebhookUrl(String(dbSetting.value))) {
        webhookUrl = String(dbSetting.value).trim();
        scope = "global";
      }
    } catch {
      // Ignore DB lookup error
    }

    // Fallback to env
    if (!webhookUrl && process.env.DISCORD_WEBHOOK_URL && isValidDiscordWebhookUrl(process.env.DISCORD_WEBHOOK_URL)) {
      webhookUrl = process.env.DISCORD_WEBHOOK_URL.trim();
      scope = "global";
    }
  }

  if (!webhookUrl) {
    return { attempted: false, delivered: false, scope: "none" };
  }

  // 2. Format Embed
  try {
    const typeInfo = getMeetingTypeDetails(params.meeting.type);
    const baseUrl = resolveAppBaseUrl(params.appUrl);
    const meetingLinkUrl =
      params.meeting.meetingLink || `${baseUrl}/dashboard/meetings`;

    let desc = params.meeting.description?.trim() || "";
    if (params.meeting.agenda && params.meeting.agenda.length > 0) {
      const agendaText = params.meeting.agenda.map((item) => `• ${item}`).join("\n");
      desc = desc ? `${desc}\n\n**Agenda:**\n${agendaText}` : `**Agenda:**\n${agendaText}`;
    }

    if (desc.length > 500) {
      desc = desc.substring(0, 497) + "...";
    }

    const attendeesCount = params.meeting.attendees?.length || 0;
    const attendeesText =
      attendeesCount > 0 ? `${attendeesCount} Members Invited` : "Open Attendance";

    const fields: DiscordEmbedField[] = [
      {
        name: "📁 Project",
        value: params.project ? params.project.name : "🌐 General (All Teams)",
        inline: true,
      },
      {
        name: "🏷️ Meeting Type",
        value: typeInfo.label,
        inline: true,
      },
      {
        name: "⏰ Scheduled Time",
        value: formatMeetingDateTime(params.meeting.scheduledAt),
        inline: true,
      },
      {
        name: "⏱️ Duration",
        value: `${params.meeting.durationMinutes || 45} minutes`,
        inline: true,
      },
      {
        name: "📍 Location",
        value: params.meeting.location || "Online",
        inline: true,
      },
      {
        name: "🔗 Meeting Link",
        value: params.meeting.meetingLink
          ? `[Join Meeting](${params.meeting.meetingLink})`
          : "*No link provided*",
        inline: true,
      },
      {
        name: "👥 Attendance",
        value: attendeesText,
        inline: true,
      },
      {
        name: "✍️ Scheduled By",
        value: `${params.creator.name} — ${params.creator.role}`,
        inline: true,
      },
    ];

    const embed: DiscordEmbed = {
      title: `📅 New Meeting Scheduled: ${params.meeting.title}`,
      url: meetingLinkUrl,
      description: desc || undefined,
      color: typeInfo.color,
      fields,
      footer: {
        text: "Infinity Explorers System",
        icon_url: INFINITY_EXPLORERS_LOGO_URL,
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: "Infinity Explorers Calendar",
      avatar_url: INFINITY_EXPLORERS_LOGO_URL,
      embeds: [embed],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 204) {
      return { attempted: true, delivered: true, scope };
    }

    const errorStatus = response.status;
    console.warn(
      `[Discord Webhook] Meeting delivery returned status ${errorStatus} (Scope: ${scope})`,
    );
    return {
      attempted: true,
      delivered: false,
      scope,
      error: `HTTP ${errorStatus}`,
    };
  } catch (err: any) {
    console.error(
      "[Discord Webhook] Failed to deliver meeting notification:",
      err?.message || err,
    );
    return {
      attempted: true,
      delivered: false,
      scope,
      error: err?.message || "Network error",
    };
  }
}

/**
 * Tests a Discord Webhook URL by sending a sample embed card.
 */
export async function testDiscordWebhook(
  url: string,
  tester: { name: string; role: string },
): Promise<{ success: boolean; message: string }> {
  if (!isValidDiscordWebhookUrl(url)) {
    return {
      success: false,
      message: "Invalid Discord Webhook URL format. URL must start with https://discord.com/api/webhooks/...",
    };
  }

  try {
    const payload = {
      username: "Infinity Explorers Test Bot",
      embeds: [
        {
          title: "🔔 Infinity Explorers — Webhook Test",
          description:
            "Discord integration is working successfully! New task notifications will be delivered to this channel formatted like ClickUp cards.",
          color: 0x7b68ee, // ClickUp Purple
          fields: [
            {
              name: "👤 Tested By",
              value: `${tester.name} (${tester.role})`,
              inline: true,
            },
            {
              name: "⚡ Status",
              value: "✅ Connected & Active",
              inline: true,
            },
          ],
          footer: {
            text: "Infinity Explorers System",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 204) {
      return {
        success: true,
        message: "Test notification sent successfully to Discord!",
      };
    }

    return {
      success: false,
      message: `Discord rejected webhook with HTTP status ${response.status}. Please check your webhook URL and channel permissions.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reach Discord: ${err?.message || "Connection error"}`,
    };
  }
}
