import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Secure login to the Infinity Explorers workspace.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
