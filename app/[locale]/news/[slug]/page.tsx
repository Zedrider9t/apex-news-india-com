import { isLocale } from "@/lib/locales";
import { articleMetadata } from "@/lib/seo";
import { getTranslator } from "@/lib/messages";
import { editionCopy } from "@/lib/mock-content";
import { LanguageSwitcher } from "@/components/language-switcher";
import { formatPublishedDate } from "@/lib/format";
import { EditorialImage as Image } from "@/components/editorial-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getArticle, getLatestArticles } from "@/lib/cms";
import { Brand } from "@/components/brand";
import { ArticleCard } from "@/components/article-card";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticle(locale, slug);
  return article
    ? articleMetadata(article)
    : {
        title: "Story not found | Apex News India",
        robots: { index: false, follow: false },
      };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const article = await getArticle(locale, slug);
  if (!article) notFound();
  const related = (await getLatestArticles(locale))
    .filter((a) => a.id !== article.id)
    .slice(0, 3);
  return (
    <>
      <a className="skip-link" href="#article">
        {" "}
        {t("Skip to story")}{" "}
      </a>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <LanguageSwitcher alternatePaths={article.alternatePaths} />
          <Link href={`/${locale}`} className="text-link">
            <ArrowLeft size={15} /> {t("Back to newsroom")}{" "}
          </Link>
        </div>
      </header>
      <main id="article" className="reader shell">
        <div className="reader-breadcrumb">
          <Link href={`/${locale}`}>{t("Home")}</Link>
          <span>/</span>
          <span>{editionCopy[locale].categories[article.category].label}</span>
          <span>/</span>
          <span>{article.contentOrigin === "localized" ? t("News") : t("Sample story")}</span>
        </div>
        <span className="eyebrow">
          {editionCopy[locale].categories[article.category].label}{" "}
          {t("/ THE APEX EDIT")}
        </span>
        <h1>{article.title}</h1>
        <p className="reader-deck">{article.excerpt}</p>
        <div className="reader-meta">
          <b>{article.author}</b>
          <time dateTime={article.publishedAt}>
            {formatPublishedDate(article.publishedAt, locale)}
          </time>
          <span>
            {article.readMinutes} {t("min read")}
          </span>
        </div>
        {article.contentOrigin !== "localized" && (
          <div className="sample-notice">
            {" "}
            {t(
              "DESIGN PREVIEW — Yeh sample story hai, verified news report nahi. Tasveer prateekatmak hai.",
            )}{" "}
          </div>
        )}
        <figure>
          <div className="reader-image">
            <Image
              src={article.featuredImage}
              alt={article.imageAlt}
              fill
              sizes="(max-width: 1000px) 100vw, 960px"
              preload
            />
          </div>
          <figcaption>
            {article.imageAlt}
            {article.contentOrigin === "localized"
              ? ""
              : ` ${t("· Representative photograph / Unsplash")}`}
          </figcaption>
        </figure>
        <div className="reader-body">
          {article.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          {article.contentOrigin === "localized" && article.sourceUrl && (
            <p className="reader-source">
              <a
                className="text-link"
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Original Hindi source")}
              </a>
            </p>
          )}
          <Link className="text-link" href={`/${locale}`}>
            {" "}
            {t("Newsroom mein wapas")} <ArrowLeft size={15} />
          </Link>
        </div>
        <section className="reader-related">
          <h2>{t("Aage bhi padhiye.")}</h2>
          <div className="reader-related-grid">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
