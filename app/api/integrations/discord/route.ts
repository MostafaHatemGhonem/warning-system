import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SystemSetting from "@/models/system-setting";
import { recordAuditLog, getOrCreateRequestId } from "@/lib/audit";
import {
  isValidDiscordWebhookUrl,
  maskDiscordWebhookUrl,
} from "@/lib/discord";

const GLOBAL_WEBHOOK_KEY = "discord_global_webhook";

// ─── GET /api/integrations/discord ───────────────────────────────────────────
export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectToDatabase();

    const dbSetting = await SystemSetting.findOne({ key: GLOBAL_WEBHOOK_KEY }).lean();

    let rawWebhookUrl: string | null = null;
    let source: "database" | "env" | "none" = "none";

    if (dbSetting?.value && typeof dbSetting.value === "string") {
      rawWebhookUrl = dbSetting.value;
      source = "database";
    } else if (process.env.DISCORD_WEBHOOK_URL) {
      rawWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      source = "env";
    }

    const hasGlobalWebhook = Boolean(rawWebhookUrl);
    const maskedWebhook = maskDiscordWebhookUrl(rawWebhookUrl);

    return NextResponse.json({
      success: true,
      data: {
        hasGlobalWebhook,
        maskedWebhook,
        source,
        updatedAt: dbSetting?.updatedAt || null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/integrations/discord error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Discord integration settings." },
      { status: 500 },
    );
  }
}

// ─── POST /api/integrations/discord ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Only Super Admin and Admin can change global system-wide integrations
    if (member.role !== "Super Admin" && member.role !== "Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only Administrators and Super Administrators can manage global integrations.",
        },
        { status: 403 },
      );
    }

    const requestId = getOrCreateRequestId(request);
    const body = await request.json().catch(() => ({}));
    const rawInput = body.webhookUrl;

    await connectToDatabase();

    const existingSetting = await SystemSetting.findOne({
      key: GLOBAL_WEBHOOK_KEY,
    });
    const previousState = existingSetting ? existingSetting.toObject() : null;

    let targetValue: string | null = null;

    if (rawInput !== null && rawInput !== undefined) {
      const trimmed = String(rawInput).trim();
      if (trimmed) {
        if (!isValidDiscordWebhookUrl(trimmed)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid Discord Webhook URL. Format must start with https://discord.com/api/webhooks/...",
            },
            { status: 400 },
          );
        }
        targetValue = trimmed;
      }
    }

    let updatedSetting = null;

    if (targetValue) {
      updatedSetting = await SystemSetting.findOneAndUpdate(
        { key: GLOBAL_WEBHOOK_KEY },
        {
          value: targetValue,
          description: "Global fallback Discord webhook for task notifications",
          updatedBy: member._id,
        },
        { upsert: true, new: true },
      );
    } else {
      // Disconnect / remove global webhook from DB
      await SystemSetting.deleteOne({ key: GLOBAL_WEBHOOK_KEY });
    }

    await recordAuditLog({
      requestId,
      actor: member,
      action: "settings.update",
      resource: {
        type: "SystemSetting",
        id: GLOBAL_WEBHOOK_KEY,
        identifier: "Global Discord Webhook",
      },
      previousState,
      newState: updatedSetting ? updatedSetting.toObject() : null,
      decisionReason: targetValue
        ? `Configured global Discord Webhook URL`
        : `Removed global Discord Webhook URL configuration`,
      authorizationResult: "STANDARD_GRANT",
    });

    const hasGlobalWebhook = Boolean(targetValue || process.env.DISCORD_WEBHOOK_URL);
    const maskedWebhook = maskDiscordWebhookUrl(
      targetValue || process.env.DISCORD_WEBHOOK_URL,
    );

    return NextResponse.json({
      success: true,
      message: targetValue
        ? "Global Discord Webhook saved successfully."
        : "Global Discord Webhook removed.",
      data: {
        hasGlobalWebhook,
        maskedWebhook,
        source: targetValue ? "database" : process.env.DISCORD_WEBHOOK_URL ? "env" : "none",
      },
    });
  } catch (error: any) {
    console.error("POST /api/integrations/discord error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update Discord integration settings." },
      { status: 500 },
    );
  }
}
