// Public (non-secret) site metadata shared by the layout, manifest and image routes.
export const SITE = {
  name: "Protech AI Hub",
  company: "ProTechnology Limited",
  tagline: "Create Smarter. Build Faster.",
  description:
    "Draft Farcaster casts, replies and project promotion with AI, then review, edit and keep your history.",
  background: "#0E0D1A",
} as const;

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}
