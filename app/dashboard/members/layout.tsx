import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Members Roster",
  description: "Directory of team members, roles, contacts, and permissions.",
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
