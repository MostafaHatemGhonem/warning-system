import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Oversight",
  description: "Executive administrative governance and system-wide controls.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
