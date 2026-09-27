import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5173";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FrightFate: Who Dies First?",
  description:
    "A dynamic, AI-driven horror survival game. Pick a nightmare world, out-think the darkness and find out who dies first.",
  applicationName: "FrightFate",
  keywords: ["horror", "survival game", "AI game", "party game", "FrightFate"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "FrightFate: Who Dies First?",
    description:
      "A dynamic, AI-driven horror survival game. Pick a nightmare world, out-think the darkness and find out who dies first.",
    type: "website",
    siteName: "FrightFate",
  },
  twitter: {
    card: "summary_large_image",
    title: "FrightFate: Who Dies First?",
    description: "Pick a nightmare world, out-think the darkness, find out who dies first.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0708",
  width: "device-width",
  initialScale: 1,
};

/** Per-theme display/body typefaces (loaded at runtime; graceful fallbacks). */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Creepster&family=Special+Elite&family=Metal+Mania&family=Orbitron:wght@400;700&family=Cinzel+Decorative:wght@700&family=IM+Fell+English:ital@0;1&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="haunted_house">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
