import { lstat, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, resolve, join } from "node:path";

const requestedId = process.argv[2] ? Number(process.argv[2]) : null;
if (
  requestedId !== null &&
  (!Number.isSafeInteger(requestedId) || requestedId < 1)
)
  throw new Error("Optional pilot post ID must be a positive integer");

const configured = process.env.LOCALIZATION_DATA_DIR;
if (!configured?.trim())
  throw new Error("LOCALIZATION_DATA_DIR is not configured");

const directory = resolve(configured);
const publicRoot = resolve("public");
const cwd = resolve(".");

if (
  directory === publicRoot ||
  directory.startsWith(publicRoot + "/")
)
  throw new Error("Localization storage must never be inside public/");

if (process.env.REQUIRE_PERSISTENT_LOCALIZATION === "true") {
  if (!isAbsolute(configured))
    throw new Error(
      "Production localization storage must use an absolute persistent path",
    );
  if (directory === cwd || directory.startsWith(cwd + "/"))
    throw new Error(
      "Production localization storage must be outside the versioned application release directory",
    );
}

const directoryStat = await lstat(directory);
if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())
  throw new Error("Localization storage path must be a real directory");

await access(directory, constants.R_OK | constants.W_OK);

const storePath = join(directory, "store.json");
const storeStat = await lstat(storePath);
if (!storeStat.isFile() || storeStat.isSymbolicLink())
  throw new Error("store.json must be a regular non-symlink file");

const raw = await readFile(storePath, "utf8");
const db = JSON.parse(raw);
if (
  db?.schemaVersion !== 1 ||
  !db.stories ||
  typeof db.stories !== "object" ||
  Array.isArray(db.stories)
)
  throw new Error("Unsupported or corrupt localization store");

const records = Object.values(db.stories);
const summary = {
  directory,
  stories: records.length,
  pilot: null,
};

if (requestedId !== null) {
  const record = db.stories[String(requestedId)];
  if (!record)
    throw new Error(`Pilot post ${requestedId} is not present in store`);

  const readiness = {};
  for (const locale of ["en", "roman"]) {
    const revisionId = record.current?.[locale];
    const revision = record.revisions?.find(
      (item) => item.revisionId === revisionId,
    );
    readiness[locale] = revision
      ? {
          revisionId: revision.revisionId,
          generated: revision.translationStatus === "generated",
          validationPassed: revision.validation?.passed === true,
          editorial: revision.editorialStatus,
          publish: revision.publishStatus,
          currentSource:
            revision.sourceRevisionHash === record.currentSourceHash,
        }
      : null;
  }

  summary.pilot = {
    id: requestedId,
    state: record.state,
    availability: record.availability,
    readiness,
  };
}

console.log(JSON.stringify(summary, null, 2));
