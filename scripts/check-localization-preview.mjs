import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
const origin = process.env.CHECK_ORIGIN || "http://127.0.0.1:3010";
const store = JSON.parse(
  await readFile(
    join(
      resolve(process.env.LOCALIZATION_DATA_DIR || ".data/localization"),
      "store.json",
    ),
    "utf8",
  ),
);
let checks = 0;
const check = (v, msg) => {
  assert.ok(v, msg);
  checks++;
};
async function page(path) {
  const response = await fetch(new URL(path, origin), {
    headers: { "user-agent": "Googlebot" },
    redirect: "manual",
  });
  return { status: response.status, html: await response.text() };
}
const index = await page("/translation-preview");
check(index.status === 200, "review index");
check(
  index.html.includes("noindex, nofollow"),
  "review index excluded from search",
);
for (const record of Object.values(store.stories).slice(0, 3))
  for (const locale of ["en", "roman"]) {
    const p = await page(
      `/translation-preview/${record.sourcePostId}/${locale}`,
    );
    check(p.status === 200, "locale preview available");
    check(p.html.includes("noindex, nofollow"), "preview noindex");
    check(p.html.includes(record.sharedStoryId), "shared identity shown");
    check(p.html.includes(record.currentSourceHash), "source revision shown");
    check(p.html.includes("HINDI SOURCE SNAPSHOT"), "source snapshot shown");
    check(
      p.html.includes(`lang="${locale === "en" ? "en" : "hi-Latn"}"`),
      "localized content language",
    );
    const last = record.revisions.filter((r) => r.locale === locale).at(-1);
    check(p.html.includes(last.translationStatus), "workflow status shown");
    if (!last.generatedAt)
      check(
        p.html.includes("No generated translation is available"),
        "no fabricated live output",
      );
    else
      check(p.html.includes("Prepared metadata"), "localized SEO fields shown");
    const history = await page(
      `/translation-preview/${record.sourcePostId}/${locale}?revision=${last.revisionId}`,
    );
    check(
      history.status === 200 && history.html.includes(last.revisionId),
      "version history addressable",
    );
  }
for (const path of [
  "/translation-preview/not-id/en",
  "/translation-preview/13373/fr",
  "/translation-preview/9999999999/en",
  "/translation-preview/13373/en?revision=missing",
])
  check((await page(path)).status === 404, `invalid route ${path}`);
check(
  !(await page("/sitemap.xml")).html.includes("translation-preview"),
  "review routes absent from sitemap",
);
const paths = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith(".js")) paths.push(path);
  }
}
await walk(".next/static");
for (const path of paths) {
  const text = await readFile(path, "utf8");
  check(
    !/GEMINI_API_KEY|generativelanguage\.googleapis\.com|GEMINI_FREE_TIER_CONFIRMED/.test(
      text,
    ),
    "provider configuration and requests absent from browser bundle",
  );
}
console.log(
  `PASS: ${checks} localization-preview and client-bundle assertions; generated/pending state verified against local records.`,
);
