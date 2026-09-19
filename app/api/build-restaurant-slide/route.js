import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function POST() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#073b2d",
          color: "#f7f3e8",
          fontSize: 72,
          fontWeight: 700,
          fontFamily: "Arial",
        }}
      >
        FEED ME BUDAPEST TEST
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  );
}
