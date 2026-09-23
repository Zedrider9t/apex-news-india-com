import type { ApexArticle, Category } from "../types";
import type { SourceStory, SourceResult } from "./types";
import { fetchSourceStories } from "./client";
import { getEditionContent } from "../mock-content";
const categoryMap: Record<string, Category> = {
  country: "India",
  "uttar-pradesh": "India",
  uttarakhand: "India",
  bihar: "India",
  "madhya-pradesh": "India",
  sports: "Sports",
  technology: "Technology",
  business: "Business",
  entertainment: "Entertainment",
  politics: "Politics",
  "world-news": "World",
  "north-east": "North East",
  assam: "North East",
  manipur: "North East",
};
/** Ephemeral component input only, never a localized content record or translation.
 * `locale: en` selects the existing UI chrome; both links stay inside the isolated preview. */
export function previewArticle(story: SourceStory, index = 0): ApexArticle {
  const path = `/source-preview/${story.sourcePostId}`;
  return {
    id: story.sourcePostId,
    sourcePostId: story.sourcePostId,
    locale: "en",
    alternatePaths: { en: path, roman: path },
    slug: story.sourceSlug,
    title: story.titleHindi,
    excerpt: story.excerptText || story.contentText[0] || "",
    content: story.contentText,
    featuredImage:
      story.featuredImage?.sizes.find((size) => size.name === "large")?.url ||
      story.featuredImage?.url ||
      "/images/source-unavailable.svg",
    imageAlt: story.featuredImage?.alt || story.titleHindi,
    category:
      story.categories.map((c) => categoryMap[c.slug ?? ""]).find(Boolean) ||
      "India",
    tags: story.tags.flatMap((t) => (t.name ? [t.name] : [])),
    publishedAt: story.publishedAt,
    readMinutes: Math.max(
      1,
      Math.ceil(story.contentText.join(" ").split(/\s+/).length / 200),
    ),
    author: story.author.name || "Author unavailable from public API",
    editorial: {
      heroRank: index < 3 ? index + 1 : undefined,
      latestRank: index + 1,
    },
  };
}
export async function getSourcePreview(postId?: number) {
  const result: SourceResult =
    process.env.USE_WORDPRESS_CONTENT === "true"
      ? await fetchSourceStories({ postId })
      : {
          ok: false,
          reason: "disabled",
          message: "WordPress content mode is disabled",
        };
  return {
    result,
    articles: result.ok
      ? result.stories.map(previewArticle)
      : getEditionContent("en").articles.slice(0, 6),
  };
}
