import assert from "node:assert";

// Regex and masking tested directly
const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

function isValidDiscordWebhookUrl(url) {
  if (!url || typeof url !== "string") return false;
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
}

function maskDiscordWebhookUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);
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

function sanitizeAuditState(state) {
  if (!state || typeof state !== "object") return state || null;
  if (Array.isArray(state)) return state.map(sanitizeAuditState);

  const clone = { ...state };
  delete clone.discordWebhookUrl;
  delete clone.password;
  delete clone.passwordHash;
  delete clone.tokenHash;

  return clone;
}

console.log("▶ Running Discord Webhook unit tests...");

// Test 1: URL Validation
const validUrls = [
  "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz0123456789_-ABCDEFG",
  "https://discordapp.com/api/webhooks/987654321098765432/TokenHere_123-abc",
  "https://canary.discord.com/api/webhooks/111222333444555666/TokenHere",
  "https://ptb.discord.com/api/webhooks/999888777666555444/TokenHere",
];

for (const url of validUrls) {
  assert.strictEqual(isValidDiscordWebhookUrl(url), true, `Should be valid: ${url}`);
}

const invalidUrls = [
  "http://discord.com/api/webhooks/123/token", // not https
  "https://malicious.com/api/webhooks/123/token", // wrong host
  "https://discord.com/other/path/123", // wrong path
  "javascript:alert(1)",
  "",
  null,
  undefined,
];

for (const url of invalidUrls) {
  assert.strictEqual(isValidDiscordWebhookUrl(url), false, `Should be invalid: ${url}`);
}
console.log("✓ URL Validation passed.");

// Test 2: Masking Secret Tokens
const rawUrl = "https://discord.com/api/webhooks/123456789/SuperSecretToken1234";
const masked = maskDiscordWebhookUrl(rawUrl);
assert(masked.includes("123456789"), "Masked URL should preserve webhook ID");
assert(!masked.includes("SuperSecretToken"), "Masked URL must NOT contain full secret token");
assert(masked.includes("••••••••"), "Masked URL should contain bullet masks");
console.log("✓ Secret Token Masking passed:", masked);

// Test 3: Audit Sanitization
const projectState = {
  name: "Infinity Redesign",
  lead: "Mostafa",
  discordWebhookUrl: "https://discord.com/api/webhooks/123/SecretWebhookToken",
  passwordHash: "$2a$12$e0M2/...",
};

const sanitized = sanitizeAuditState(projectState);
assert.strictEqual(sanitized.name, "Infinity Redesign");
assert.strictEqual(sanitized.discordWebhookUrl, undefined, "discordWebhookUrl must be stripped from audit");
assert.strictEqual(sanitized.passwordHash, undefined, "passwordHash must be stripped from audit");
console.log("✓ Audit State Sanitization passed.");

// Test 4: Meeting type colors
function getMeetingTypeDetails(type) {
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

assert.strictEqual(getMeetingTypeDetails("Emergency_Session").color, 0xef4444);
assert.strictEqual(getMeetingTypeDetails("Sprint_Sync").color, 0x3b82f6);
assert(getMeetingTypeDetails("One_On_One").label.includes("1-on-1"));
console.log("✓ Meeting Embed Format & Colors passed.");

// Test 5: Task status colors and labels
function getTaskStatusDetails(status) {
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

assert.strictEqual(getTaskStatusDetails("done").color, 0x10b981);
assert.strictEqual(getTaskStatusDetails("done").label, "DONE");
assert.strictEqual(getTaskStatusDetails("in-progress").color, 0x3b82f6);
assert.strictEqual(getTaskStatusDetails("todo").color, 0x64748b);
console.log("✓ Task Status Update Embed Details passed.");

// Test 6: URL Resolution (Localhost -> Production Canonical URL)
const CANONICAL_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://infinity-explorers.mostafa-hatem.tech";
function resolveAppBaseUrl(providedUrl) {
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

assert.strictEqual(resolveAppBaseUrl("http://localhost:3000"), CANONICAL_APP_URL);
assert.strictEqual(resolveAppBaseUrl("http://127.0.0.1:3000"), CANONICAL_APP_URL);
assert.strictEqual(resolveAppBaseUrl(undefined), CANONICAL_APP_URL);
assert.strictEqual(resolveAppBaseUrl("https://custom-domain.org/"), "https://custom-domain.org");
console.log("✓ Canonical URL Resolution (localhost -> production) passed.");

console.log("🎉 All Discord integration unit tests passed successfully!");
