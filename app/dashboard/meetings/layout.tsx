import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meetings & Attendance",
  description: "Schedule meetings, select attendees, and track real-time attendance.",
};

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
