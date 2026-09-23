import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { ArticleCard } from "@/components/article-card";
import { EditorialImage } from "@/components/editorial-image";
import { getSourcePreview } from "@/lib/wordpress/preview";
export const dynamic = "force-dynamic";
export default async function SourceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  const { result, articles } = await getSourcePreview(Number(id));
  if (!result.ok && result.reason === "not-found") notFound();
  const story = result.ok ? result.stories[0] : null;
  const article = articles[0];
  return (
    <>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <Link className="text-link" href="/source-preview">
            Back to source preview
          </Link>
        </div>
      </header>
      <main className="reader shell">
        <div className="sample-notice">
          {story
            ? "ORIGINAL HINDI SOURCE · Integration preview · Not translated"
            : `MOCK FALLBACK · ${!result.ok ? result.reason : ""} · This is not source article #${id}`}
        </div>
        {story ? (
          <article lang="hi">
            <div className="eyebrow">
              {story.categories.map((c) => c.name || `#${c.id}`).join(" / ") ||
                "Category unavailable"}
            </div>
            <h1>{story.titleHindi}</h1>
            <p className="reader-deck">{story.excerptText}</p>
            <div className="reader-meta" lang="en">
              <b>
                {story.author.name || "Author unavailable"} · ID{" "}
                {story.author.sourceId ?? "unknown"}
              </b>
              <time dateTime={story.publishedAt}>
                Published:{" "}
                {new Date(story.publishedAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </time>
              <time dateTime={story.modifiedAt}>
                Modified:{" "}
                {new Date(story.modifiedAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </time>
            </div>
            <figure>
              <div className="reader-image">
                <EditorialImage
                  src={article.featuredImage}
                  alt={article.imageAlt}
                  fill
                  sizes="(max-width:1000px) 100vw,960px"
                  preload
                />
              </div>
              <figcaption>
                {story.featuredImage?.alt || "Source photograph"} ·{" "}
                <a href={story.sourceUrl} rel="noreferrer">
                  Original article
                </a>
              </figcaption>
            </figure>
            <div className="reader-body">
              {story.contentText.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="source-facts" lang="en">
              <p>Shared identity: {story.sharedStoryId}</p>
              <p>Source revision: {story.modifiedAt}</p>
              <p>Warnings: {story.warnings.join(", ") || "none"}</p>
              <p>
                Tags:{" "}
                {story.tags.map((t) => t.name || `#${t.id}`).join(", ") ||
                  "None supplied"}
              </p>
              <p>
                Inline images: {story.articleImages.length} · Embeds:{" "}
                {story.embeds.length} · Galleries: {story.galleries.length}
              </p>
              <p>
                HTML is preserved server-side and displayed as safe text for
                this phase. No source scripts, iframes or SEO markup are
                executed.
              </p>
            </div>
          </article>
        ) : (
          <ArticleCard article={article} featured />
        )}
      </main>
    </>
  );
}
