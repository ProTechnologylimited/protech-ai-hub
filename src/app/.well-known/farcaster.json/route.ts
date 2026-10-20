import { SITE, appUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Farcaster Mini App manifest, served at /.well-known/farcaster.json.
 * accountAssociation values come from the Farcaster manifest tool after deployment
 * (see README). Until they are set, the manifest is intentionally incomplete.
 */
export function GET() {
  const url = appUrl();
  const header = process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER?.trim();
  const payload = process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD?.trim();
  const signature = process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE?.trim();

  const manifest = {
    ...(header && payload && signature ? { accountAssociation: { header, payload, signature } } : {}),
    miniapp: {
      version: "1",
      name: SITE.name,
      homeUrl: url,
      iconUrl: `${url}/api/icon`,
      imageUrl: `${url}/api/og`,
      buttonTitle: "Open Protech AI Hub",
      splashImageUrl: `${url}/api/splash`,
      splashBackgroundColor: SITE.background,
      subtitle: "AI drafts for Farcaster",
      description: SITE.description,
      primaryCategory: "productivity",
      tags: ["ai", "writing", "content", "web3", "marketing"],
      tagline: SITE.tagline,
      ogTitle: SITE.name,
      ogDescription: "AI drafts for casts, replies and project promotion.",
      ogImageUrl: `${url}/api/og`,
    },
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
