import Link from "next/link";
import { Brand } from "@/components/brand";
import { Hero } from "@/components/hero";
import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { getSourcePreview } from "@/lib/wordpress/preview";
export const dynamic = "force-dynamic";
export default async function SourcePreview() {
  const { result, articles } = await getSourcePreview();
  return (
    <>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <Link className="text-link" href="/en">
            Back to English edition
          </Link>
        </div>
      </header>
      <main className="shell source-preview-main">
        <div className="sample-notice" lang="en">
          <b>READ-ONLY WORDPRESS INTEGRATION PREVIEW</b>
          <p>
            {result.ok
              ? "Original Hindi source · no translations or publishing. English interface labels are only the component test harness."
              : `Mock fallback · ${result.reason}. ${result.message}.`}
          </p>
        </div>
        <div lang={result.ok ? "hi" : "en"}>
          <section className="lead-grid">
            <Hero slides={articles.slice(0, 3)} />
            <aside className="top-stories">
              <div className="rail-heading">
                <h2>Source stories.</h2>
              </div>
              <div className="top-story-list">
                {articles.slice(1, 5).map((article, i) => (
                  <Link
                    key={article.id}
                    className="top-story"
                    href={article.alternatePaths.en}
                  >
                    <span className="story-number">0{i + 1}</span>
                    <div>
                      <h3>{article.title}</h3>
                      <span className="meta">{article.author}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </section>
          <section className="section">
            <SectionHeading
              kicker="SOURCE CONTENT · COMPONENT VERIFICATION"
              title="Latest source stories"
            />
            <div className="latest-grid">
              {articles.slice(0, 5).map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  featured={index === 0}
                />
              ))}
            </div>
          </section>
        </div>
        {result.ok && (
          <section className="source-facts">
            <h2>Source relationships</h2>
            <p>
              Fetched {result.fetchedAt}. Author details are unavailable
              publicly; source IDs remain preserved.
            </p>
            {result.stories.map((story) => (
              <p key={story.sharedStoryId}>
                <Link href={`/source-preview/${story.sourcePostId}`}>
                  {story.sourcePostId}
                </Link>{" "}
                ·{" "}
                {story.categories
                  .map((c) => c.name || `Category #${c.id}`)
                  .join(", ")}{" "}
                · Author ID {story.author.sourceId ?? "unavailable"} · Published{" "}
                {story.publishedAt} · Modified {story.modifiedAt}
              </p>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
