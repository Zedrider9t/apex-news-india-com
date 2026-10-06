import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTs } from "./wordpress-test-loader.mjs";
const { normalizePost } = loadTs("lib/wordpress/normalize.ts");
const { JsonLocalizationRepository } = loadTs("lib/localization/repository.ts");
const { makeSourceRevision, canonical } = loadTs(
  "lib/localization/revisions.ts",
);
const {
  makePlan,
  protectSegments,
  restoreSegments,
  planHtml,
  renderHtml,
  structure,
} = loadTs("lib/localization/html.ts");
const { validateTranslation } = loadTs("lib/localization/validation.ts");
const { observeSource, localizeStory, approveRevision } = loadTs(
  "lib/localization/engine.ts",
);
const { GeminiTranslationProvider } = loadTs(
  "lib/localization/providers/gemini.ts",
);
const { TranslationProviderError, PROMPT_VERSION } = loadTs(
  "lib/localization/provider.ts",
);
const { createTranslationProvider } = loadTs(
  "lib/localization/providers/index.ts",
);
let count = 0;
function check(condition, message) {
  assert.ok(condition, message);
  count++;
}
async function rejects(fn, regex, message) {
  await assert.rejects(fn, regex);
  count++;
  if (message) void message;
}
const fixtures = JSON.parse(
  readFileSync("tests/fixtures/wordpress-posts.json", "utf8"),
);
const realSources = fixtures.map(normalizePost);
const source = {
  ...structuredClone(realSources[0]),
  titleHindi: "प्रधानमंत्री नरेंद्र मोदी की बैठक",
  rawExcerpt: "<p>दिल्ली में बैठक।</p>",
  rawContentHtml:
    '<h2>बैठक</h2><p>प्रधानमंत्री नरेंद्र मोदी ने 17 सितंबर 2026 को दिल्ली में कहा, “सरकार 2 करोड़ रुपये दे सकती है।”</p><ul><li>दावा है।</li></ul><blockquote>आरोप है।</blockquote><p><a href="https://example.com/news?x=2&amp;y=1" class="source" id="ref">रिपोर्ट</a></p><figure><img src="https://apexnewsindia.in/wp-content/uploads/test.webp" alt="दिल्ली"/><figcaption>दिल्ली</figcaption></figure><iframe src="https://www.youtube.com/embed/abc123" title="बैठक"></iframe><p>[gallery ids="1,2"] https://example.com/1</p>',
  categories: [
    {
      id: 44,
      name: "भारत",
      slug: "country",
      taxonomy: "category",
      sourceUrl: null,
    },
  ],
  tags: [],
  contentText: ["प्रधानमंत्री ने कहा।"],
};
const active = (s) => async () => ({ kind: "active", story: s });
const replace = (s, locale) => {
  const pairs =
    locale === "en"
      ? [
          ["प्रधानमंत्री नरेंद्र मोदी", "Prime Minister Narendra Modi"],
          ["17 सितंबर 2026", "17 September 2026"],
          ["2 करोड़ रुपये", "2 crore rupees"],
          ["दिल्ली", "Delhi"],
          ["सरकार", "government"],
          ["भारत", "India"],
          ["की बैठक", "meeting"],
          ["में बैठक", "meeting in"],
          ["बैठक", "Meeting"],
          ["दे सकती है", "may provide"],
          ["कहा", "said"],
          ["दावा है", "It is claimed"],
          ["आरोप है", "It is alleged"],
          ["रिपोर्ट", "Report"],
          [" ने ", " "],
          [" को ", " on "],
          [" में ", " in "],
          ["।", "."],
        ]
      : [
          ["प्रधानमंत्री नरेंद्र मोदी", "Pradhanmantri Narendra Modi"],
          ["17 सितंबर 2026", "17 September 2026"],
          ["2 करोड़ रुपये", "2 crore rupaye"],
          ["दिल्ली", "Delhi"],
          ["सरकार", "sarkar"],
          ["भारत", "Bharat"],
          ["की बैठक", "ki baithak"],
          ["में बैठक", "mein baithak"],
          ["बैठक", "Baithak"],
          ["दे सकती है", "de sakti hai"],
          ["कहा", "kaha"],
          ["दावा है", "Daava hai"],
          ["आरोप है", "Aarop hai"],
          ["रिपोर्ट", "Report"],
          [" ने ", " ne "],
          [" को ", " ko "],
          [" में ", " mein "],
          ["।", "."],
        ];
  for (const [a, b] of pairs) s = s.split(a).join(b);
  return s;
};
class FixtureProvider {
  name = "test-fixture";
  model = "deterministic-test-double";
  calls = 0;
  async translate(request) {
    this.calls++;
    return {
      segments: request.segments.map((s) => ({
        id: s.id,
        text: replace(s.text, request.locale),
      })),
      confidence: 0.96,
      warnings: [],
      metadata: {
        provider: this.name,
        model: this.model,
        promptVersion: PROMPT_VERSION,
      },
    };
  }
  async verify(request) {
    return {
      passed: true,
      confidence: 0.99,
      issues: [],
      metadata: {
        provider: this.name,
        model: this.model,
        promptVersion: request.promptVersion,
      },
    };
  }
}
const base = makeSourceRevision(source);
check(base.changeKind === "new", "new source");
check(
  base.hash === makeSourceRevision(structuredClone(source)).hash,
  "deterministic revision",
);
check(
  canonical({ b: 1, a: 2 }) === canonical({ a: 2, b: 1 }),
  "stable key ordering",
);
check(
  makeSourceRevision({ ...source, warnings: ["different diagnostic"] }, base)
    .changeKind === "unchanged",
  "diagnostic warning not content revision",
);
const modified = { ...source, modifiedAt: "2026-09-18T09:00:00.000Z" };
check(
  makeSourceRevision(modified, base).changeKind === "metadata_only",
  "modified timestamp detected",
);
check(
  makeSourceRevision({ ...source, titleHindi: source.titleHindi + " आज" }, base)
    .changeKind === "content_changed",
  "title change",
);
check(
  makeSourceRevision(
    { ...source, rawContentHtml: source.rawContentHtml + "<p>नई खबर</p>" },
    base,
  ).changeKind === "content_changed",
  "body change",
);
check(
  makeSourceRevision(
    { ...source, categories: [{ ...source.categories[0], name: "देश" }] },
    base,
  ).textHash !== base.textHash,
  "taxonomy text requires localization",
);
for (const story of realSources) {
  const plan = makePlan(story);
  check(plan.segments.length > 3, `real source ${story.sourcePostId} parsed`);
  check(renderHtml(plan.body.nodes).length > 0, "source HTML retained");
  const r = makeSourceRevision(story);
  check(r.hash.length === 64, "SHA-256 source revision");
}
const plan = makePlan(source);
check(
  plan.body.segments.some((s) => s.context === "h2"),
  "heading node",
);
check(
  plan.body.segments.some((s) => s.context === "blockquote"),
  "quote node",
);
check(
  plan.body.segments.some((s) => s.context === "img@alt"),
  "human-facing attribute",
);
for (const locale of ["en", "roman"]) {
  const protectedPlan = protectSegments(plan.segments, locale);
  const provider = new FixtureProvider();
  const response = await provider.translate({
    locale,
    segments: protectedPlan.segments,
    promptVersion: PROMPT_VERSION,
  });
  const restored = restoreSegments(protectedPlan, response.segments);
  const validation = validateTranslation(
    plan,
    restored.translations,
    locale,
    restored.issues,
    response.confidence,
  );
  check(validation.passed, `${locale} valid controlled translation`);
  check(
    validation.issues.some((i) => i.code === "semantic_review"),
    "manual semantic review always required",
  );
  const html = renderHtml(plan.body.nodes, restored.translations);
  check(
    html.includes("17 September 2026"),
    "date components and month preserved",
  );
  check(
    html.includes("2 crore " + (locale === "en" ? "rupees" : "rupaye")),
    "currency value preserved",
  );
  check(html.includes("Narendra Modi"), "name preserved");
  check(
    !/[\u0900-\u097f]/.test(html),
    "no unexplained Devanagari in fixture output",
  );
  check(
    html.includes("https://example.com/news?x=2&amp;y=1"),
    "link including tracking values preserved",
  );
  check(html.includes("[gallery ids=&quot;1,2&quot;]"), "shortcode literal");
  check(
    html.includes("https://www.youtube.com/embed/abc123"),
    "embed source preserved",
  );
  check(html.includes("test.webp"), "image retained");
  check(html.includes("“") && html.includes("”"), "quote structure retained");
  check(
    canonical(structure(plan.body.nodes)) ===
      canonical(structure(planHtml(html).nodes)),
    "same HTML structure",
  );
  const dropped = restoreSegments(protectedPlan, response.segments.slice(1));
  check(
    dropped.issues.some((i) => i.code === "missing_segment"),
    "partial output rejected",
  );
  const duplicate = restoreSegments(protectedPlan, [
    ...response.segments,
    response.segments[0],
  ]);
  check(
    duplicate.issues.some((i) => i.code === "segment_identity"),
    "duplicate IDs rejected",
  );
  const altered = structuredClone(response.segments);
  altered[0].text = altered[0].text.replace("⟦APX0⟧", "wrong");
  check(
    restoreSegments(protectedPlan, altered).issues.some(
      (i) => i.code === "protected_literal",
    ),
    "entity deletion detected",
  );
  const numbers = structuredClone(restored.translations);
  const numeric = Object.keys(numbers).find((k) => numbers[k].includes("2026"));
  numbers[numeric] = numbers[numeric].replace("2026", "2027");
  check(
    !validateTranslation(plan, numbers, locale).passed,
    "date corruption fails",
  );
  const quote = structuredClone(restored.translations);
  quote[numeric] = quote[numeric].replace("“", "");
  check(
    validateTranslation(plan, quote, locale).issues.some(
      (i) => i.code === "quote_mismatch",
    ),
    "missing quote",
  );
  const url = structuredClone(restored.translations);
  const urlKey = Object.keys(url).find((k) =>
    url[k].includes("https://example.com/1"),
  );
  url[urlKey] = url[urlKey].replace("/1", "/2");
  check(
    validateTranslation(plan, url, locale).issues.some(
      (i) => i.code === "url_mismatch",
    ),
    "text URL corruption fails",
  );
  const markdown = { ...restored.translations, title: "**invented title**" };
  check(
    !validateTranslation(plan, markdown, locale).passed,
    "Markdown rejected",
  );
  const blank = { ...restored.translations, title: "" };
  check(
    !validateTranslation(plan, blank, locale).passed,
    "blank title rejected",
  );
  const hindi = { ...restored.translations, title: "यह अनुवाद नहीं है" };
  check(
    validateTranslation(plan, hindi, locale).issues.some(
      (i) => i.code === "untranslated_devanagari",
    ),
    "untranslated Hindi warning",
  );
  const verbose = { ...restored.translations, [numeric]: "x".repeat(2000) };
  check(
    validateTranslation(plan, verbose, locale).issues.some(
      (i) => i.code === "length_ratio",
    ),
    "unexpected expansion warning",
  );
  check(
    validateTranslation(
      plan,
      restored.translations,
      locale,
      [],
      0.2,
    ).issues.some((i) => i.code === "low_confidence"),
    "low confidence warning",
  );
}
const badHtml = planHtml(
  '<script>alert(1)</script><p onclick="alert(1)">ठीक<img src="javascript:alert(1)" onerror="bad()"><a href="javascript:bad()">खबर</a></p><svg onload="bad()"></svg>',
);
check(
  !/script|onclick|onerror|javascript|svg/.test(renderHtml(badHtml.nodes)),
  "unsafe HTML removed",
);
check(badHtml.issues.length >= 4, "sanitization recorded");
check(
  renderHtml(planHtml("<p>one<p>two").nodes) === "<p>one</p><p>two</p>",
  "malformed HTML normalized",
);
const inline = planHtml("<p>एक <strong>दो</strong> तीन</p>");
check(
  renderHtml(inline.nodes).includes("एक <strong>दो</strong> तीन"),
  "inline boundaries maintained",
);
const block =
  '<!-- wp:gallery {"ids":[1,2]} --><figure><img src="https://apexnewsindia.in/wp-content/uploads/test.webp"></figure><!-- /wp:gallery -->';
check(
  renderHtml(planHtml(block).nodes).includes(
    '<!-- wp:gallery {"ids":[1,2]} -->',
  ),
  "Gutenberg block metadata preserved inertly",
);
assert.throws(
  () => new JsonLocalizationRepository("public/records"),
  /must not be exposed/,
);
count++;
const dir = await mkdtemp(join(tmpdir(), "apex-localization-"));
const repo = new JsonLocalizationRepository(dir);
const provider = new FixtureProvider();
try {
  const before = JSON.stringify(source);
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: source,
  });
  check(JSON.stringify(source) === before, "source caller not mutated");
  let record = await repo.read(source.sourcePostId);
  check(
    record.revisions.length === 2 &&
      record.revisions.every((r) => r.translationStatus === "pending"),
    "separate pending locale records",
  );
  for (const locale of ["en", "roman"]) {
    const out = await localizeStory(
      repo,
      source.sourcePostId,
      locale,
      provider,
      { verifySource: active(source) },
    );
    check(out.kind === "generated", `${locale} generation stored`);
    check(
      out.revision.editorialStatus === "needs_review" &&
        out.revision.publishStatus === "draft",
      "generated is never auto-published",
    );
  }
  record = await repo.read(source.sourcePostId);
  check(
    record.current.en !== record.current.roman,
    "separate localized records",
  );
  check(
    record.sources[0].story.rawContentHtml === source.rawContentHtml,
    "Hindi source immutable",
  );
  const oldId = record.current.en;
  const calls = provider.calls;
  check(
    (
      await localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: active(source),
      })
    ).kind === "unchanged",
    "unchanged skip",
  );
  check(provider.calls === calls, "unchanged source no provider cost");
  const approved = await approveRevision(
    repo,
    source.sourcePostId,
    oldId,
    "Test reviewer",
    "Bilingual fixture comparison completed",
  );
  check(
    approved.publishStatus === "ready" &&
      approved.editorialStatus === "manually_approved",
    "explicit approval transition",
  );
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: modified,
  });
  const meta = await localizeStory(repo, source.sourcePostId, "en", provider, {
    verifySource: active(modified),
  });
  check(meta.kind === "generated", "metadata revision created");
  check(provider.calls === calls, "metadata-only text reused");
  check(meta.revision.basedOnRevisionId === oldId, "reuse provenance retained");
  check(meta.revision.revisionId !== oldId, "new immutable localized revision");
  record = await repo.read(source.sourcePostId);
  check(
    record.revisions.some((r) => r.revisionId === oldId),
    "old translation preserved",
  );
  check(record.sources.length === 2, "source snapshots retained");
  const changed = { ...modified, titleHindi: source.titleHindi + " दिल्ली" };
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: changed,
  });
  const body = await localizeStory(repo, source.sourcePostId, "en", provider, {
    verifySource: active(changed),
  });
  check(
    body.kind === "generated" && provider.calls > calls,
    "changed title regenerated",
  );
  const validId = (await repo.read(source.sourcePostId)).current.en;
  const changedAgain = { ...changed, titleHindi: changed.titleHindi + " भारत" };
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: changedAgain,
  });
  const failing = {
    name: "failure-test",
    model: "none",
    async translate() {
      throw new TranslationProviderError("quota", "Quota test", {
        httpStatus: 429,
        quotaMetric: "test-free-tier",
      });
    },
  };
  await rejects(
    () =>
      localizeStory(repo, source.sourcePostId, "en", failing, {
        verifySource: active(changedAgain),
      }),
    /Quota test/,
  );
  record = await repo.read(source.sourcePostId);
  check(record.current.en === validId, "quota does not replace valid revision");
  check(
    record.revisions.at(-1).translationStatus === "failed",
    "failed attempt recorded",
  );
  check(
    (
      await localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: active(changedAgain),
      })
    ).kind === "retry_required",
    "no automatic failed retry",
  );
  const partial = {
    ...provider,
    name: "partial",
    model: "test",
    async translate() {
      return {
        segments: [],
        confidence: 0.5,
        warnings: [],
        metadata: {
          provider: "partial",
          model: "test",
          promptVersion: PROMPT_VERSION,
        },
      };
    },
  };
  const partialResult = await localizeStory(
    repo,
    source.sourcePostId,
    "en",
    partial,
    { verifySource: active(changedAgain), retryFailed: true },
  );
  check(
    partialResult.kind === "validation_failed",
    "partial generation fails validation",
  );
  check(
    (await repo.read(source.sourcePostId)).current.en === validId,
    "validation failure retains previous accepted version",
  );
  const nextSource = {
    ...changedAgain,
    modifiedAt: "2026-09-18T10:00:00.000Z",
  };
  await rejects(
    () =>
      localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: active(nextSource),
        retryFailed: true,
      }),
    /Source changed/,
  );
  check(
    (await repo.read(source.sourcePostId)).current.en === validId,
    "source race does not replace valid version",
  );
  await rejects(
    () =>
      localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: async () => ({ kind: "unconfirmed_missing" }),
        retryFailed: true,
      }),
    /no longer confirmed active/,
  );
  record = await repo.read(source.sourcePostId);
  check(
    record.state === "active" && record.availability === "unconfirmed_missing",
    "404 not falsely classified deleted",
  );
  await rejects(
    () =>
      approveRevision(
        repo,
        source.sourcePostId,
        validId,
        "Reviewer",
        "Checked",
      ),
    /current validated/,
  );
  await observeSource(repo, source.sourcePostId, {
    kind: "deleted",
    evidence: "Explicit test-only authoritative tombstone",
  });
  record = await repo.read(source.sourcePostId);
  check(
    record.state === "deleted" &&
      record.revisions.every((r) => r.publishStatus === "withdrawn"),
    "confirmed deletion withdraws local records",
  );
  check(
    record.revisions.every((r) => r.sourceDeleted),
    "deleted flags",
  );
  check(
    (
      await localizeStory(repo, source.sourcePostId, "roman", provider, {
        verifySource: active(source),
      })
    ).kind === "source_unavailable",
    "deleted source cannot generate",
  );
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: source,
  });
  check(
    (await repo.read(source.sourcePostId)).state === "active",
    "source restoration",
  );
  await observeSource(repo, source.sourcePostId, {
    kind: "unpublished",
    evidence: "Explicit test-only unpublish observation",
  });
  check(
    (await repo.read(source.sourcePostId)).revisions.every(
      (r) => r.sourceUnpublished,
    ),
    "unpublished flags",
  );
  const reopened = new JsonLocalizationRepository(dir);
  check(
    (await reopened.read(source.sourcePostId)).sources.length >= 3,
    "persistence survives repository restart",
  );
  await writeFile(join(dir, "write.lock"), "test");
  await rejects(() => repo.transact(() => 1), /locked/);
  await rm(join(dir, "write.lock"));
  check(
    (await repo.read(source.sourcePostId)).state === "unpublished",
    "lock contention preserves store",
  );
  await rejects(
    () =>
      repo.transact(() => {
        throw new Error("transaction-abort");
      }),
    /transaction-abort/,
  );
  check(
    JSON.parse(await readFile(join(dir, "store.json"), "utf8"))
      .schemaVersion === 1,
    "transaction failure preserves file",
  );

  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: source,
  });
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  let started;
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const slow = {
    name: "slow-test",
    model: "test",
    async translate(req) {
      started();
      await held;
      return provider.translate(req);
    },
    async verify(req) {
      return provider.verify(req);
    },
  };
  const running = localizeStory(repo, source.sourcePostId, "en", slow, {
    verifySource: active(source),
    retryFailed: true,
  });
  await began;
  check(
    (
      await localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: active(source),
      })
    ).kind === "processing",
    "concurrent job excluded",
  );
  release();
  await running;
  // Source deletion during processing never promotes generated content.
  const removalSource = {
    ...source,
    titleHindi: source.titleHindi + " दिल्ली",
  };
  await observeSource(repo, source.sourcePostId, {
    kind: "active",
    story: removalSource,
  });
  await rejects(
    () =>
      localizeStory(repo, source.sourcePostId, "en", provider, {
        verifySource: async () => ({
          kind: "deleted",
          evidence: "Test removal during generation",
        }),
        retryFailed: true,
      }),
    /no longer confirmed active/,
  );
  check(
    (await repo.read(source.sourcePostId)).revisions.at(-1).publishStatus ===
      "withdrawn",
    "removal during processing withdraws attempt",
  );
  // Re-read objects are detached from persistent immutable source snapshots.
  const detached = await repo.read(source.sourcePostId);
  detached.sources[0].story.titleHindi = "mutated caller";
  check(
    (await repo.read(source.sourcePostId)).sources[0].story.titleHindi !==
      detached.sources[0].story.titleHindi,
    "reader cannot mutate stored source",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
// Gemini HTTP contract is exercised with a fake transport, never paid/live calls.
const key = "test-key-never-used-on-network";
const request = {
  locale: "roman",
  segments: [{ id: "title", text: "⟦APX0⟧ की बैठक", context: "headline" }],
  promptVersion: PROMPT_VERSION,
};
let fetchCalls = 0;
const successFetch = async (url, init) => {
  fetchCalls++;
  check(
    url.includes("gemini-3.1-flash-lite:generateContent"),
    "configured model endpoint",
  );
  check(!url.includes(key), "key not in URL");
  check(init.headers["x-goog-api-key"] === key, "key only in server header");
  const body = JSON.parse(init.body);
  check(
    body.generationConfig.responseMimeType === "application/json",
    "structured output configured",
  );
  check(
    body.systemInstruction.parts[0].text.includes("Roman Hindi"),
    "Roman instructions",
  );
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  segments: [{ id: "title", text: "⟦APX0⟧ ki baithak" }],
                  confidence: 0.94,
                  warnings: [],
                }),
              },
            ],
          },
        },
      ],
      modelVersion: "gemini-test",
      usageMetadata: { totalTokenCount: 50 },
      responseId: "test-response",
    }),
    { headers: { "content-type": "application/json" } },
  );
};
const gemini = new GeminiTranslationProvider({
  apiKey: key,
  freeTierConfirmed: true,
  fetcher: successFetch,
});
const response = await gemini.translate(request);
check(
  response.metadata.provider === "gemini" &&
    response.metadata.model === "gemini-test",
  "Gemini model provenance",
);
check(response.metadata.usage.totalTokenCount === 50, "token usage metadata");
check(fetchCalls === 1, "one request without retries");
for (const [status, expected] of [
  [429, "quota"],
  [403, "configuration"],
  [404, "configuration"],
  [500, "unavailable"],
]) {
  let calls = 0;
  const p = new GeminiTranslationProvider({
    apiKey: key,
    freeTierConfirmed: true,
    fetcher: async () => {
      calls++;
      return new Response(
        JSON.stringify({
          error: {
            status: "RESOURCE_EXHAUSTED",
            message: key,
            details: [
              {
                violations: [
                  {
                    quotaMetric: "generate_content_free_tier_requests",
                    quotaValue: "0",
                    quotaDimensions: { model: "test" },
                  },
                ],
              },
              { retryDelay: "60s" },
            ],
          },
        }),
        { status },
      );
    },
  });
  try {
    await p.translate(request);
    assert.fail("must reject");
  } catch (e) {
    check(e.code === expected, `HTTP ${status} typed failure`);
    check(
      !JSON.stringify(e.details).includes(key),
      "secrets not included in safe diagnostics",
    );
    if (status === 429) {
      check(
        e.details.quota[0].quotaValue === "0",
        "exact quota limitation retained",
      );
      check(
        e.details.retryDelay === "60s",
        "retry delay retained but not auto retried",
      );
    }
  }
  check(calls === 1, `HTTP ${status} never retried`);
}
for (const payload of [
  "not JSON",
  JSON.stringify({ candidates: [] }),
  JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
  JSON.stringify({
    candidates: [
      { finishReason: "STOP", content: { parts: [{ text: "{}" }] } },
    ],
  }),
]) {
  const p = new GeminiTranslationProvider({
    apiKey: key,
    freeTierConfirmed: true,
    fetcher: async () => new Response(payload),
  });
  await rejects(() => p.translate(request), /Gemini/);
}
const timeoutProvider = new GeminiTranslationProvider({
  apiKey: key,
  freeTierConfirmed: true,
  timeoutMs: 5,
  fetcher: (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(new Error("abort"))),
    ),
});
await rejects(() => timeoutProvider.translate(request), /timed out/);
assert.throws(
  () => new GeminiTranslationProvider({ apiKey: "", freeTierConfirmed: true }),
  /GEMINI_API_KEY/,
);
count++;
assert.throws(
  () =>
    new GeminiTranslationProvider({ apiKey: key, freeTierConfirmed: false }),
  /billing disabled/,
);
count++;
process.env.TRANSLATION_PROVIDER = "paid-alternative";
assert.throws(() => createTranslationProvider(), /fallback is disabled/);
count++;
delete process.env.TRANSLATION_PROVIDER;
console.log(
  `PASS: ${count} localization/sync assertions. Fixture translations are test doubles, not Gemini-generated real articles.`,
);
