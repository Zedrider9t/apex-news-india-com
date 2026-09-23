import { getEditionContent } from "./mock-content";
import type { ApexArticle, Locale } from "./types";
export type { ApexArticle } from "./types";
// Mock-only adapter. A future CMS adapter must return this locale-aware contract.
export async function getLatestArticles(
  locale: Locale,
): Promise<ApexArticle[]> {
  return getEditionContent(locale).articles;
}
export async function getArticle(
  locale: Locale,
  slug: string,
): Promise<ApexArticle | undefined> {
  return getEditionContent(locale).articles.find(
    (article) => article.slug === slug,
  );
}
