import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

// Generated social-share image (Open Graph + Twitter). No static asset needed.
export const alt = "PSU Gang — Watt Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Necesario con output: "export" — prerenderiza la imagen en build.
export const dynamic = "force-static";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#141414",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: "2px solid #03d6b3",
            borderRadius: 6,
            padding: "8px 18px",
            color: "#03d6b3",
            fontSize: 28,
            letterSpacing: 4,
            fontWeight: 700,
          }}
        >
          PSU GANG
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            color: "#ffffff",
            fontSize: 92,
            fontWeight: 700,
          }}
        >
          Watt Calculator
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            color: "#888888",
            fontSize: 32,
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
