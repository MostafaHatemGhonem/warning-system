import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disciplinary Warnings",
  description: "Official disciplinary regulatory records, appeals, and team governance policies.",
};

export default function WarningsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
