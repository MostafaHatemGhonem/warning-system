/**
 * Application Configuration & Canonical URLs
 * Single Source of Truth for domains, URLs, and branding assets.
 */

export const CANONICAL_APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  "https://infinity-explorers.mostafa-hatem.tech"
).replace(/\/$/, "");

export const APP_LOGO_URL = `${CANONICAL_APP_URL}/infinity-explorers.png`;

/**
 * Resolves application URL for notifications, webhooks, and emails.
 * Safely normalizes base URL and maps localhost/127.0.0.1 to the canonical domain.
 */
export function resolveAppUrl(path: string = "", customBase?: string | null): string {
  let base = CANONICAL_APP_URL;

  if (customBase && typeof customBase === "string") {
    const trimmed = customBase.trim();
    if (trimmed && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
      base = trimmed.replace(/\/$/, "");
    }
  }

  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${base}${cleanPath}`;
}
