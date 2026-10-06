import { NextResponse } from "next/server";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { approveStory } from "@/lib/localization/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function localRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const host = new URL(request.url).hostname;
    const origin = request.headers.get("origin");
    const originHost = origin ? new URL(origin).hostname : host;
    const allowed = new Set(["localhost", "127.0.0.1", "::1"]);
    return allowed.has(host) && allowed.has(originHost);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!localRequest(request))
    return NextResponse.json(
      { ok: false, error: "Editorial mutations are local-development only." },
      { status: 403 },
    );

  try {
    const body = (await request.json()) as {
      id?: unknown;
      actor?: unknown;
      note?: unknown;
    };
    const id = Number(body.id);
    const actor = typeof body.actor === "string" ? body.actor.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!Number.isSafeInteger(id) || id < 1 || !actor || !note)
      return NextResponse.json(
        { ok: false, error: "Story ID, reviewer and review note are required." },
        { status: 400 },
      );

    const result = await approveStory(
      new JsonLocalizationRepository(),
      id,
      actor,
      note,
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Approval failed",
      },
      { status: 400 },
    );
  }
}
