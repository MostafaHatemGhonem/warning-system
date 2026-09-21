import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import { testDiscordWebhook, isValidDiscordWebhookUrl } from "@/lib/discord";

export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    // Only Admins, Super Admins, and Team Leaders can test/configure webhooks
    const isAuthorized = [
      "Super Admin",
      "Admin",
      "Team Leader",
      "HR",
    ].includes(member.role);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to test or configure Discord integrations.",
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    let targetUrl = (body.webhookUrl as string | undefined)?.trim();

    // If projectId is provided and no direct webhookUrl given, fetch project's webhook
    if (!targetUrl && body.projectId) {
      await connectToDatabase();
      const project = await Project.findById(body.projectId).select("discordWebhookUrl");
      if (project?.discordWebhookUrl) {
        targetUrl = project.discordWebhookUrl.trim();
      }
    }

    // Fallback to global env variable if neither provided
    if (!targetUrl && process.env.DISCORD_WEBHOOK_URL) {
      targetUrl = process.env.DISCORD_WEBHOOK_URL.trim();
    }

    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "No Discord Webhook URL provided or configured to test.",
        },
        { status: 400 },
      );
    }

    if (!isValidDiscordWebhookUrl(targetUrl)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Discord Webhook URL format. Must start with https://discord.com/api/webhooks/...",
        },
        { status: 400 },
      );
    }

    const result = await testDiscordWebhook(targetUrl, {
      name: member.name,
      role: member.role,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error("POST /api/discord/test error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error occurred while testing Discord webhook.",
      },
      { status: 500 },
    );
  }
}
