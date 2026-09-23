import type {
  SourceStory,
  SourceImage,
  SourceTerm,
  SharedStoryIdentity,
} from "./types";
import {
  inspectHtml,
  plainText,
  safeUrl,
  sourceImageUrl,
  SOURCE_ORIGIN,
} from "./html";
export const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const id = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rendered = (v: unknown) => str(record(v).rendered);
function utc(value: unknown): string | null {
  const raw = str(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) return null;
  const time = new Date(`${raw}Z`);
  return Number.isNaN(time.getTime()) || time.toISOString().slice(0, 19) !== raw
    ? null
    : time.toISOString();
}
function image(value: unknown, expectedId: number | null): SourceImage | null {
  const raw = record(value);
  const url = sourceImageUrl(raw.source_url);
  if (!url || raw.media_type !== "image" || id(raw.id) !== expectedId)
    return null;
  const details = record(raw.media_details);
  return {
    id: id(raw.id),
    url,
    alt: plainText(str(raw.alt_text)),
    width: id(details.width),
    height: id(details.height),
    sizes: Object.entries(record(details.sizes)).flatMap(([name, value]) => {
      const size = record(value),
        url = sourceImageUrl(size.source_url),
        width = id(size.width),
        height = id(size.height);
      return url && width && height ? [{ name, url, width, height }] : [];
    }),
  };
}
function terms(
  ids: unknown,
  embedded: unknown[],
  taxonomy: string,
): SourceTerm[] {
  return [
    ...new Set(
      array(ids)
        .map(id)
        .filter((v): v is number => v !== null),
    ),
  ].map((termId) => {
    const raw = embedded
      .map(record)
      .find((term) => term.id === termId && term.taxonomy === taxonomy);
    return {
      id: termId,
      name: raw ? plainText(str(raw.name)) || null : null,
      slug: raw ? str(raw.slug) || null : null,
      taxonomy,
      sourceUrl: raw ? safeUrl(raw.link) : null,
    };
  });
}
export function normalizePost(input: unknown): SourceStory {
  const raw = record(input),
    postId = id(raw.id),
    title = plainText(rendered(raw.title));
  const sourceUrl = safeUrl(raw.link),
    publishedAt = utc(raw.date_gmt),
    modifiedAt = utc(raw.modified_gmt);
  if (
    !postId ||
    !title ||
    !sourceUrl ||
    new URL(sourceUrl).origin !== SOURCE_ORIGIN ||
    !str(raw.slug) ||
    !publishedAt ||
    !modifiedAt ||
    raw.status !== "publish" ||
    raw.type !== "post" ||
    typeof record(raw.content).rendered !== "string" ||
    record(raw.content).protected === true
  )
    throw new Error("Malformed or non-public WordPress post");
  const rawContentHtml = rendered(raw.content),
    rawExcerpt = rendered(raw.excerpt);
  if (
    rawContentHtml.length > 1_000_000 ||
    rawExcerpt.length > 100_000 ||
    title.length > 2000
  )
    throw new Error("WordPress field exceeds safety limit");
  const content = inspectHtml(rawContentHtml),
    embedded = record(raw._embedded);
  const authorId = id(raw.author),
    author = array(embedded.author)
      .map(record)
      .find((a) => id(a.id) === authorId && typeof a.name === "string");
  const featuredMediaId = id(raw.featured_media),
    featuredImage =
      array(embedded["wp:featuredmedia"])
        .map((v) => image(v, featuredMediaId))
        .find(Boolean) || null;
  const embeddedTerms = array(embedded["wp:term"]).flatMap(array);
  const categories = terms(raw.categories, embeddedTerms, "category"),
    tags = terms(raw.tags, embeddedTerms, "post_tag");
  const warnings: string[] = [];
  if (!author) warnings.push("author-unavailable");
  if (!featuredImage) warnings.push("featured-image-unavailable");
  if (!categories.length || categories.some((c) => !c.name))
    warnings.push("category-unavailable");
  if (!content.paragraphs.length) warnings.push("content-empty");
  const core = new Set([
    "id",
    "date",
    "date_gmt",
    "guid",
    "modified",
    "modified_gmt",
    "slug",
    "status",
    "type",
    "link",
    "title",
    "content",
    "excerpt",
    "author",
    "featured_media",
    "comment_status",
    "ping_status",
    "sticky",
    "template",
    "format",
    "meta",
    "categories",
    "tags",
    "class_list",
    "_links",
    "_embedded",
  ]);
  const seo = Object.fromEntries(
    Object.entries(raw).filter(([key]) =>
      /^(aioseo_|yoast_|rank_math)/.test(key),
    ),
  );
  const customFields = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !core.has(key) && !(key in seo)),
  );
  return {
    sharedStoryId: `wp:apexnewsindia.in:${postId}`,
    sourcePostId: postId,
    sourceUrl,
    sourceSlug: str(raw.slug),
    sourceStatus: "publish",
    sourceLanguage: "hi",
    languageBasis: "publisher-config",
    titleHindi: title,
    rawContentHtml,
    rawExcerpt,
    contentText: content.paragraphs,
    excerptText: plainText(rawExcerpt),
    publishedAt,
    modifiedAt,
    author: {
      sourceId: authorId,
      name: author ? plainText(str(author.name)) : null,
      sourceUrl: author ? safeUrl(author.link) : null,
      available: !!author,
    },
    categories,
    tags,
    featuredImage,
    featuredMediaId,
    articleImages: content.images,
    embeds: content.embeds,
    galleries: content.galleries,
    embeddedMediaReferences: embedded,
    seo,
    customFields,
    originalMetadata: {
      dateLocal: str(raw.date),
      modifiedLocal: str(raw.modified),
      format: str(raw.format) || null,
      meta: raw.meta ?? null,
      links: raw._links ?? null,
    },
    warnings,
  };
}
export function sourceIdentity(
  story: SourceStory,
  fetchedAt: string,
): SharedStoryIdentity {
  return {
    sharedStoryId: story.sharedStoryId,
    sourcePostId: story.sourcePostId,
    sourceRevision: story.modifiedAt,
    modifiedAt: story.modifiedAt,
    lastSyncedAt: fetchedAt,
    syncStatus: "source-fetched",
    englishVersion: null,
    romanHindiVersion: null,
  };
}
