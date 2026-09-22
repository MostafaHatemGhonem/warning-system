import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HR & Performance",
  description: "Human resources reporting, team compliance, and member evaluations.",
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
