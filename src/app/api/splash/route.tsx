import { ImageResponse } from "next/og";

// 200x200 splash image.
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
          background: "#0E0D1A",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #8B6CFF 0%, #4C8DFF 100%)",
            color: "#0E0D1A",
            fontSize: 76,
            fontWeight: 800,
          }}
        >
          P
        </div>
      </div>
    ),
    { width: 200, height: 200 }
  );
}
