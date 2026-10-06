import Link from "next/link";
import { Brand } from "@/components/brand";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { ApproveStoryForm } from "@/components/localization-approve-story-form";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function TranslationIndex() {
  let records;
  try {
    records = await new JsonLocalizationRepository().list();
  } catch {
    return (
      <main className="shell translation-main">
        <h1>Localization store unavailable</h1>
        <p>No data was overwritten. Inspect the local store before retrying.</p>
      </main>
    );
  }
  return (
    <>
      <header className="reader-header">
        <div className="shell">
          <Brand />
          <Link href="/en" className="text-link">
            English edition
          </Link>
        </div>
      </header>
      <main className="shell translation-main">
        <p className="eyebrow">LOCALIZATION · LOCAL REVIEW ONLY</p>
        <h1>Translation review.</h1>
        <p>
          Original Hindi source and separate English / Roman Hindi drafts.
          Nothing here is published. Opening a preview never calls Gemini.
        </p>
        {!records.length ? (
          <div className="sample-notice">
            No source records have been saved yet. Use the local seed command
            documented in the integration guide.
          </div>
        ) : (
          records.map((record) => (
            <section className="translation-record" key={record.sharedStoryId}>
              <h2>Source #{record.sourcePostId}</h2>
              <p>
                {record.state} · {record.availability}
              </p>
              <p className="translation-code">{record.sharedStoryId}</p>
              <nav aria-label={`Review source ${record.sourcePostId}`}>
                <Link href={`/source-preview/${record.sourcePostId}`}>
                  Live Hindi source
                </Link>
                <Link href={`/translation-preview/${record.sourcePostId}/en`}>
                  English draft
                </Link>
                <Link
                  href={`/translation-preview/${record.sourcePostId}/roman`}
                >
                  Roman Hindi draft
                </Link>
              </nav>
              {(["en", "roman"] as const).map((locale) => {
                const currentId = record.current[locale];
                const current = record.revisions.find(
                  (revision) => revision.revisionId === currentId,
                );
                return (
                  <p key={locale}>
                    {locale}: {current?.translationStatus ?? "pending"} ·{" "}
                    {current?.editorialStatus ?? "needs_review"} ·{" "}
                    {current?.publishStatus ?? "draft"}
                  </p>
                );
              })}
              {(() => {
                const current = (["en", "roman"] as const).map((locale) => {
                  const id = record.current[locale];
                  return record.revisions.find(
                    (revision) => revision.revisionId === id,
                  );
                });
                const approvable =
                  process.env.NODE_ENV !== "production" &&
                  current.every(
                    (revision) =>
                      revision &&
                      revision.translationStatus === "generated" &&
                      revision.validation.passed &&
                      revision.sourceRevisionHash === record.currentSourceHash &&
                      revision.editorialStatus !== "manually_approved",
                  );
                return (
                  <ApproveStoryForm
                    sourcePostId={record.sourcePostId}
                    enabled={approvable}
                  />
                );
              })()}
            </section>
          ))
        )}
      </main>
    </>
  );
}
