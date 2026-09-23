# Gemini localization and sync-state development phase

Implemented 18 September 2026. **Implementation and offline verification are complete; real Gemini generation is blocked by missing configuration.** The live preflight returned:

```json
{"code":"configuration","message":"GEMINI_API_KEY is missing; no live translation request was made.","details":{}}
```

No real English or Roman Hindi translations have been generated in this phase. No quota availability or live translation-quality claim can be made without a configured key. There is no automatic paid-provider or model fallback. The approved design, `/en`, `/roman`, mock fallback, locale switcher, canonical/hreflang and WordPress source adapter are unchanged. Nothing has been deployed or written to WordPress.

## 1. Localized content model

`lib/localization/types.ts` defines `LocalizedArticle`, `SourceRevision`, `StoryRecord`, `TranslationProvider`, `LocalizationRepository`, provider metadata and validation contracts. Every source has separate English and Roman Hindi records linked by `wp:apexnewsindia.in:{postId}`. A localized record includes source identity/URL/modification/hash, locale, slug/title/excerpt/HTML, taxonomy labels, SEO copy, version/provider/model/prompt/usage metadata, generated/synced dates, workflow/correction/publication states, deletion/unpublication flags, warnings and validation results.

`SourceStory` is not modified. Each observed revision stores a detached source snapshot, and reads return detached copies. Previous source and localized revisions remain available. A pending record is not a translation. The existing frozen `ApexArticle` and locale models were not changed.

## 2. Persistence

A replaceable `LocalizationRepository` interface is implemented by `JsonLocalizationRepository`. Development records live in `.data/localization/store.json` (not localStorage), with schema version 1. Writes use an exclusive process lock, mode-0600 temporary file, fsync and atomic rename. Readers see a complete old or new snapshot; transaction callbacks cannot await network operations. `.gitignore` excludes local data and secrets. Storage under `public/` is rejected.

This deliberately small local repository supports the bounded development sample, not a multi-host production service. An abandoned `write.lock` fails closed: inspect its PID and confirm that the process has exited before manually removing it. Do not blindly delete active locks. Production should use a transactional database with uniqueness constraints and durable job leases. Atomic rename is not a backup strategy; source data is public, but local editorial history should still be backed up before migration.

## 3. Revision detection

Canonical JSON plus SHA-256 creates deterministic source, translatable-text, substantive title/body and metadata fingerprints. Source `modifiedAt` contributes to the revision. Fetch timestamps and diagnostic warnings do not create artificial content revisions.

- New source: immutable snapshot and two pending locale records.
- Unchanged source with a valid current translation: no provider request.
- Metadata-only change with identical translatable text: new localized revision reuses validated text, records its parent, and returns to review without a Gemini call.
- Title/body or other translatable text change: new generation; old revisions stay intact.
- In-progress job: excluded by a persisted token and lease.
- Source changes during generation: refetch and compare before commit; local compare-and-swap rejects stale output.
- Failed/invalid attempt: retained in history, never promoted over a prior valid revision. Retrying the same failed revision requires explicit `--retry-failed`.

The source may still change immediately after the final remote check. Future periodic/event-driven reconciliation must handle that unavoidable polling interval.

## 4–5. Roman Hindi and English

`GeminiTranslationProvider` makes structured server-side Gemini requests. Each locale is requested independently and stored independently. Roman Hindi instructions request natural Hindi grammar in Latin script, not mechanical transliteration or English paraphrasing. English instructions request faithful professional news translation, not summarization or rewriting.

Reusable vocabulary covers Bharat/India, Pradhanmantri/Prime Minister, sarkar/government, Delhi/New Delhi, Narendra Modi, calendar months, common number words and currency magnitude/unit terms. Longer phrases match before shorter ones. This is general vocabulary, not article-specific factual substitution.

Prompts require every claim, caveat, attribution, quoted statement and uncertainty marker to survive. Source text is explicitly untrusted data, not model instructions. The glossary is intentionally finite: it is not a universal named-entity recognizer or numeric-word parser. Uncovered names, complex spelled-out values and political semantics require bilingual review.

## 6. HTML-aware preservation

The existing `htmlparser2` dependency builds an allowlisted tree. Translatable text nodes and human-facing attributes (`alt`, `title`, `aria-label`, `label`) receive stable segment IDs. Safe links, media URLs/srcset, IDs/classes and nonhuman attributes stay outside translation. Headings, lists, blockquotes, tables, figures/captions, image/video/iframe references, safe builder comments and literal shortcodes are retained. Code/pre blocks remain unchanged. Unsafe tags, event handlers and unsafe URL schemes are removed with warnings; the immutable source snapshot still contains the original HTML.

Text is sent in bounded structured batches, never as an uncontrolled HTML string. Numbers, text URLs, quotation markers, shortcode literals, Latin-script names and glossary entities are protected by segment-scoped tokens; their readable expansions are supplied as context. Missing/duplicated tokens fail validation. Reordered literals warn for factual association review. Reconstruction escapes provider text; a provider cannot inject HTML. Inline boundary whitespace is restored.

The preview renders the sanitized tree through React, with video/iframe references as inert links. It does not execute source scripts, embed players or shortcodes. This is a safe preview subset, not byte-identical publisher HTML or a full WordPress block renderer.

## 7. Validation

Checks cover complete/unique segment IDs, protected values, numeric/date components, currency/month/known-entity tokens, text URLs, quote markers, image/embed/nontext-attribute structure, blank title/body, accidental HTML/Markdown, suspicious length ratios, remaining Devanagari, missing attribution cues, provider warnings and low confidence. Normalized HTML is reparsed and compared structurally.

Errors yield `validation_failed`, never current acceptance. Warnings yield `needs_review`. Automated checks cannot prove meaning equivalence, discover all unknown entities, or establish that a plausible translation preserved every factual relationship. **Every generated news article is therefore a review draft**, even when structural checks pass. No confidence score authorizes publishing.

## 8. Status workflow

Source: `active`, `unpublished`, `deleted`; availability separately records `available`, `unconfirmed_missing`, `unavailable`.

Translation: `pending → processing → generated | validation_failed | failed`. Explicit retry creates another revision; it does not erase the failed attempt. Interrupted leases expire and are retained as failed attempts.

Editorial: generated records start `needs_review`. The model includes `auto_approved`, `manually_approved`, `manually_corrected`; automatic approval is not used. Explicit local approval requires a reviewer identity and note, a valid current source revision and passing validation. It changes `draft → ready`, not `published`. A manual correction UI/command is not implemented yet; the reserved correction status must not be mistaken for a completed correction workflow.

Publish: `draft`, `ready`, `published`, `withdrawn`. No publishing integration exists. Confirmed removal/unpublishing marks local records withdrawn. Anonymous WordPress 404 responses cannot distinguish deletion from unpublishing or hidden content, so they record `unconfirmed_missing` and block acceptance/approval. Definitive state transitions require authoritative evidence through the source observation abstraction; no source-side access was added.

## 9. Provider and free-tier boundary

`TranslationProvider` is independent of Gemini. The provider factory currently accepts only `gemini` and explicitly rejects unsupported alternatives; it never silently chooses OpenAI, Groq, Cloudflare or another provider.

Configuration (server-only, placeholders in `.env.example`):

```dotenv
TRANSLATION_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_FREE_TIER_CONFIRMED=false
LOCALIZATION_DATA_DIR=.data/localization
```

Put the real key privately in ignored `.env.local`, never in chat, `NEXT_PUBLIC_*`, source code or a browser form. Set the confirmation flag only after verifying that the Google project has billing disabled. This flag is operator attestation, not a billing-tier detection API. A key for a paid Google project could incur charges; application code cannot turn such a key into a free-tier-only account.

The model default was selected from Google's documented free-tier offering. Availability and limits remain project/region/time dependent. The REST request uses `x-goog-api-key`, a structured response schema, a 60-second per-request timeout and a bounded response size. Requests are sequential and bounded; no retries, grounding/search, provider fallback or paid model switch occurs. HTTP 429 stops the run and retains safe HTTP/status/quota metric, ID, value, dimensions and retry-delay diagnostics when supplied. Partial/MAX_TOKENS/blocked/malformed responses are rejected. No secrets or raw HTTP requests are logged.

Official references checked 18 September 2026:
- [Structured output REST format](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [Gemini pricing and free-tier availability](https://ai.google.dev/gemini-api/docs/pricing)
- [Project rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

## 10. Files

Created:
- `lib/localization/types.ts`, `revisions.ts`, `repository.ts`, `glossary.ts`, `html.ts`, `validation.ts`, `engine.ts`, `source.ts`, `provider.ts`.
- `lib/localization/providers/gemini.ts`, `providers/index.ts`.
- `app/translation-preview/layout.tsx`, `page.tsx`, `[id]/[locale]/page.tsx`, `rich-content.tsx`, `translation-preview.css`.
- `scripts/localize.mjs`, `test-localization.mjs`, `check-localization-preview.mjs`.
- `.gitignore`, this guide, and local ignored `.data/localization/store.json`.

Updated `.env.example`, `package.json` scripts and `README.md`. No new runtime library was needed. Approved edition/source routes, shared frontend components and SEO files are unchanged in this phase.

## 11–14. Real sample and generated outputs

Live public source snapshots saved: **13373** (Kashi–Vadnagar service bike journey), **13337** (PM birthday coverage), **12724** (Jaishankar/BRICS reporting). Each has an English and Roman Hindi pending record. This sample covers national/political/international reporting; business and entertainment generation remain untested.

Real Gemini English outputs: **0**. Real Gemini Roman Hindi outputs: **0**. Reason: missing `GEMINI_API_KEY`; the configured preflight stops before a network request. Free-tier account quota and output quality remain unverified.

Offline tests use explicitly labeled deterministic test-provider translations of a constructed Hindi fixture. They are not Gemini outputs and are never seeded as real articles into the local review store. Tests intentionally exercise corrupted dates/numbers, lost entity tokens/quotes/URLs, duplicate/missing segments, markup injection, unexplained Devanagari, expansion, low confidence, quota errors, timeouts and source races. Valid controlled outputs still require semantic review. No real provider warning history exists yet.

## 15. Preview and commands

Read-only, noindex routes:
- `/translation-preview`
- `/translation-preview/{postId}/en`
- `/translation-preview/{postId}/roman`
- `?revision={revisionId}` selects retained history.

The preview compares the exact Hindi source snapshot with a localized draft and displays source/generation revision, states, provider/model/prompt, changed fields, validation and prepared SEO fields. Missing generation is explicitly labeled. The existing `/source-preview/{postId}` remains available. Review routes are absent from the sitemap. Opening them never calls Gemini. They are development pages, not authenticated editorial infrastructure.

```bash
# Fetch and store up to three public source snapshots without Gemini.
npm run localize -- seed 13373 13337 12724

# After private free-tier configuration, generate each locale separately.
# Stops on quota, provider/source failure, or failed validation.
npm run localize -- sync 13373 13337 12724

# Only when intentionally retrying a failed revision after resolving its cause:
npm run localize -- sync 13373 --retry-failed

npm run localize -- list

# Local editorial approval only; no publication:
npm run localize -- approve POST_ID REVISION_ID REVIEWER "Bilingual review notes"
```

No public mutation endpoint or generation button was introduced. The local CLI limits runs to three explicitly selected source IDs and bounds text size and request batches. It does not crawl or bulk-translate the source site.

## 16–19. Validation results

- Production build: PASS.
- ESLint: PASS, no warnings/errors.
- TypeScript: PASS.
- Existing edition suite: **335 assertions PASS** across 20 pages.
- Existing WordPress adapter suite: **117 assertions PASS**.
- Existing live source-preview suite: **50 assertions PASS**; live sample IDs at final phase check were 13477, 13479, 13485, 13442, 13444, 13448.
- Localization/sync suite: **154 assertions PASS**, including controlled English/Roman output, HTML/tokens, persistence, revision reuse/regeneration, failed revision retention, source removal/races, local approval, concurrency and Gemini fake-transport behavior.
- Localization preview/client-bundle suite: **79 assertions PASS** for the three stored real posts and both locale previews, version links, invalid routes, noindex/sitemap isolation and absence of Gemini configuration/API endpoint code from browser bundles.
- Browser review: English and Roman Hindi pending previews checked at **1600, 1440, 1280, 768, 390, 320px** with zero horizontal overflow/broken loaded images. An initial missing EditionProvider was found and corrected; no new console/hydration errors were observed after repair. Real translated text wrapping cannot be signed off until live outputs exist.

## 20–21. Pending review and next phase

Remaining in this phase: configure a billing-disabled Gemini project/key, run the bounded real sample, inspect actual quota/error responses if any, generate both locales, review political neutrality/attribution/entities/numbers/quotes, and inspect translated layouts. Stop on insufficient quota; do not switch to a paid provider.

After that review, the next phase can add transactional production storage, a persistent queue, authoritative deletion/unpublication observations, reviewed correction tooling, and idempotent publish/update/withdraw actions through the existing localized content adapter. None of those publishing actions or production infrastructure are connected now.
