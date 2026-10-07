import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "apex-news-india-mobile-content",
    schemaVersion: 1,
    locales: ["en", "roman"],
    source: "approved-localization",
  });
}
