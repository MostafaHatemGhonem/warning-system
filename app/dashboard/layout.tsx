import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

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
