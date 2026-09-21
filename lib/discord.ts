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
    const baseUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || "";
    const projectLink = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/dashboard/projects/${params.project._id}`
      : undefined;

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
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: "Infinity Explorers Task Tracker",
      avatar_url:
        "https://raw.githubusercontent.com/MostafaHatemGhonem/warning-system/main/infinity-explorers/public/icon.png",
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
