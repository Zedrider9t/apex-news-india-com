import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { observeSource, localizeStory } from "@/lib/localization/engine";
import { readPublicSource } from "@/lib/localization/source";
import { createTranslationProvider } from "@/lib/localization/providers";
import { fetchSourceStories } from "@/lib/wordpress/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;

function authorized(request: Request): boolean {
  const expected = process.env.APEX_AUTOFEEED_SECRET?.trim() ?? "";
  const supplied = request.headers.get("x-apex-autofeed-secret")?.trim() ?? "";
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const retryFailed = new URL(request.url).searchParams.get("retryFailed") === "true";
    const latest = await fetchSourceStories({ limit: 6 });
    if (!latest.ok)
      return NextResponse.json(
        { ok: false, error: `Source feed unavailable: ${latest.reason}` },
        { status: 502 },
      );

    const repo = new JsonLocalizationRepository();
    const provider = createTranslationProvider();
    const processed: Array<Record<string, unknown>> = [];

    for (const discovered of [...latest.stories].reverse()) {
      const id = discovered.sourcePostId;
      const canonicalSource = await readPublicSource(id);
      if (canonicalSource.kind !== "active") {
        processed.push({ id, skipped: true, reason: canonicalSource.kind });
        continue;
      }

      await observeSource(repo, id, canonicalSource);
      const locales: Record<string, unknown> = {};

      for (const locale of ["en", "roman"] as const) {
        const result = await localizeStory(repo, id, locale, provider, {
          verifySource: () => readPublicSource(id),
          retryFailed,
        });
        locales[locale] = {
          result: result.kind,
          revision: result.revision?.revisionId ?? null,
          validationPassed: result.revision?.validation?.passed ?? null,
          editorial: result.revision?.editorialStatus ?? null,
          publish: result.revision?.publishStatus ?? null,
        };
      }

      processed.push({ id, locales });
    }

    return NextResponse.json({
      ok: true,
      discovered: latest.stories.map((story) => story.sourcePostId),
      processed,
      retryFailed,
      note: "Automatic intake never auto-approves editorial content.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Autofeed failed",
      },
      { status: 500 },
    );
  }
}
