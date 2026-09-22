import { Resend } from "resend";
import { CANONICAL_APP_URL } from "@/lib/app-config";

/**
 * Returns a configured Resend client instance if RESEND_API_KEY is defined.
 * Returns null if the API key is not configured, ensuring graceful fallback.
 */
let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }

  return resendInstance;
}

export { CANONICAL_APP_URL };

export const DEFAULT_EMAIL_FROM =
  process.env.EMAIL_FROM || "Infinity Explorers <notifications@mostafa-hatem.tech>";
