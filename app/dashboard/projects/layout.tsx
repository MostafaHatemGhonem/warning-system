import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Directory of projects, team allocations, timelines, and deliverables.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
