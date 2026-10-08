import { NextResponse } from "next/server";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { approveStory } from "@/lib/localization/engine";
import {
  editorialAuthorized,
  editorialChallenge,
  requestIsSameOrigin,
} from "@/lib/editorial-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!editorialAuthorized(request.headers)) return editorialChallenge();

  if (!requestIsSameOrigin(request))
    return NextResponse.json(
      { ok: false, error: "Cross-origin editorial mutations are not allowed." },
      { status: 403 },
    );

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let idValue: unknown;
    let actorValue: unknown;
    let noteValue: unknown;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        id?: unknown;
        actor?: unknown;
        note?: unknown;
      };
      idValue = body.id;
      actorValue = body.actor;
      noteValue = body.note;
    } else {
      const form = await request.formData();
      idValue = form.get("id");
      actorValue = form.get("actor");
      noteValue = form.get("note");
    }

    const id = Number(idValue);
    const submittedActor =
      typeof actorValue === "string" ? actorValue.trim() : "";
    const actor =
      process.env.NODE_ENV === "production"
        ? (process.env.APEX_EDITORIAL_REVIEWER?.trim() ||
          "Apex News India Editorial Desk")
        : submittedActor;
    const note = typeof noteValue === "string" ? noteValue.trim() : "";

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

    if (!contentType.includes("application/json")) {
      const target = new URL("/editorial", request.url);
      target.searchParams.set("approved", String(id));
      return NextResponse.redirect(target, 303);
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
