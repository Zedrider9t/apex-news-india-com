import { normalizePost, sourceIdentity } from "./normalize";
import type { SourceFailure, SourceResult } from "./types";
import { SOURCE_ORIGIN } from "./html";
const API = `${SOURCE_ORIGIN}/wp-json/wp/v2`;
const MAX_BYTES = 4_000_000;
class SourceError extends Error {
  constructor(
    readonly reason: SourceFailure,
    message: string,
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}
export interface FetchOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
}
async function request(path: string, options: FetchOptions): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const retries = Math.min(1, Math.max(0, options.retries ?? 1));
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 6000,
    );
    try {
      const response = await fetcher(`${API}/${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 429) {
        const retryHeader = response.headers.get("retry-after") ?? "";
        const seconds = /^\d+$/.test(retryHeader)
          ? Number(retryHeader)
          : Math.max(0, (Date.parse(retryHeader) - Date.now()) / 1000);
        // Do not retry earlier than the source asks; long retry windows fall back immediately.
        throw new SourceError(
          "rate-limited",
          "Source rate limit reached",
          Number.isFinite(seconds) ? seconds * 1000 : 1000,
        );
      }
      if (response.status === 404)
        throw new SourceError("not-found", "Source article not found");
      if (!response.ok)
        throw new SourceError(
          "http",
          `Source HTTP ${response.status}`,
          response.status >= 500 ? 500 : 0,
        );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new SourceError("malformed", "Expected JSON");
      if (Number(response.headers.get("content-length")) > MAX_BYTES)
        throw new SourceError("malformed", "Response exceeds safety limit");
      const reader = response.body?.getReader();
      if (!reader) throw new SourceError("empty", "Empty response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          throw new SourceError("malformed", "Response exceeds safety limit");
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      try {
        return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
      } catch {
        throw new SourceError("malformed", "Invalid JSON");
      }
    } catch (error) {
      const failure =
        error instanceof SourceError
          ? error
          : new SourceError(
              controller.signal.aborted ? "timeout" : "network",
              "Public source request failed",
            );
      const retryable =
        failure.reason === "network" ||
        failure.reason === "timeout" ||
        failure.retryAfter > 0;
      if (attempt < retries && retryable && failure.retryAfter <= 2000) {
        clearTimeout(timer);
        await (
          options.sleep ??
          ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
        )(failure.retryAfter || 300);
        continue;
      }
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new SourceError("network", "Public source request failed");
}
export async function fetchSourceStories(
  options: FetchOptions & {
    postId?: number;
    limit?: number;
    after?: string;
    before?: string;
  } = {},
): Promise<SourceResult> {
  try {
    if (
      options.postId !== undefined &&
      (!Number.isSafeInteger(options.postId) || options.postId < 1)
    )
      throw new SourceError("malformed", "Invalid post ID");
    const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 6)));
    const params = new URLSearchParams({
      per_page: String(limit),
      _embed: "1",
      status: "publish",
      orderby: "date",
      order: "desc",
    });
    if (options.after) params.set("after", options.after);
    if (options.before) params.set("before", options.before);

    const raw = await request(
      options.postId
        ? `posts/${options.postId}?_embed=1`
        : `posts?${params.toString()}`,
      options,
    );
    if (!options.postId && !Array.isArray(raw))
      throw new SourceError("malformed", "Expected posts array");
    const rows = options.postId ? [raw] : (raw as unknown[]).slice(0, limit);
    if (!rows.length)
      throw new SourceError("empty", "No public articles returned");
    const warnings: string[] = [];
    const stories = rows.flatMap((row, index) => {
      try {
        const story = normalizePost(row);
        if (options.postId && story.sourcePostId !== options.postId)
          throw new Error("ID mismatch");
        return [story];
      } catch {
        warnings.push(`Skipped malformed post at index ${index}`);
        return [];
      }
    });
    if (!stories.length)
      throw new SourceError("malformed", "No valid public articles returned");
    const fetchedAt = new Date().toISOString();
    return {
      ok: true,
      stories,
      identities: stories.map((story) => sourceIdentity(story, fetchedAt)),
      fetchedAt,
      warnings,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof SourceError ? error.reason : "malformed",
      message:
        error instanceof SourceError
          ? error.message
          : "Source data could not be normalized",
    };
  }
}
