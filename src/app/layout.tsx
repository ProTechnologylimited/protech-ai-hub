import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SITE, appUrl } from "@/lib/site";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const url = appUrl();

// Mini App embed metadata (fc:miniapp). fc:frame is kept for older clients.
const embed = JSON.stringify({
  version: "1",
  imageUrl: `${url}/api/og`,
  button: {
    title: "Open Protech AI Hub",
    action: {
      type: "launch_miniapp",
      name: SITE.name,
      url,
      splashImageUrl: `${url}/api/splash`,
      splashBackgroundColor: SITE.background,
    },
  },
});

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: `${SITE.name} | ${SITE.tagline}`,
  description: SITE.description,
  icons: { icon: "/api/icon" },
  openGraph: { title: SITE.name, description: SITE.description, images: ["/api/og"] },
  other: {
    "fc:miniapp": embed,
    "fc:frame": embed,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: SITE.background,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
