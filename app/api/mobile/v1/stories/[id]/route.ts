import { NextResponse } from "next/server";
import { getReadyLocalizedArticle } from "@/lib/cms";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): Locale | null {
  return value === "en" || value === "roman" ? value : null;
}

function categoryKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = parseLocale(new URL(request.url).searchParams.get("locale"));
  if (!locale) {
    return NextResponse.json(
      { ok: false, error: "locale must be en or roman" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const article = await getReadyLocalizedArticle(locale, id);
  if (!article) {
    return NextResponse.json(
      { ok: false, error: "story not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      schemaVersion: 1,
      locale,
      item: {
        id: article.sourcePostId ?? article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        bodyHtml: article.contentHtml ?? "",
        category: categoryKey(article.category),
        tags: article.tags ?? [],
        publishedAt: article.publishedAt,
        readMinutes: article.readMinutes,
        author: article.author,
        image: {
          url: article.featuredImage,
          alt: article.imageAlt,
        },
        sourceUrl: article.sourceUrl ?? null,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
