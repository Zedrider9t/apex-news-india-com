import type { MetadataRoute } from "next";
import { locales } from "@/lib/locales";
import { getEditionContent } from "@/lib/mock-content";
import { siteOrigin } from "@/lib/seo";
const absolute = (path: string) => new URL(path, siteOrigin).href;
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => [
    {
      url: absolute(`/${locale}`),
      alternates: {
        languages: {
          en: absolute("/en"),
          "hi-Latn": absolute("/roman"),
          "x-default": absolute("/en"),
        },
      },
    },
    ...getEditionContent(locale).articles.map((article) => ({
      url: absolute(article.alternatePaths[locale]),
      lastModified: article.publishedAt,
      alternates: {
        languages: {
          en: absolute(article.alternatePaths.en),
          "hi-Latn": absolute(article.alternatePaths.roman),
          "x-default": absolute(article.alternatePaths.en),
        },
      },
    })),
  ]);
}
