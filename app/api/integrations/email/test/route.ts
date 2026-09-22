import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getResendClient, DEFAULT_EMAIL_FROM } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY is not configured in environment variables. Please add it to your Vercel Project Settings > Environment Variables.",
        },
        { status: 400 }
      );
    }

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to initialize Resend client with provided API key.",
        },
        { status: 500 }
      );
    }

    const recipient = member.email;
    if (!recipient) {
      return NextResponse.json(
        {
          success: false,
          error: "Your user account does not have an email address configured.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_EMAIL_FROM,
      to: recipient,
      subject: "Test Email from Infinity Explorers",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Infinity Explorers - Email Test Successful!</h2>
          <p>Hello <strong>${member.name}</strong>,</p>
          <p>This test email confirms that your Resend email service and custom domain are correctly configured and delivering emails.</p>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #334155;">
            <div><strong>Sender:</strong> ${DEFAULT_EMAIL_FROM}</div>
            <div><strong>Recipient:</strong> ${recipient}</div>
            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
          </div>
          <p style="color: #64748b; font-size: 12px;">Infinity Explorers System Notifications</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          sender: DEFAULT_EMAIL_FROM,
          recipient,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipient}!`,
      id: data?.id,
      sender: DEFAULT_EMAIL_FROM,
      recipient,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
