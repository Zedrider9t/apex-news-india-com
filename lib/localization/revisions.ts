import { createHash } from "node:crypto";
import type { SourceStory } from "../wordpress/types";
import type { SourceRevision } from "./types";
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export const hash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function makeSourceRevision(
  story: SourceStory,
  previous?: SourceRevision,
): SourceRevision {
  const text = {
    title: story.titleHindi,
    body: story.rawContentHtml,
    excerpt: story.rawExcerpt,
    categories: story.categories.map((c) => [c.id, c.name]),
    tags: story.tags.map((t) => [t.id, t.name]),
  };
  const contentHash = hash({ title: text.title, body: text.body });
  // A stable normalized snapshot excludes diagnostic warnings; never includes fetch-time timestamps.
  const { warnings: _warnings, ...snapshot } = story;
  void _warnings;
  const metadataHash = hash({
    ...snapshot,
    titleHindi: undefined,
    rawContentHtml: undefined,
    contentText: undefined,
  });
  const revisionHash = hash(snapshot);
  const changedFields = previous
    ? Object.keys(snapshot).filter(
        (k) =>
          canonical(snapshot[k as keyof typeof snapshot]) !==
          canonical(previous.story[k as keyof SourceStory]),
      )
    : Object.keys(snapshot);
  return {
    hash: revisionHash,
    textHash: hash(text),
    contentHash,
    metadataHash,
    observedAt: new Date().toISOString(),
    changedFields,
    changeKind: !previous
      ? "new"
      : revisionHash === previous.hash
        ? "unchanged"
        : contentHash === previous.contentHash
          ? "metadata_only"
          : "content_changed",
    story: structuredClone(story),
  };
}
