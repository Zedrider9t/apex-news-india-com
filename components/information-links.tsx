import Link from "next/link";
import type { Locale } from "@/lib/types";
import {
  informationPath,
  type InformationSlug,
} from "@/lib/information-content";

const links: { slug: InformationSlug; labels: Record<Locale, string> }[] = [
  { slug: "about", labels: { en: "About", roman: "Hamare baare mein" } },
  { slug: "contact", labels: { en: "Contact", roman: "Sampark" } },
  { slug: "support", labels: { en: "Support", roman: "App support" } },
  {
    slug: "privacy-policy",
    labels: { en: "Privacy Policy", roman: "Niji Jankari ki Niti" },
  },
  {
    slug: "terms",
    labels: { en: "Terms & Conditions", roman: "Istemaal ki Shartein" },
  },
];

export function InformationLinks({ locale }: { locale: Locale }) {
  return (
    <nav
      className="information-links"
      aria-label={locale === "en" ? "Site information" : "Site ki jankari"}
    >
      {links.map(({ slug, labels }) => (
        <Link key={slug} href={informationPath(locale, slug)}>
          {labels[locale]}
        </Link>
      ))}
    </nav>
  );
}
