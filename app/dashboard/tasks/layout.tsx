import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks & Board",
  description: "Interactive task board, assignments, priority filters, and workflow tracking.",
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
