import { ImageResponse } from "next/og";

// 1200x800 (3:2) embed image shown when the app is shared in a feed.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#0E0D1A",
          color: "#F1F0FA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #8B6CFF 0%, #4C8DFF 100%)",
              color: "#0E0D1A",
              fontSize: 80,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginLeft: 32 }}>Protech AI Hub</div>
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, marginTop: 72, lineHeight: 1.05 }}>
          Create Smarter. Build Faster.
        </div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 36, color: "#A9A7C9" }}>
          AI drafts for casts, replies and project promotion.
        </div>
      </div>
    ),
    { width: 1200, height: 800 }
  );
}
