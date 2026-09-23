import type { Metadata } from "next";
import type { ApexArticle, Locale, Localized } from "./types";
import { localeConfig } from "./locales";
import { informationAlternates, informationContent, informationPath, type InformationSlug } from "./information-content";
// Set the final public origin before a future deployment. Never infer canonicals from Host.
export const siteOrigin = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://apexnewsindia.com",
);
function alternates(paths: Localized<string>) {
  return { en: paths.en, "hi-Latn": paths.roman, "x-default": paths.en };
}
export function informationMetadata(locale: Locale, slug: InformationSlug): Metadata {
  const copy = informationContent[locale][slug];
  const title = `${copy.title} | Apex News India`;
  const path = informationPath(locale, slug);
  return {
    title,
    description: copy.description,
    robots: { index: true, follow: true },
    alternates: { canonical: path, languages: alternates(informationAlternates(slug)) },
    openGraph: {
      type: "website",
      title,
      description: copy.description,
      url: path,
      siteName: "Apex News India",
      locale: localeConfig[locale].ogLocale,
      alternateLocale: localeConfig[locale === "en" ? "roman" : "en"].ogLocale,
      images: [{ url: "/images/delhi.jpg", alt: "India Gate, New Delhi" }],
    },
    twitter: { card: "summary_large_image", title, description: copy.description, images: ["/images/delhi.jpg"] },
  };
}
export function homeMetadata(locale: Locale): Metadata {
  const title =
    locale === "en"
      ? "Apex News India | Beyond the headline. Closer to the truth."
      : "Apex News India | Khabar ke aage. Sach ke kareeb.";
  const description =
    locale === "en"
      ? "India, politics, world, business and sport. Clear perspectives from Apex News India’s English edition."
      : "Bharat aur duniya ki har badi khabar. Rajneeti, karobar aur khel — seedhi, saaf aur Roman Hindi mein.";
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}`,
      languages: alternates({ en: "/en", roman: "/roman" }),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}`,
      siteName: "Apex News India",
      locale: localeConfig[locale].ogLocale,
      alternateLocale: localeConfig[locale === "en" ? "roman" : "en"].ogLocale,
      images: [
        {
          url: "/images/delhi.jpg",
          alt:
            locale === "en"
              ? "India Gate, New Delhi"
              : "New Delhi mein India Gate",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/delhi.jpg"],
    },
  };
}
export function articleMetadata(article: ApexArticle): Metadata {
  return {
    title: `${article.title} | Apex News India`,
    description: article.excerpt,
    robots: { index: true, follow: true },
    alternates: {
      canonical: article.alternatePaths[article.locale],
      languages: alternates(article.alternatePaths),
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url: article.alternatePaths[article.locale],
      siteName: "Apex News India",
      locale: localeConfig[article.locale].ogLocale,
      alternateLocale:
        localeConfig[article.locale === "en" ? "roman" : "en"].ogLocale,
      publishedTime: article.publishedAt,
      authors: [article.author],
      images: [{ url: article.featuredImage, alt: article.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.featuredImage],
    },
  };
}
