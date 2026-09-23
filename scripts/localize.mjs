import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { loadTs } from "./wordpress-test-loader.mjs";
loadEnvConfig(process.cwd());
const { JsonLocalizationRepository } = loadTs("lib/localization/repository.ts");
const { observeSource, localizeStory, approveRevision } = loadTs(
  "lib/localization/engine.ts",
);
const { readPublicSource } = loadTs("lib/localization/source.ts");
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
  } else if (command === "approve") {
    const [id, revisionId, actor, ...note] = args;
    await approveRevision(repo, Number(id), revisionId, actor, note.join(" "));
    console.log("Local editorial approval recorded. Nothing published.");
  } else
    throw new Error(
      "Usage: npm run localize -- seed|sync ID [ID ID] [--retry-failed] | list | approve ID REVISION REVIEWER REVIEW_NOTE",
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
