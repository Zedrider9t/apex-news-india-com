"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveStoryForm({
  sourcePostId,
  enabled,
}: {
  sourcePostId: number;
  enabled: boolean;
}) {
  const router = useRouter();
  const [actor, setActor] = useState("");
  const [note, setNote] = useState(
    "Reviewed English and Roman Hindi against the current Hindi source.",
  );
  const [state, setState] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  if (!enabled)
    return (
      <p className="translation-approval-note">
        Approve Both becomes available when both current revisions are generated,
        validated and still need editorial approval.
      </p>
    );

  async function approve() {
    if (!actor.trim() || !note.trim()) {
      setState("error");
      setMessage("Enter reviewer name and review note.");
      return;
    }
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/editorial/approve-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: sourcePostId, actor, note }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.error || "Approval failed");
      setState("done");
      setMessage("English and Roman Hindi approved together.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Approval failed");
    }
  }

  return (
    <div className="translation-approve">
      <div className="translation-approve-fields">
        <label>
          Reviewer
          <input
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            placeholder="Reviewer name"
            autoComplete="name"
          />
        </label>
        <label>
          Review note
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="translation-approve-button"
        onClick={approve}
        disabled={state === "saving" || state === "done"}
      >
        {state === "saving"
          ? "Approving…"
          : state === "done"
            ? "Approved"
            : "Approve Both"}
      </button>
      {message && (
        <p
          className={
            state === "error"
              ? "translation-approval-message error"
              : "translation-approval-message"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
