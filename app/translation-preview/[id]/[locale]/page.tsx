import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { EditorialImage } from "@/components/editorial-image";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { latestSource } from "@/lib/localization/engine";
import { RichContent } from "../../rich-content";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function TranslationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id, locale } = await params;
  const { revision: requested } = await searchParams;
  if (!/^[1-9]\d{0,9}$/.test(id) || (locale !== "en" && locale !== "roman"))
    notFound();
  const record = await new JsonLocalizationRepository().read(Number(id));
  if (!record) notFound();
  const revisions = record.revisions.filter((r) => r.locale === locale);
  const revision = requested
    ? revisions.find((r) => r.revisionId === requested)
    : revisions.at(-1);
  if (requested && !revision) notFound();
  const source = revision
    ? (record.sources.find((s) => s.hash === revision.sourceRevisionHash) ??
      latestSource(record))
    : latestSource(record);
  const story = source.story;
  const current = record.current[locale];
  return (
    <>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <Link className="text-link" href="/translation-preview">
            All translation drafts
          </Link>
        </div>
      </header>
      <main className="shell translation-main">
        <p className="eyebrow">LOCAL REVIEW · NEVER PUBLISHED</p>
        <h1>{locale === "en" ? "English" : "Roman Hindi"} translation</h1>
        <nav className="translation-nav" aria-label="Translation previews">
          <Link href={`/translation-preview/${id}/en`}>English</Link>
          <Link href={`/translation-preview/${id}/roman`}>Roman Hindi</Link>
          <Link href={`/source-preview/${id}`}>Live source</Link>
        </nav>
        <section className="translation-status">
          <h2>Revision and status</h2>
          <dl>
            <dt>Shared identity</dt>
            <dd>{record.sharedStoryId}</dd>
            <dt>Source state</dt>
            <dd>
              {record.state} · {record.availability}
            </dd>
            <dt>Source revision</dt>
            <dd>{source.hash}</dd>
            <dt>Source modified</dt>
            <dd>{story.modifiedAt}</dd>
            <dt>Translation revision</dt>
            <dd>
              {revision
                ? `${revision.translationVersion} · ${revision.revisionId}`
                : "Not generated"}
            </dd>
            <dt>Workflow</dt>
            <dd>
              {revision
                ? `${revision.translationStatus} · ${revision.editorialStatus} · ${revision.publishStatus}`
                : "pending · needs_review · draft"}
            </dd>
            <dt>Provider / model</dt>
            <dd>
              {revision
                ? `${revision.translationMetadata.provider} / ${revision.translationMetadata.model}`
                : "Gemini — not called"}
            </dd>
            <dt>Generated</dt>
            <dd>{revision?.generatedAt ?? "Not generated"}</dd>
            <dt>Last synced</dt>
            <dd>{record.lastSyncedAt}</dd>
            <dt>Prompt / validator</dt>
            <dd>
              {revision
                ? `${revision.translationMetadata.promptVersion} / ${revision.validation.validatorVersion}`
                : "Pending"}
            </dd>
            <dt>Changed fields</dt>
            <dd>{source.changedFields.join(", ") || "None"}</dd>
          </dl>
          {revision?.sourceRevisionHash !== record.currentSourceHash && (
            <p className="sample-notice">
              This draft uses an older source revision. Review the updated
              source before approval.
            </p>
          )}
          {current && revision?.revisionId !== current && (
            <p>
              <Link href={`?revision=${current}`}>
                View previous valid revision
              </Link>{" "}
              — it has been retained.
            </p>
          )}
          {revision?.failure && (
            <p className="sample-notice">
              {revision.failure.code}: {revision.failure.message}
            </p>
          )}
          {!revision?.generatedAt && (
            <p className="sample-notice">
              No generated translation is available. Configure the Gemini
              free-tier key and run the local sync command. No mock translation
              is shown.
            </p>
          )}
        </section>
        <div className="translation-comparison">
          <article lang="hi">
            <p className="eyebrow">HINDI SOURCE SNAPSHOT</p>
            <h2>{story.titleHindi}</h2>
            <p>{story.excerptText}</p>
            {story.featuredImage && (
              <EditorialImage
                src={story.featuredImage.url}
                alt={story.featuredImage.alt || story.titleHindi}
                width={960}
                height={540}
              />
            )}
            <RichContent html={story.rawContentHtml} />
          </article>
          <article lang={locale === "en" ? "en" : "hi-Latn"}>
            <p className="eyebrow">
              {locale === "en" ? "ENGLISH" : "ROMAN HINDI"} · REVIEW DRAFT
            </p>
            {revision?.generatedAt ? (
              <>
                <h2>
                  {revision.localizedTitle || "Blank title — validation failed"}
                </h2>
                <p>{revision.localizedExcerpt}</p>
                {story.featuredImage && (
                  <EditorialImage
                    src={story.featuredImage.url}
                    alt={story.featuredImage.alt || "Shared source photograph"}
                    width={960}
                    height={540}
                  />
                )}
                <RichContent html={revision.localizedContent} />
                <h3>Prepared metadata</h3>
                <dl>
                  <dt>Slug</dt>
                  <dd>{revision.localizedSlug}</dd>
                  <dt>Page / OG title</dt>
                  <dd>{revision.seo.pageTitle}</dd>
                  <dt>Meta / OG description</dt>
                  <dd>{revision.seo.metaDescription}</dd>
                  <dt>Categories</dt>
                  <dd>
                    {revision.localizedCategoryLabels
                      .map((c) => c.label)
                      .join(", ")}
                  </dd>
                </dl>
              </>
            ) : (
              <p>
                Translation pending. The original Hindi record remains
                unchanged.
              </p>
            )}
          </article>
        </div>
        <section className="translation-status">
          <h2>Validation and editorial review</h2>
          <p>
            {revision?.generatedAt
              ? revision.validation.passed
                ? "Automated checks passed; bilingual editorial approval still required."
                : "Not accepted: validation or source verification failed."
              : "Not run — no generated output."}
          </p>
          <ul>
            {revision?.validation.issues.map((issue, i) => (
              <li key={i}>
                <b>
                  {issue.severity} · {issue.code}
                </b>
                {issue.segmentId ? ` (${issue.segmentId})` : ""}:{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
        <section className="translation-status">
          <h2>Revision history</h2>
          {revisions.map((r) => (
            <p key={r.revisionId}>
              <Link href={`?revision=${r.revisionId}`}>
                Version {r.translationVersion}
              </Link>{" "}
              · {r.translationStatus} · {r.editorialStatus} ·{" "}
              {r.generatedAt ?? "Not generated"}
            </p>
          ))}
        </section>
      </main>
    </>
  );
}
