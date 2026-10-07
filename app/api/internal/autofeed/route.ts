import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { observeSource, localizeStory } from "@/lib/localization/engine";
import { readPublicSource } from "@/lib/localization/source";
import { createTranslationProvider } from "@/lib/localization/providers";
import { fetchSourceStories } from "@/lib/wordpress/client";
import type { TranslationLocale } from "@/lib/localization/types";

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
    const url = new URL(request.url);
    const retryFailed = url.searchParams.get("retryFailed") === "true";
    const requestedId = Number(url.searchParams.get("id") ?? "");
    const requestedLocale = url.searchParams.get("locale");
    const localeFilter =
      requestedLocale === "en" || requestedLocale === "roman"
        ? requestedLocale
        : null;

    if (url.searchParams.has("id") && (!Number.isSafeInteger(requestedId) || requestedId < 1))
      return NextResponse.json({ ok: false, error: "Invalid story id" }, { status: 400 });
    if (requestedLocale && !localeFilter)
      return NextResponse.json({ ok: false, error: "Invalid locale" }, { status: 400 });

    const discoveredIds: number[] = [];
    if (Number.isSafeInteger(requestedId) && requestedId > 0) {
      discoveredIds.push(requestedId);
    } else {
      const latest = await fetchSourceStories({ limit: 6 });
      if (!latest.ok)
        return NextResponse.json(
          { ok: false, error: `Source feed unavailable: ${latest.reason}` },
          { status: 502 },
        );
      discoveredIds.push(...latest.stories.map((story) => story.sourcePostId));
    }

    const repo = new JsonLocalizationRepository();
    const provider = createTranslationProvider();
    const processed: Array<Record<string, unknown>> = [];

    for (const id of [...discoveredIds].reverse()) {
      const canonicalSource = await readPublicSource(id);
      if (canonicalSource.kind !== "active") {
        processed.push({ id, skipped: true, reason: canonicalSource.kind });
        continue;
      }

      await observeSource(repo, id, canonicalSource);
      const locales: Record<string, unknown> = {};
      const targetLocales: TranslationLocale[] = localeFilter
        ? [localeFilter]
        : ["en", "roman"];

      for (const locale of targetLocales) {
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
      discovered: discoveredIds,
      processed,
      retryFailed,
      locale: localeFilter,
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
