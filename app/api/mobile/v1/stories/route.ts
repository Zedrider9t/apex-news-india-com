import { NextResponse } from "next/server";
import { getReadyLocalizedArticles } from "@/lib/cms";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): Locale | null {
  return value === "en" || value === "roman" ? value : null;
}

function categoryKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function articleDto(article: Awaited<ReturnType<typeof getReadyLocalizedArticles>>[number]) {
  return {
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
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = parseLocale(url.searchParams.get("locale"));
  if (!locale) {
    return NextResponse.json(
      { ok: false, error: "locale must be en or roman" },
      { status: 400 },
    );
  }

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get("per_page")) || 6),
  );
  const category = url.searchParams.get("category")?.trim().toLowerCase() || "";
  const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

  let articles = await getReadyLocalizedArticles(locale);

  if (category) {
    articles = articles.filter((article) => categoryKey(article.category) === category);
  }

  if (search) {
    articles = articles.filter((article) =>
      [article.title, article.excerpt, article.author, ...(article.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  const total = articles.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const items = articles.slice(start, start + perPage).map(articleDto);

  return NextResponse.json(
    {
      ok: true,
      schemaVersion: 1,
      locale,
      page,
      perPage,
      total,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      items,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
