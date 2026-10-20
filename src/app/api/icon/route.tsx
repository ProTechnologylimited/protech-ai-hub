import { ImageResponse } from "next/og";

// 1024x1024 opaque PNG used as the Mini App icon.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8B6CFF 0%, #4C8DFF 100%)",
          color: "#0E0D1A",
          fontSize: 640,
          fontWeight: 800,
        }}
      >
        P
      </div>
    ),
    { width: 1024, height: 1024 }
  );
}
