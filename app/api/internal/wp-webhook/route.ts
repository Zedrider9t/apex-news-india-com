import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { POST as runAutofeed } from "@/app/api/internal/autofeed/route";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { observeSource } from "@/lib/localization/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;

const MAX_SKEW_SECONDS = 300;

function validSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.APEX_WP_WEBHOOK_SECRET?.trim() ?? "";
  if (secret.length < 32) return false;

  const timestampRaw = headers.get("x-apex-timestamp")?.trim() ?? "";
  const suppliedRaw = headers.get("x-apex-signature")?.trim() ?? "";
  if (!/^\d{10,13}$/.test(timestampRaw)) return false;

  const timestamp = Number(timestampRaw);
  const timestampMs = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  if (!Number.isFinite(timestampMs)) return false;
  if (Math.abs(Date.now() - timestampMs) > MAX_SKEW_SECONDS * 1000)
    return false;

  const supplied = suppliedRaw.startsWith("sha256=")
    ? suppliedRaw.slice("sha256=".length)
    : suppliedRaw;
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampRaw}.${rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(supplied.toLowerCase(), "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

type WebhookPayload = {
  post_id?: unknown;
  event?: unknown;
  status?: unknown;
  modified_gmt?: unknown;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event === "ping")
    return NextResponse.json({ ok: true, event: "ping", accepted: true });

  const id = Number(payload.post_id);
  if (!Number.isSafeInteger(id) || id < 1)
    return NextResponse.json({ ok: false, error: "Invalid post_id" }, { status: 400 });

  const event =
    payload.event === "publish" ||
    payload.event === "update" ||
    payload.event === "unpublish" ||
    payload.event === "delete"
      ? payload.event
      : null;
  if (!event)
    return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });

  if (event === "unpublish" || event === "delete") {
    const repo = new JsonLocalizationRepository();
    await observeSource(repo, id, {
      kind: event === "delete" ? "deleted" : "unpublished",
      evidence: `Signed WordPress webhook: ${event}`,
    });
    return NextResponse.json({
      ok: true,
      id,
      event,
      action: "source_withdrawn",
    });
  }

  const autofeedSecret = process.env.APEX_AUTOFEEED_SECRET?.trim() ?? "";
  if (autofeedSecret.length < 32)
    return NextResponse.json(
      { ok: false, error: "Autofeed is not configured" },
      { status: 503 },
    );

  const origin = new URL(request.url).origin;
  const internalRequest = new Request(
    `${origin}/api/internal/autofeed?id=${id}&maxWork=2`,
    {
      method: "POST",
      headers: {
        "x-apex-autofeed-secret": autofeedSecret,
      },
    },
  );

  const response = await runAutofeed(internalRequest);
  const data = await response.json();

  return NextResponse.json(
    {
      ok: response.ok,
      id,
      event,
      sync: data,
    },
    { status: response.status },
  );
}
