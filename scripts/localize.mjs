import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { loadTs } from "./wordpress-test-loader.mjs";
loadEnvConfig(process.cwd());
const { JsonLocalizationRepository } = loadTs("lib/localization/repository.ts");
const { observeSource, localizeStory, approveRevision, approveStory } = loadTs(
  "lib/localization/engine.ts",
);
const { readPublicSource } = loadTs("lib/localization/source.ts");
const { fetchSourceStories } = loadTs("lib/wordpress/client.ts");
const { makePlan, planHtml } = loadTs("lib/localization/html.ts");
const { createTranslationProvider } = loadTs(
  "lib/localization/providers/index.ts",
);
const repo = new JsonLocalizationRepository();
const [command, ...args] = process.argv.slice(2);
function idsFromArgs() {
  const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
  if (
    !ids.length ||
    ids.length > 3 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw new Error(
      "Supply one to three unique source post IDs. Bulk translation is disabled.",
    );
  return ids;
}
try {
  if (command === "list") {
    console.log(
      JSON.stringify(
        (await repo.list()).map((r) => ({
          id: r.sourcePostId,
          state: r.state,
          availability: r.availability,
          sourceRevision: r.currentSourceHash,
          revisions: r.revisions.map((v) => ({
            id: v.revisionId,
            locale: v.locale,
            status: v.translationStatus,
            editorial: v.editorialStatus,
            publish: v.publishStatus,
            version: v.translationVersion,
          })),
        })),
        null,
        2,
      ),
    );
  } else if (command === "seed" || command === "sync") {
    const ids = idsFromArgs();
    // Fail before any provider work unless configured for the explicitly confirmed free-tier project.
    const provider = command === "sync" ? createTranslationProvider() : null;
    for (const id of ids) {
      const source = await readPublicSource(id);
      await observeSource(repo, id, source);
      if (source.kind !== "active")
        throw new Error(`Source ${id} is ${source.kind}; processing stopped.`);
      console.log(`Source ${id}: stored immutable Hindi revision`);
      if (provider)
        for (const locale of ["en", "roman"]) {
          const result = await localizeStory(repo, id, locale, provider, {
            verifySource: () => readPublicSource(id),
            retryFailed: args.includes("--retry-failed"),
          });
          console.log(
            JSON.stringify({
              id,
              locale,
              result: result.kind,
              revision: result.revision?.revisionId,
              validation: result.revision?.validation,
            }),
          );
          if (
            [
              "validation_failed",
              "failed",
              "superseded",
              "source_unavailable",
            ].includes(result.kind)
          )
            throw new Error(
              "Generation did not pass; stopped for review. Prior valid revisions are retained.",
            );
        }
    }
  } else if (command === "autofeed") {
    // Bounded automatic intake: discover the latest published Hindi posts,
    // store immutable source revisions, and generate current EN + Roman drafts.
    // Editorial approval remains a separate explicit gate.
    const requestedLimit = Number(
      args.find((arg) => /^--limit=\d+$/.test(arg))?.split("=")[1] ?? 6,
    );
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 6)
      throw new Error("autofeed --limit must be between 1 and 6");

    const latest = await fetchSourceStories({ limit: requestedLimit });
    if (!latest.ok)
      throw new Error(`Latest source feed unavailable: ${latest.reason}`);

    const provider = createTranslationProvider();
    const summary = [];
    for (const story of [...latest.stories].reverse()) {
      const id = story.sourcePostId;

      // Use the single-post endpoint as the canonical snapshot for both the
      // initial observation and the post-generation verification. WordPress
      // collection and single-post responses can differ in embedded metadata
      // even when the article itself has not changed.
      const canonicalSource = await readPublicSource(id);
      if (canonicalSource.kind !== "active") {
        summary.push({
          id,
          skipped: true,
          reason: canonicalSource.kind,
        });
        continue;
      }
      await observeSource(repo, id, canonicalSource);

      const locales = {};
      for (const locale of ["en", "roman"]) {
        const result = await localizeStory(repo, id, locale, provider, {
          verifySource: () => readPublicSource(id),
          retryFailed: args.includes("--retry-failed"),
        });
        locales[locale] = {
          result: result.kind,
          revision: result.revision?.revisionId ?? null,
          validationPassed: result.revision?.validation?.passed ?? null,
          editorial: result.revision?.editorialStatus ?? null,
          publish: result.revision?.publishStatus ?? null,
          validationIssues:
            result.revision?.validation?.issues
              ?.filter((issue) => issue.severity === "error")
              .map((issue) => {
                const segmentId = issue.segmentId ?? null;
                let sourceText = null;
                let outputText = null;
                if (segmentId && result.revision) {
                  const sourcePlan = makePlan(canonicalSource.story);
                  sourceText =
                    sourcePlan.segments.find((segment) => segment.id === segmentId)
                      ?.text ?? null;
                  if (segmentId === "title") {
                    outputText = result.revision.localizedTitle;
                  } else if (segmentId.startsWith("excerpt.")) {
                    outputText =
                      planHtml(result.revision.localizedExcerpt, "excerpt").segments.find(
                        (segment) => segment.id === segmentId,
                      )?.text ?? null;
                  } else if (segmentId.startsWith("body.")) {
                    outputText =
                      planHtml(result.revision.localizedContent, "body").segments.find(
                        (segment) => segment.id === segmentId,
                      )?.text ?? null;
                  }
                }
                const clip = (value) =>
                  typeof value === "string" && value.length > 320
                    ? value.slice(0, 317) + "..."
                    : value;
                return {
                  code: issue.code,
                  segmentId,
                  message: issue.message,
                  sourceText: clip(sourceText),
                  outputText: clip(outputText),
                };
              }) ?? [],
        };
      }
      summary.push({ id, locales });
    }
    console.log(
      JSON.stringify(
        {
          mode: "autofeed",
          discovered: latest.stories.map((story) => story.sourcePostId),
          processed: summary,
          note: "Generated translations remain in editorial review; nothing is auto-approved.",
        },
        null,
        2,
      ),
    );
  } else if (command === "approve") {
    const [id, revisionId, actor, ...note] = args;
    await approveRevision(repo, Number(id), revisionId, actor, note.join(" "));
    console.log("Local editorial approval recorded. Nothing published.");
  } else if (command === "approve-story") {
    const [id, actor, ...note] = args;
    if (!/^\\d+$/.test(id ?? ""))
      throw new Error("A valid source post ID is required");
    const result = await approveStory(repo, Number(id), actor, note.join(" "));
    console.log(JSON.stringify(result, null, 2));
    console.log("Both current language revisions approved. Nothing written to WordPress.");
  } else
    throw new Error(
      "Usage: npm run localize -- seed|sync ID [ID ID] [--retry-failed] | autofeed [--limit=1..6] [--retry-failed] | list | approve ID REVISION REVIEWER REVIEW_NOTE | approve-story ID REVIEWER REVIEW_NOTE",
    );
} catch (error) {
  // Provider errors have already been redacted; never print HTTP requests, env values or stack traces.
  console.error(
    JSON.stringify({
      code: error.code ?? "localization",
      message: error.message,
      details: error.details ?? null,
    }),
  );
  process.exitCode = 1;
}
