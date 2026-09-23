import { fetchSourceStories } from "../wordpress/client";
import type { SourceObservation } from "./types";
/** Anonymous 404 cannot distinguish deletion, unpublishing, permissions or transient hiding. */
export async function readPublicSource(id: number): Promise<SourceObservation> {
  const result = await fetchSourceStories({ postId: id });
  return result.ok
    ? { kind: "active", story: result.stories[0] }
    : {
        kind:
          result.reason === "not-found" ? "unconfirmed_missing" : "unavailable",
      };
}
