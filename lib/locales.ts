import type { Locale } from "./types";
export const locales = ["en", "roman"] as const;
export const localeConfig = {
  en: {
    label: "English",
    lang: "en",
    edition: "ENGLISH EDITION",
    ogLocale: "en_IN",
  },
  roman: {
    label: "Roman Hindi",
    lang: "hi-Latn",
    edition: "ROMAN HINDI EDITION",
    ogLocale: "hi_IN",
  },
} as const;
export const preferenceCookie = "apex-edition";
export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "roman";
}
// Respect language quality weights. Hindi includes hi-Latn; unsupported languages fall back to English.
export function preferredLocale(saved?: string, acceptLanguage = ""): Locale {
  if (isLocale(saved)) return saved;
  const languages = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, ...options] = entry.trim().toLowerCase().split(";");
      const weight = options.find((part) => part.trim().startsWith("q="));
      return { tag, q: weight ? Number(weight.trim().slice(2)) : 1 };
    })
    .filter(({ q }) => Number.isFinite(q) && q > 0 && q <= 1)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of languages) {
    if (tag === "hi" || tag.startsWith("hi-")) return "roman";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}
export function articlePath(locale: Locale, slug: string) {
  return `/${locale}/news/${slug}`;
}
