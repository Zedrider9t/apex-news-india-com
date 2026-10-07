import type { Metadata } from "next";
import Link from "next/link";
import { JsonLocalizationRepository } from "@/lib/localization/repository";
import { plainText } from "@/lib/wordpress/html";
import type { StoryRecord } from "@/lib/localization/types";
import "./editorial.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editorial Review | Apex News India",
  robots: { index: false, follow: false, nocache: true },
};

function currentRevision(record: StoryRecord, locale: "en" | "roman") {
  const revisionId = record.current[locale];
  return revisionId
    ? record.revisions.find((item) => item.revisionId === revisionId) ?? null
    : null;
}

export default async function EditorialPage() {
  const repo = new JsonLocalizationRepository();
  const records = (await repo.list())
    .filter((record) => record.state === "active")
    .sort((a, b) => b.sourcePostId - a.sourcePostId);

  const queue = records.filter((record) => {
    const en = currentRevision(record, "en");
    const roman = currentRevision(record, "roman");
    return (
      en?.editorialStatus === "needs_review" ||
      roman?.editorialStatus === "needs_review" ||
      !en ||
      !roman
    );
  });

  return (
    <main className="editorial-shell">
      <header className="editorial-header">
        <div>
          <p className="editorial-kicker">APEX NEWS INDIA</p>
          <h1>Editorial Review</h1>
          <p className="editorial-subtitle">
            Human approval gate for English and Roman Hindi localization.
          </p>
        </div>
        <div className="editorial-count">{queue.length} pending</div>
      </header>

      {queue.length === 0 ? (
        <section className="editorial-empty">
          <h2>No stories are waiting for review.</h2>
          <p>Validated stories will appear here automatically.</p>
        </section>
      ) : (
        <section className="editorial-list">
          {queue.map((record) => {
            const source = record.sources.find(
              (item) => item.hash === record.currentSourceHash,
            );
            const en = currentRevision(record, "en");
            const roman = currentRevision(record, "roman");
            const canApprove =
              !!en &&
              !!roman &&
              en.translationStatus === "generated" &&
              roman.translationStatus === "generated" &&
              en.validation.passed &&
              roman.validation.passed &&
              en.sourceRevisionHash === record.currentSourceHash &&
              roman.sourceRevisionHash === record.currentSourceHash;

            return (
              <article className="editorial-card" key={record.sourcePostId}>
                <div className="editorial-card-head">
                  <div>
                    <span className="editorial-id">WP #{record.sourcePostId}</span>
                    <h2>{source?.story.titleHindi ?? ("Story " + record.sourcePostId)}</h2>
                  </div>
                  <span className={canApprove ? "status-ready" : "status-blocked"}>
                    {canApprove ? "READY FOR REVIEW" : "BLOCKED"}
                  </span>
                </div>

                <div className="editorial-columns">
                  <section>
                    <h3>Hindi Source</h3>
                    <p className="editorial-copy">
                      {source?.story.contentText.join("\n\n") ?? "Source unavailable."}
                    </p>
                  </section>

                  <section>
                    <h3>
                      English
                      <span>{en?.validation.passed ? "VALIDATED" : "NOT READY"}</span>
                    </h3>
                    <p className="editorial-copy">
                      {en ? plainText(en.localizedContent) : "No current English revision."}
                    </p>
                    {en?.warnings.length ? (
                      <details>
                        <summary>{en.warnings.length} review warning(s)</summary>
                        <ul>{en.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                      </details>
                    ) : null}
                  </section>

                  <section>
                    <h3>
                      Roman Hindi
                      <span>{roman?.validation.passed ? "VALIDATED" : "NOT READY"}</span>
                    </h3>
                    <p className="editorial-copy">
                      {roman ? plainText(roman.localizedContent) : "No current Roman Hindi revision."}
                    </p>
                    {roman?.warnings.length ? (
                      <details>
                        <summary>{roman.warnings.length} review warning(s)</summary>
                        <ul>{roman.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                      </details>
                    ) : null}
                  </section>
                </div>

                <div className="editorial-actions">
                  <Link href={source?.story.sourceUrl ?? "#"} target="_blank">
                    Open Hindi source
                  </Link>
                  {en ? (
                    <Link href={"/translation-preview/" + record.sourcePostId + "/en"} target="_blank">
                      English preview
                    </Link>
                  ) : null}
                  {roman ? (
                    <Link href={"/translation-preview/" + record.sourcePostId + "/roman"} target="_blank">
                      Roman preview
                    </Link>
                  ) : null}

                  <form action="/api/editorial/approve-story" method="post">
                    <input type="hidden" name="id" value={record.sourcePostId} />
                    <input type="hidden" name="actor" value="Mohsin" />
                    <input
                      aria-label="Review note"
                      name="note"
                      placeholder="Review note (required)"
                      required
                    />
                    <button disabled={!canApprove} type="submit">
                      Approve EN + Roman
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
