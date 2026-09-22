import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Infinity Explorers executive workspace, analytics, and activity overview.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentMember = await getCurrentMember();

  if (!currentMember) {
    redirect("/login");
  }

  return <>{children}</>;
}
