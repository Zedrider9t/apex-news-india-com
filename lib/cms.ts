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
import {
  planHtml,
  renderHtml,
  type HtmlNode,
} from "./localization/html";

export type { ApexArticle } from "./types";

const categoryMap: Record<string, Category> = {
  india: "India",
  bharat: "India",
  देश: "India",
  भारत: "India",
  "uttar pradesh": "Uttar Pradesh",
  "उत्तर प्रदेश": "Uttar Pradesh",
  "uttar-pradesh": "Uttar Pradesh",
  bihar: "Bihar",
  बिहार: "Bihar",
  "madhya pradesh": "Madhya Pradesh",
  "मध्य प्रदेश": "Madhya Pradesh",
  "madhya-pradesh": "Madhya Pradesh",
  uttarakhand: "Uttarakhand",
  उत्तराखंड: "Uttarakhand",
  politics: "Politics",
  राजनीति: "Politics",
  world: "World",
  दुनिया: "World",
  विश्व: "World",
  business: "Business",
  कारोबार: "Business",
  व्यापार: "Business",
  बिज़नेस: "Business",
  बिजनेस: "Business",
  sports: "Sports",
  sport: "Sports",
  खेल: "Sports",
  entertainment: "Entertainment",
  मनोरंजन: "Entertainment",
  technology: "Technology",
  tech: "Technology",
  तकनीक: "Technology",
  टेक्नोलॉजी: "Technology",
  health: "Health",
  स्वास्थ्य: "Health",
  travel: "Travel",
  ट्रैवेल: "Travel",
  यात्रा: "Travel",
  lifestyle: "Lifestyle",
  लाइफस्टाइल: "Lifestyle",
  science: "Science",
  विज्ञान: "Science",
  northeast: "North East",
  "north east": "North East",
  "north-east": "North East",
  "नार्थ ईस्ट": "North East",
  "नॉर्थ ईस्ट": "North East",
  opinion: "Opinion",
  editorial: "Opinion",
  "संपादक की कलम से": "Opinion",
};

const breakingTerms = new Set([
  "breaking",
  "breaking news",
  "breaking-news",
  "ब्रेकिंग",
  "ब्रेकिंग न्यूज़",
  "ब्रेकिंग न्यूज",
]);

function normalizedText(value: string): string {
  return value
    .replace(/\[(?:\.\.\.|…)?\]\s*$/u, "")
    .replace(/(?:\.\.\.|…)+\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function nodeText(node: HtmlNode): string {
  if (node.type === "text") return node.text;
  if (node.type === "comment") return "";
  return node.children.map(nodeText).join(" ");
}

function suppressDuplicateLead(html: string, excerpt: string): string {
  const plan = planHtml(html, "render");
  const excerptText = normalizedText(excerpt);
  if (excerptText.length < 60) return renderHtml(plan.nodes);

  const index = plan.nodes.findIndex((node) => {
    if (node.type !== "element" || !["p", "div"].includes(node.tag))
      return false;
    const bodyText = normalizedText(nodeText(node));
    if (bodyText.length < 60) return false;
    return (
      bodyText === excerptText ||
      bodyText.startsWith(excerptText) ||
      excerptText.startsWith(bodyText)
    );
  });

  return renderHtml(
    index >= 0
      ? plan.nodes.filter((_, nodeIndex) => nodeIndex !== index)
      : plan.nodes,
  );
}

function sourceCategoryValues(
  record: StoryRecord,
  revision: LocalizedArticle,
): string[] {
  const source = record.sources.find(
    (item) => item.hash === revision.sourceRevisionHash,
  );
  return [
    ...(source?.story.categories.flatMap((item) => [
      item.name ?? "",
      item.slug ?? "",
    ]) ?? []),
    ...revision.localizedCategoryLabels.map((item) => item.label),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveCategory(record: StoryRecord, revision: LocalizedArticle): Category {
  for (const candidate of sourceCategoryValues(record, revision)) {
    const key = candidate.toLowerCase();
    if (breakingTerms.has(key)) continue;
    if (categoryMap[key]) return categoryMap[key];
  }
  return "India";
}

function resolveNewsTypes(
  record: StoryRecord,
  revision: LocalizedArticle,
): import("./types").NewsType[] {
  const values = sourceCategoryValues(record, revision).map((value) =>
    value.toLowerCase(),
  );
  const types = new Set<import("./types").NewsType>(["standard"]);
  if (values.some((value) => breakingTerms.has(value))) types.add("breaking");
  if (values.some((value) => categoryMap[value] === "Opinion")) types.add("opinion");
  return [...types];
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
    !["manually_approved", "auto_approved"].includes(revision.editorialStatus) ||
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

  const contentHtml = suppressDuplicateLead(
    revision.localizedContent,
    revision.localizedExcerpt,
  );
  const content = inspectHtml(contentHtml).paragraphs;
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
    contentHtml,
    featuredImage,
    imageAlt,
    category: resolveCategory(record, revision),
    sourceCategories: source.categories
      .map((item) => item.name ?? item.slug ?? "")
      .filter(Boolean),
    newsTypes: resolveNewsTypes(record, revision),
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
    editorial: { latestRank: 0 },
  };
}

export async function getReadyLocalizedArticles(locale: Locale): Promise<ApexArticle[]> {
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

// Public article surfaces serve localized revisions only after the editorial
// gate marks them ready, either by manual approval or the conservative
// low-risk auto-review path.
export async function getReadyLocalizedArticle(
  locale: Locale,
  idOrSlug: string,
): Promise<ApexArticle | undefined> {
  const key = idOrSlug.replace(/^apex-/, "");
  const localized = await getReadyLocalizedArticles(locale);
  return localized.find(
    (article) => article.slug === key || String(article.sourcePostId ?? article.id) === key,
  );
}

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

export async function getHomepageArticles(
  locale: Locale,
): Promise<ApexArticle[]> {
  const localized = await getReadyLocalizedArticles(locale);

  // Live homepage placement is derived from source taxonomy and recency.
  // WordPress news type (for example Breaking) is retained separately from
  // visual roles such as Hero, Latest and Trending.
  if (localized.length >= 3) {
    const breaking = localized.filter((article) =>
      article.newsTypes?.includes("breaking"),
    );
    const heroIds = new Set(
      [...breaking, ...localized]
        .filter(
          (article, index, list) =>
            list.findIndex((candidate) => candidate.id === article.id) === index,
        )
        .slice(0, 3)
        .map((article) => article.id),
    );

    return localized.map((article, index) => ({
      ...article,
      editorial: {
        ...article.editorial,
        heroRank: heroIds.has(article.id)
          ? [...heroIds].indexOf(article.id) + 1
          : undefined,
        latestRank: index + 1,
        trendingRank: index < 8 ? index + 1 : undefined,
        special: article.newsTypes?.includes("opinion") || index === 0,
      },
    }));
  }

  return getLatestArticles(locale);
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
