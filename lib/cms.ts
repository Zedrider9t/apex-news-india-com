import { getEditionContent } from "./mock-content";
import type { ApexArticle, Category, Locale } from "./types";
import { articlePath } from "./locales";
import { JsonLocalizationRepository } from "./localization/repository";
import type {
  LocalizedArticle,
  StoryRecord,
  TranslationLocale,
} from "./localization/types";
import { inspectHtml } from "./wordpress/html";

export type { ApexArticle } from "./types";

const categoryMap: Record<string, Category> = {
  india: "India",
  bharat: "India",
  देश: "India",
  भारत: "India",
  politics: "Politics",
  राजनीति: "Politics",
  world: "World",
  दुनिया: "World",
  business: "Business",
  कारोबार: "Business",
  व्यापार: "Business",
  sports: "Sports",
  खेल: "Sports",
  entertainment: "Entertainment",
  मनोरंजन: "Entertainment",
  technology: "Technology",
  टेक्नोलॉजी: "Technology",
  northeast: "North East",
  "north east": "North East",
};

function resolveCategory(record: StoryRecord, revision: LocalizedArticle): Category {
  const source = record.sources.find(
    (item) => item.hash === revision.sourceRevisionHash,
  );
  const candidates = [
    ...revision.localizedCategoryLabels.map((item) => item.label),
    ...(source?.story.categories.flatMap((item) => [
      item.name ?? "",
      item.slug ?? "",
    ]) ?? []),
  ];
  for (const candidate of candidates) {
    const key = candidate.trim().toLowerCase();
    if (categoryMap[key]) return categoryMap[key];
  }
  return "India";
}

function readyRevision(
  record: StoryRecord,
  locale: TranslationLocale,
): LocalizedArticle | undefined {
  const id = record.current[locale];
  if (!id) return undefined;
  const revision = record.revisions.find((item) => item.revisionId === id);
  if (
    !revision ||
    revision.translationStatus !== "generated" ||
    !revision.validation.passed ||
    revision.editorialStatus !== "manually_approved" ||
    revision.publishStatus !== "ready" ||
    revision.sourceDeleted ||
    revision.sourceUnpublished ||
    revision.sourceRevisionHash !== record.currentSourceHash
  )
    return undefined;
  return revision;
}

function toArticle(
  record: StoryRecord,
  locale: Locale,
  revision: LocalizedArticle,
): ApexArticle | undefined {
  const source = record.sources.find(
    (item) => item.hash === revision.sourceRevisionHash,
  )?.story;
  if (!source) return undefined;

  const counterpartLocale: Locale = locale === "en" ? "roman" : "en";
  const counterpart = readyRevision(record, counterpartLocale);
  const currentPath = articlePath(locale, revision.localizedSlug);
  const counterpartPath = counterpart
    ? articlePath(counterpartLocale, counterpart.localizedSlug)
    : `/${counterpartLocale}`;

  const content = inspectHtml(revision.localizedContent).paragraphs;
  const featuredImage =
    source.featuredImage?.url || "/images/source-unavailable.svg";
  const imageAlt =
    source.featuredImage?.alt ||
    revision.localizedTitle ||
    "Apex News India story image";

  return {
    locale,
    alternatePaths:
      locale === "en"
        ? { en: currentPath, roman: counterpartPath }
        : { en: counterpartPath, roman: currentPath },
    id: source.sourcePostId,
    slug: revision.localizedSlug,
    title: revision.localizedTitle,
    excerpt: revision.localizedExcerpt,
    content,
    featuredImage,
    imageAlt,
    category: resolveCategory(record, revision),
    tags: revision.localizedTagLabels.map((item) => item.label),
    publishedAt: source.publishedAt,
    readMinutes: Math.max(
      1,
      Math.ceil(
        content.join(" ").trim().split(/\s+/).filter(Boolean).length / 220,
      ),
    ),
    author: source.author.name || "Apex News India",
    sourcePostId: source.sourcePostId,
    sourceUrl: source.sourceUrl,
    contentOrigin: "localized",
  };
}

async function getReadyLocalizedArticles(locale: Locale): Promise<ApexArticle[]> {
  const repo = new JsonLocalizationRepository();
  const records = await repo.list();
  return records
    .filter(
      (record) =>
        record.state === "active" && record.availability === "available",
    )
    .flatMap((record) => {
      const revision = readyRevision(record, locale);
      if (!revision) return [];
      const article = toArticle(record, locale, revision);
      return article ? [article] : [];
    })
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
}

// The public homepage remains on the frozen demo dataset until production
// persistence and rollout are complete. Article lookup, however, can serve
// manually-approved localized pilot stories from the local repository.
export async function getLatestArticles(
  locale: Locale,
): Promise<ApexArticle[]> {
  const localized = await getReadyLocalizedArticles(locale);
  const mock = getEditionContent(locale).articles;
  const localizedIds = new Set(localized.map((article) => article.id));
  return [
    ...localized,
    ...mock.filter((article) => !localizedIds.has(article.id)),
  ];
}

export async function getArticle(
  locale: Locale,
  slug: string,
): Promise<ApexArticle | undefined> {
  const localized = await getReadyLocalizedArticles(locale);
  const ready = localized.find(
    (article) =>
      article.slug === slug || String(article.sourcePostId) === slug,
  );
  if (ready) return ready;
  return getEditionContent(locale).articles.find(
    (article) => article.slug === slug,
  );
}
