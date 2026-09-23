import Link from "next/link";
import { Brand } from "@/components/brand";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
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
                const last = record.revisions
                  .filter((r) => r.locale === locale)
                  .at(-1);
                return (
                  <p key={locale}>
                    {locale}: {last?.translationStatus ?? "pending"} ·{" "}
                    {last?.editorialStatus ?? "needs_review"} ·{" "}
                    {last?.publishStatus ?? "draft"}
                  </p>
                );
              })}
            </section>
          ))
        )}
      </main>
    </>
  );
}
