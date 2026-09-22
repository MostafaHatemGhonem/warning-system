import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CANONICAL_APP_URL } from "@/lib/app-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_APP_URL),
  title: {
    default: "Infinity Explorers | Enterprise Governance & Warning System",
    template: "%s | Infinity Explorers",
  },
  description:
    "Official workspace and team governance platform for Infinity Explorers — orchestrating projects, kanban tasks, disciplinary warnings, attendance tracking, and audit logging.",
  applicationName: "Infinity Explorers",
  authors: [{ name: "Infinity Explorers Team", url: CANONICAL_APP_URL }],
  generator: "Next.js",
  keywords: [
    "Infinity Explorers",
    "Team Management",
    "Disciplinary System",
    "Warning System",
    "Task Management",
    "Attendance Tracking",
    "Project Workspace",
    "Enterprise Governance",
  ],
  creator: "Infinity Explorers",
  publisher: "Infinity Explorers",
  category: "Enterprise Management",
  icons: {
    icon: [
      { url: "/infinity-explorers.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/infinity-explorers.png",
    apple: [
      { url: "/infinity-explorers.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Infinity Explorers | Enterprise Governance & Warning System",
    description:
      "All-in-one team management, project tracking, disciplinary governance, and meeting attendance platform for Infinity Explorers.",
    url: CANONICAL_APP_URL,
    siteName: "Infinity Explorers",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/infinity-explorers.png",
        width: 512,
        height: 512,
        alt: "Infinity Explorers Official Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Infinity Explorers | Enterprise Governance",
    description:
      "All-in-one team management, project tracking, and disciplinary governance platform.",
    images: ["/infinity-explorers.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
