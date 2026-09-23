"use client";
import { useEdition } from "./edition-provider";
import { formatPublishedDate } from "@/lib/format";
import { EditorialImage as Image } from "./editorial-image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { ApexArticle } from "@/lib/types";
export function ArticleCard({
  article,
  featured = false,
}: {
  article: ApexArticle;
  featured?: boolean;
}) {
  const { t, locale, categoryLabel } = useEdition();
  return (
    <article className={`article-card ${featured ? "featured-card" : ""}`}>
      <Link href={article.alternatePaths[locale]} className="article-image">
        <Image
          src={article.featuredImage}
          alt={article.imageAlt}
          fill
          sizes={
            featured
              ? "(max-width: 700px) 90vw, 45vw"
              : "(max-width: 700px) 75vw, 25vw"
          }
        />
        <span className="image-arrow">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="article-copy">
        <div className="eyebrow">
          {categoryLabel(article.category)}
          <span> • </span>
          <span className="muted">{t("THE BIG PICTURE")}</span>
        </div>
        <h3>
          <Link href={article.alternatePaths[locale]}>{article.title}</Link>
        </h3>
        {featured && <p>{article.excerpt}</p>}
        <div className="meta">
          <time dateTime={article.publishedAt}>
            {formatPublishedDate(article.publishedAt, locale).toUpperCase()}
          </time>
          <span>
            <Clock3 size={12} /> {article.readMinutes} {t("min read")}{" "}
          </span>
        </div>
      </div>
    </article>
  );
}
