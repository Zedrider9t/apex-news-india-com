import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { InformationFooter } from "@/components/information-footer";
import {
  informationAlternates,
  informationContent,
  informationPath,
  informationUi,
  isInformationSlug,
  contactPurposeOrder,
  verifiedContactChannels,
} from "@/lib/information-content";
import { isLocale } from "@/lib/locales";
import { informationMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

type PageParams = Promise<{ locale: string; information: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale, information } = await params;
  if (!isLocale(locale) || !isInformationSlug(information)) {
    return {
      title: "Page not found | Apex News India",
      robots: { index: false, follow: false },
    };
  }
  return informationMetadata(locale, information);
}

export default async function InformationPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale: requestedLocale, information } = await params;
  if (!isLocale(requestedLocale) || !isInformationSlug(information)) notFound();
  const locale: Locale = requestedLocale;
  const copy = informationContent[locale][information];
  const ui = informationUi[locale];
  const isContact = information === "contact";
  return (
    <>
      <a className="skip-link" href="#information-main">
        {locale === "en" ? "Skip to content" : "Content par jaayein"}
      </a>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <LanguageSwitcher
            alternatePaths={informationAlternates(information)}
          />
          <Link href={`/${locale}`} className="text-link">
            <ArrowLeft size={15} /> {ui.back}
          </Link>
        </div>
      </header>
      <main id="information-main" className="information-main">
        <div className="shell">
          <nav
            className="information-breadcrumb"
            aria-label={locale === "en" ? "Breadcrumb" : "Page ka raasta"}
          >
            <Link href={`/${locale}`}>{ui.home}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{copy.title}</span>
          </nav>
          <div className="information-intro">
            <span className="eyebrow">{copy.label}</span>
            <h1>{copy.title}</h1>
            <p>{copy.deck}</p>
            {copy.effectiveDate && (
              <div className="information-date">
                <span>{ui.effectiveDate}</span>
                <time dateTime="2026-09-23">{copy.effectiveDate}</time>
              </div>
            )}
          </div>
          <div className="information-layout">
            <aside
              className="information-sidebar"
              aria-label={locale === "en" ? "On this page" : "Is page par"}
            >
              <span className="eyebrow">
                {locale === "en" ? "ON THIS PAGE" : "IS PAGE PAR"}
              </span>
              <ol>
                {copy.sections.map((section, index) => (
                  <li key={section.heading}>
                    <a href={`#section-${index + 1}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </aside>
            <article className="information-article">
              {isContact && verifiedContactChannels.length === 0 && (
                <div className="information-contact-status" role="status">
                  <span className="eyebrow">
                    {locale === "en" ? "CONTACT STATUS" : "SAMPARK KI STHITI"}
                  </span>
                  <p>{ui.contactMissing}</p>
                </div>
              )}
              {copy.sections.map((section, index) => {
                const channel = isContact
                  ? verifiedContactChannels.find(
                      (item) => item.purpose === contactPurposeOrder[index],
                    )
                  : undefined;
                return (
                  <section
                    id={`section-${index + 1}`}
                    key={section.heading}
                    className="information-section"
                  >
                    <span className="information-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2>{section.heading}</h2>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {channel && (
                        <a
                          className="information-verified-link"
                          href={channel.href}
                        >
                          {channel.label} <ArrowUpRight size={16} />
                        </a>
                      )}
                    </div>
                  </section>
                );
              })}
              {information !== "contact" && information !== "about" && (
                <div className="information-cta">
                  <span className="eyebrow">
                    {locale === "en" ? "NEED MORE HELP?" : "AUR MADAD CHAHIYE?"}
                  </span>
                  <h2>
                    {information === "support"
                      ? ui.supportCta
                      : locale === "en"
                        ? "Questions or requests?"
                        : "Sawaal ya request?"}
                  </h2>
                  <Link
                    href={informationPath(locale, "contact")}
                    className="text-link"
                  >
                    {locale === "en" ? "Visit Contact" : "Contact page dekhein"}{" "}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
              {information === "contact" && (
                <div className="information-cta">
                  <span className="eyebrow">
                    {locale === "en" ? "APP HELP" : "APP MADAD"}
                  </span>
                  <h2>
                    {locale === "en"
                      ? "Try the support guide"
                      : "Support guide dekhein"}
                  </h2>
                  <Link
                    href={informationPath(locale, "support")}
                    className="text-link"
                  >
                    {locale === "en"
                      ? "View app support"
                      : "App support dekhein"}{" "}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
            </article>
          </div>
        </div>
      </main>
      <InformationFooter locale={locale} />
    </>
  );
}
