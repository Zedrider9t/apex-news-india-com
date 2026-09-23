import { en } from "./content/en";
import { roman } from "./content/roman";
import { articleMedia, categoryMedia, shortMedia } from "./content/shared";
import { articlePath } from "./locales";
import type { EditionContent, EditionCopy, Locale, Localized } from "./types";
export const editionCopy: Localized<EditionCopy> = { en, roman };
export function getEditionContent(locale: Locale): EditionContent {
  const copy = editionCopy[locale];
  return {
    locale,
    articles: articleMedia.map((media) => ({
      ...media,
      ...copy.articles[media.id],
      locale,
      alternatePaths: {
        en: articlePath("en", en.articles[media.id].slug),
        roman: articlePath("roman", roman.articles[media.id].slug),
      },
    })),
    categories: categoryMedia.map((media) => ({
      ...media,
      ...copy.categories[media.name],
    })),
    shorts: shortMedia.map((media) => ({ ...media, ...copy.shorts[media.id] })),
    broadcastProgramme: copy.broadcastProgramme,
  };
}
