import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings & Integrations",
  description: "Account preferences, Discord webhooks, Resend email notifications, and workspace settings.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
