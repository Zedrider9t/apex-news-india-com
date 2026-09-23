"use client";
import { useEdition } from "./edition-provider";
import { locales, localeConfig, preferenceCookie } from "@/lib/locales";
import type { Locale, Localized } from "@/lib/types";
function remember(locale: Locale) {
  document.cookie = `${preferenceCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
// A document navigation updates the root html language and resets edition-local UI state.
export function LanguageSwitcher({
  alternatePaths,
}: {
  alternatePaths?: Localized<string>;
}) {
  const { locale } = useEdition();
  return (
    <nav
      className="language-switcher"
      aria-label={locale === "en" ? "Choose edition" : "Edition chuniye"}
    >
      {locales.map((target) => (
        <a
          key={target}
          href={alternatePaths?.[target] ?? `/${target}`}
          hrefLang={localeConfig[target].lang}
          lang={localeConfig[target].lang}
          aria-current={target === locale ? "page" : undefined}
          onClick={() => remember(target)}
        >
          {localeConfig[target].label}
        </a>
      ))}
    </nav>
  );
}
