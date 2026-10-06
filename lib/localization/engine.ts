import { randomUUID } from "node:crypto";
import { plainText } from "../wordpress/html";
import { makeSourceRevision } from "./revisions";
import { makePlan, protectSegments, restoreSegments, renderHtml } from "./html";
import { validateTranslation, VALIDATOR_VERSION } from "./validation";
import { PROMPT_VERSION, TranslationProviderError } from "./provider";
import type {
  LocalizationRepository,
  SourceObservation,
  StoryRecord,
  LocalizedArticle,
  TranslationLocale,
  TranslationProvider,
  ValidationIssue,
  TranslationResponse,
} from "./types";
const now = () => new Date().toISOString();
export function latestSource(record: StoryRecord) {
  return record.sources.find((s) => s.hash === record.currentSourceHash)!;
}
export async function observeSource(
  repo: LocalizationRepository,
  id: number,
  observation: SourceObservation,
) {
  return repo.transact((db) => {
    const key = String(id);
    let record = db.stories[key];
    const stamp = now();
    if (observation.kind === "active") {
      if (observation.story.sourcePostId !== id)
        throw new Error("Source identity mismatch");
      const revision = makeSourceRevision(
        observation.story,
        record ? latestSource(record) : undefined,
      );
      if (!record) {
        record = {
          sharedStoryId: observation.story.sharedStoryId,
          sourcePostId: id,
          state: "active",
          availability: "available",
          currentSourceHash: revision.hash,
          sources: [],
          revisions: [],
          current: {},
          lastSyncedAt: stamp,
          jobs: {},
          events: [],
        };
        db.stories[key] = record;
      }
      if (record.sharedStoryId !== observation.story.sharedStoryId)
        throw new Error("Shared identity mismatch");
      if (!record.sources.some((s) => s.hash === revision.hash))
        record.sources.push(revision);
      if (
        record.currentSourceHash !== revision.hash ||
        record.state !== "active"
      ) {
        for (const r of record.revisions) {
          if (
            r.translationStatus === "generated" &&
            r.sourceRevisionHash !== revision.hash
          ) {
            r.correctionStatus = "source_changed";
            r.publishStatus = "draft";
          }
        }
      }
      record.currentSourceHash = revision.hash;
      record.state = "active";
      record.availability = "available";
      record.lastSyncedAt = stamp;
      if (!record.revisions.length)
        for (const locale of ["en", "roman"] as const)
          record.revisions.push(
            blankRevision(record, locale, {
              name: "gemini",
              model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
            }),
          );
      return revision.changeKind;
    }
    if (!record) return observation.kind;
    record.lastSyncedAt = stamp;
    if (observation.kind === "deleted" || observation.kind === "unpublished") {
      if (!observation.evidence.trim())
        throw new Error("Confirmed source state requires evidence");
      record.state = observation.kind;
      record.availability = "available";
      record.events.push({
        revisionId: record.currentSourceHash,
        action: `source_${observation.kind}`,
        actor: "source-observer",
        note: observation.evidence,
        at: stamp,
      });
      for (const r of record.revisions) {
        r.publishStatus = "withdrawn";
        r.sourceDeleted = observation.kind === "deleted";
        r.sourceUnpublished = observation.kind === "unpublished";
      }
    } else {
      record.availability = observation.kind;
      for (const r of record.revisions)
        if (r.publishStatus === "ready") {
          r.publishStatus = "draft";
          r.editorialStatus = "needs_review";
        }
    }
    return observation.kind;
  });
}
function blankRevision(
  record: StoryRecord,
  locale: TranslationLocale,
  provider: Pick<TranslationProvider, "name" | "model">,
): LocalizedArticle {
  const source = latestSource(record);
  return {
    revisionId: randomUUID(),
    sharedStoryId: record.sharedStoryId,
    sourcePostId: record.sourcePostId,
    sourceUrl: source.story.sourceUrl,
    sourceModifiedAt: source.story.modifiedAt,
    sourceRevisionHash: source.hash,
    locale,
    localizedSlug: "",
    localizedTitle: "",
    localizedExcerpt: "",
    localizedContent: "",
    localizedCategoryLabels: [],
    localizedTagLabels: [],
    seo: { pageTitle: "", metaDescription: "", ogTitle: "", ogDescription: "" },
    translationVersion:
      record.revisions.filter((r) => r.locale === locale).length + 1,
    translationMetadata: {
      provider: provider.name,
      model: provider.model,
      promptVersion: PROMPT_VERSION,
    },
    generatedAt: null,
    lastSyncedAt: now(),
    translationStatus: "pending",
    editorialStatus: "needs_review",
    correctionStatus: record.current[locale] ? "source_changed" : "none",
    publishStatus: "draft",
    sourceDeleted: false,
    sourceUnpublished: false,
    warnings: [],
    validation: {
      passed: false,
      issues: [],
      checkedAt: now(),
      validatorVersion: VALIDATOR_VERSION,
    },
    changedFields: source.changedFields,
  };
}
export interface SyncOptions {
  verifySource: () => Promise<SourceObservation>;
  retryFailed?: boolean;
}
export async function localizeStory(
  repo: LocalizationRepository,
  id: number,
  locale: TranslationLocale,
  provider: TranslationProvider,
  options: SyncOptions,
) {
  const reserved = await repo.transact((db) => {
    const record = db.stories[String(id)];
    if (!record) throw new Error("Source must be observed before localization");
    if (record.state !== "active" || record.availability !== "available")
      return { kind: "source_unavailable" as const };
    const source = latestSource(record);
    const current = record.revisions.find(
      (r) => r.revisionId === record.current[locale],
    );
    const currentProviderCompatible = !!(
      current &&
      current.translationMetadata.promptVersion === PROMPT_VERSION &&
      current.translationMetadata.provider === provider.name &&
      current.translationMetadata.model === provider.model
    );
    if (
      current?.sourceRevisionHash === source.hash &&
      current.translationStatus === "generated" &&
      currentProviderCompatible &&
      !current.sourceDeleted &&
      !current.sourceUnpublished &&
      current.publishStatus !== "withdrawn"
    )
      return { kind: "unchanged" as const, revision: current };
    const job = record.jobs[locale];
    if (job && Date.parse(job.expiresAt) > Date.now())
      return { kind: "processing" as const };
    if (job) {
      const abandoned = record.revisions.find(
        (r) => r.revisionId === job.revisionId,
      );
      if (abandoned) {
        abandoned.translationStatus = "failed";
        abandoned.failure = {
          code: "expired_job",
          message: "Processing lease expired; interrupted attempt retained.",
        };
      }
      delete record.jobs[locale];
    }
    const attempted = record.revisions
      .filter(
        (r) => r.locale === locale && r.sourceRevisionHash === source.hash,
      )
      .at(-1);
    if (
      !options.retryFailed &&
      attempted &&
      ["failed", "validation_failed"].includes(attempted.translationStatus)
    )
      return { kind: "retry_required" as const, revision: attempted };
    const fresh = blankRevision(record, locale, provider);
    const draft =
      attempted?.translationStatus === "pending"
        ? {
            ...fresh,
            revisionId: attempted.revisionId,
            translationVersion: attempted.translationVersion,
          }
        : fresh;
    const priorSource =
      current &&
      record.sources.find((s) => s.hash === current.sourceRevisionHash);
    const reuse = !!(
      current &&
      current.validation.passed &&
      currentProviderCompatible &&
      priorSource?.textHash === source.textHash
    );
    draft.translationStatus = "processing";
    if (attempted?.translationStatus === "pending")
      record.revisions[record.revisions.indexOf(attempted)] = draft;
    else record.revisions.push(draft);
    record.events.push({
      revisionId: draft.revisionId,
      action: "pending_to_processing",
      actor: "localization-engine",
      note: "Reserved generation; no publishing",
      at: now(),
    });
    const token = randomUUID();
    record.jobs[locale] = {
      token,
      sourceHash: source.hash,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      revisionId: draft.revisionId,
    };
    return { kind: "reserved" as const, token, draft, source, reuse, current };
  });
  if (reserved.kind !== "reserved") return reserved;
  let result: LocalizedArticle = { ...reserved.draft };
  let stopError: TranslationProviderError | undefined;
  try {
    if (reserved.reuse && reserved.current) {
      result = {
        ...structuredClone(reserved.current),
        ...reserved.draft,
        localizedSlug: reserved.current.localizedSlug,
        localizedTitle: reserved.current.localizedTitle,
        localizedExcerpt: reserved.current.localizedExcerpt,
        localizedContent: reserved.current.localizedContent,
        localizedCategoryLabels: reserved.current.localizedCategoryLabels,
        localizedTagLabels: reserved.current.localizedTagLabels,
        seo: reserved.current.seo,
        translationMetadata: reserved.current.translationMetadata,
        validation: structuredClone(reserved.current.validation),
        warnings: [
          ...reserved.current.warnings,
          "Metadata-only revision; localized text reused without provider call",
        ],
        basedOnRevisionId: reserved.current.revisionId,
      };
      result.validation.checkedAt = now();
    } else {
      const source = structuredClone(reserved.source.story);
      const plan = makePlan(source);
      const protectedPlan = protectSegments(plan.segments, locale);
      const rows: TranslationResponse["segments"] = [];
      let confidence = 1;
      const warnings: string[] = [];
      const issues: ValidationIssue[] = [];
      const batches: Array<typeof protectedPlan.segments> = [];
      let batch: typeof protectedPlan.segments = [];
      let size = 0;
      for (const s of protectedPlan.segments) {
        if (s.text.length > 20000)
          throw new Error(
            "A single text segment exceeds the development request limit",
          );
        if (
          batch.length &&
          (size + s.text.length > 16000 || batch.length >= 60)
        ) {
          batches.push(batch);
          batch = [];
          size = 0;
        }
        batch.push(s);
        size += s.text.length;
      }
      if (batch.length) batches.push(batch);
      if (batches.length > 12)
        throw new Error("Article exceeds bounded Gemini request limit");
      const usages: Record<string, number> = {};
      const responseIds: string[] = [];
      for (const segments of batches) {
        const out = await provider.translate({
          locale,
          segments,
          promptVersion: PROMPT_VERSION,
        });
        if (
          !Array.isArray(out.segments) ||
          out.segments.some(
            (s) => typeof s?.id !== "string" || typeof s?.text !== "string",
          ) ||
          !Number.isFinite(out.confidence) ||
          out.confidence < 0 ||
          out.confidence > 1 ||
          !Array.isArray(out.warnings) ||
          out.warnings.some((w) => typeof w !== "string")
        )
          throw new TranslationProviderError(
            "malformed",
            "Provider returned an invalid response",
          );
        const expected = new Set(segments.map((s) => s.id));
        if (
          out.segments.length !== segments.length ||
          out.segments.some((s) => !expected.has(s.id)) ||
          new Set(out.segments.map((s) => s.id)).size !== segments.length
        )
          issues.push({
            code: "batch_segments",
            severity: "error",
            message:
              "Provider omitted, duplicated or moved segments between batches",
          });
        rows.push(...out.segments);
        confidence = Math.min(confidence, out.confidence);
        warnings.push(...out.warnings);
        result.translationMetadata = out.metadata;
        for (const [key, value] of Object.entries(out.metadata.usage ?? {}))
          usages[key] = (usages[key] ?? 0) + value;
        if (out.metadata.responseId) responseIds.push(out.metadata.responseId);
      }
      result.translationMetadata = {
        ...result.translationMetadata,
        usage: usages,
        responseId: responseIds.join(","),
      };
      const restored = restoreSegments(protectedPlan, rows);
      // Preserve inline spacing regardless of model formatting preferences.
      for (const s of plan.segments)
        if (restored.translations[s.id] !== undefined)
          restored.translations[s.id] =
            (s.text.match(/^\s*/)?.[0] ?? "") +
            restored.translations[s.id].trim() +
            (s.text.match(/\s*$/)?.[0] ?? "");
      result.validation = validateTranslation(
        plan,
        restored.translations,
        locale,
        [...issues, ...restored.issues],
        confidence,
        warnings,
      );
      result.localizedTitle = restored.translations.title ?? "";
      result.localizedExcerpt = plainText(
        renderHtml(plan.excerpt.nodes, restored.translations),
      );
      result.localizedContent = renderHtml(
        plan.body.nodes,
        restored.translations,
      );
      result.localizedCategoryLabels = source.categories.map((t) => ({
        id: t.id,
        label:
          restored.translations[`category.${t.id}`] ??
          t.name ??
          `Category ${t.id}`,
      }));
      result.localizedTagLabels = source.tags.map((t) => ({
        id: t.id,
        label: restored.translations[`tag.${t.id}`] ?? t.name ?? `Tag ${t.id}`,
      }));
      const slug = result.localizedTitle
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90)
        .replace(/-$/, "");
      result.localizedSlug = `${slug || "story"}-${id}`;
      result.seo = {
        pageTitle: result.localizedTitle,
        metaDescription: result.localizedExcerpt,
        ogTitle: result.localizedTitle,
        ogDescription: result.localizedExcerpt,
      };
      result.warnings = result.validation.issues
        .filter((i) => i.severity === "warning")
        .map((i) => `${i.code}: ${i.message}`);
    }
    result.generatedAt = now();
    result.translationStatus = result.validation.passed
      ? "generated"
      : "validation_failed";
    // All generated news starts in review. No heuristic is an editorial approval.
    result.editorialStatus = "needs_review";
    result.publishStatus = "draft";
    const observation = await options.verifySource();
    await observeSource(repo, id, observation);
    if (observation.kind !== "active")
      throw new TranslationProviderError(
        "unavailable",
        "Source is no longer confirmed active; generated draft was not accepted.",
      );
    if (makeSourceRevision(observation.story).hash !== reserved.source.hash)
      throw new TranslationProviderError(
        "unavailable",
        "Source changed during processing; generated draft was not accepted.",
      );
  } catch (error) {
    result.translationStatus = "failed";
    result.publishStatus = "draft";
    result.editorialStatus = "needs_review";
    result.failure = {
      code:
        error instanceof TranslationProviderError ? error.code : "generation",
      message:
        error instanceof TranslationProviderError
          ? error.message
          : "Localization could not complete safely; no previous valid revision was replaced.",
    };
    result.validation.passed = false;
    if (error instanceof TranslationProviderError) stopError = error;
  }
  const committed = await repo.transact((db) => {
    const record = db.stories[String(id)];
    const job = record?.jobs[locale];
    if (!record || job?.token !== reserved.token)
      return { kind: "superseded" as const };
    const at = record.revisions.findIndex(
      (r) => r.revisionId === reserved.draft.revisionId,
    );
    const active =
      record.state === "active" &&
      record.availability === "available" &&
      record.currentSourceHash === reserved.source.hash &&
      Date.parse(job.expiresAt) > Date.now();
    if (!active) {
      result.translationStatus = "failed";
      result.validation.passed = false;
      result.failure = {
        code: "source_changed",
        message:
          "Source state, revision or processing lease changed before commit",
      };
    }
    result.sourceDeleted = record.state === "deleted";
    result.sourceUnpublished = record.state === "unpublished";
    if (record.state !== "active") result.publishStatus = "withdrawn";
    result.lastSyncedAt = now();
    record.revisions[at] = result;
    delete record.jobs[locale];
    if (
      active &&
      result.translationStatus === "generated" &&
      result.validation.passed
    )
      record.current[locale] = result.revisionId;
    record.events.push({
      revisionId: result.revisionId,
      action: `processing_to_${result.translationStatus}`,
      actor: "localization-engine",
      note: result.failure?.message ?? "Draft retained for bilingual review",
      at: now(),
    });
    return { kind: result.translationStatus, revision: result };
  });
  if (stopError) throw stopError;
  return committed;
}
/** Local editorial gate only. This does not publish to the site or to WordPress. */
export async function approveRevision(
  repo: LocalizationRepository,
  id: number,
  revisionId: string,
  actor: string,
  note: string,
) {
  if (!actor.trim() || !note.trim())
    throw new Error("Reviewer identity and review note are required");
  return repo.transact((db) => {
    const record = db.stories[String(id)];
    const revision = record?.revisions.find((r) => r.revisionId === revisionId);
    if (
      !record ||
      !revision ||
      record.state !== "active" ||
      record.availability !== "available" ||
      revision.sourceRevisionHash !== record.currentSourceHash ||
      revision.translationStatus !== "generated" ||
      !revision.validation.passed ||
      record.current[revision.locale] !== revisionId
    )
      throw new Error(
        "Only the current validated active source revision can be approved",
      );
    revision.editorialStatus = "manually_approved";
    revision.publishStatus = "ready";
    record.events.push({
      revisionId,
      action: "manually_approved",
      actor,
      note,
      at: now(),
    });
    return revision;
  });
}
