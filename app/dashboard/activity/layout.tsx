import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs & Activity",
  description: "Immutable enterprise audit trail, security logs, and operations activity.",
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
