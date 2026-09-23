import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTs } from "./wordpress-test-loader.mjs";
const { normalizePost, sourceIdentity } = loadTs("lib/wordpress/normalize.ts");
const { fetchSourceStories } = loadTs("lib/wordpress/client.ts");
const { inspectHtml, sourceImageUrl } = loadTs("lib/wordpress/html.ts");
const posts = JSON.parse(
  readFileSync("tests/fixtures/wordpress-posts.json", "utf8"),
);
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};
for (const post of posts) {
  const s = normalizePost(post);
  check(s.sourcePostId === post.id, "preserve source ID");
  check(
    s.titleHindi.length > 0 && !s.titleHindi.includes("&#"),
    "decode source title",
  );
  check(s.rawContentHtml === post.content.rendered, "preserve original HTML");
  check(s.rawExcerpt === post.excerpt.rendered, "preserve original excerpt");
  check(s.publishedAt === post.date_gmt + ".000Z", "UTC date preserved");
  check(s.modifiedAt === post.modified_gmt + ".000Z", "UTC revision preserved");
  check(
    s.featuredImage?.url === post._embedded["wp:featuredmedia"][0].source_url,
    "reuse featured URL",
  );
  check(s.featuredImage.sizes.length > 0, "preserve responsive sizes");
  check(
    s.author.sourceId === post.author && !s.author.available,
    "hidden author explicit",
  );
  check(
    s.categories.length === post.categories.length,
    "category relationships",
  );
  check(
    s.seo.aioseo_head_json && s.customFields.amp_enabled === true,
    "SEO and custom fields retained",
  );
  const identity = sourceIdentity(s, "2026-09-17T00:00:00.000Z");
  check(
    identity.englishVersion === null && identity.romanHindiVersion === null,
    "no generated versions",
  );
  check(identity.sourceRevision === s.modifiedAt, "revision mapping");
}
const clone = () => structuredClone(posts[0]);
for (const change of [
  (p) => (p.id = "invalid"),
  (p) => (p.status = "draft"),
  (p) => (p.content.protected = true),
  (p) => (p.date_gmt = "bad"),
  (p) => (p.date_gmt = "2026-02-31T00:00:00"),
  (p) => (p.title = null),
  (p) => (p.link = "https://evil.example/x"),
  (p) => (p.content.rendered = "x".repeat(1000001)),
]) {
  const p = clone();
  change(p);
  assert.throws(() => normalizePost(p));
  checks++;
}
let p = clone();
p.featured_media = 0;
p._embedded = {};
p.categories = [];
p.tags = [];
let s = normalizePost(p);
check(
  !s.featuredImage &&
    !s.author.available &&
    s.warnings.includes("category-unavailable"),
  "missing relations are safe",
);
p = clone();
p._embedded["wp:featuredmedia"] = [
  { code: "rest_post_invalid_id", data: { status: 404 } },
];
check(!normalizePost(p).featuredImage, "deleted media is safe");
p = clone();
p.categories = [99999];
check(
  normalizePost(p).categories[0].id === 99999 &&
    normalizePost(p).categories[0].name === null,
  "unknown category ID retained",
);
p = clone();
p.some_news_field = { edition: "regional" };
check(
  normalizePost(p).customFields.some_news_field.edition === "regional",
  "unknown source fields retained",
);
const html = inspectHtml(
  '<p>पहला &amp; दूसरा<script>alert(1)</script><img src="javascript:bad" onerror="bad()"><img src="/wp-content/uploads/a.jpg" srcset="a.jpg 300w"></p><p>अधूरा<strong> पाठ<iframe src="https://www.youtube.com/embed/example"></iframe><!-- wp:gallery {"ids":[1,2]} -->[gallery ids="3,4"]',
);
check(html.paragraphs.join(" ").includes("पहला & दूसरा"), "entities decoded");
check(!html.paragraphs.join(" ").includes("alert"), "scripts excluded");
check(html.images.length === 1, "unsafe image URL rejected");
check(html.embeds.length === 1, "inert embed discovered");
check(html.galleries.length === 2, "gallery references extracted");
check(
  sourceImageUrl("https://apexnewsindia.in/wp-content/uploads/a.webp") !== null,
  "approved source image",
);
check(
  sourceImageUrl("https://evil.example/x.webp") === null &&
    sourceImageUrl("https://apexnewsindia.in/wp-content/uploads/a.svg") ===
      null,
  "external/SVG source images rejected",
);
const response = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const fetchWith = (value) => async () => response(value);
let result = await fetchSourceStories({ fetcher: fetchWith(posts) });
check(result.ok && result.stories.length === 6, "normal fetch");
result = await fetchSourceStories({ fetcher: fetchWith([{}, posts[0]]) });
check(
  result.ok && result.stories.length === 1 && result.warnings.length === 1,
  "skip malformed row without dropping valid post",
);
for (const [body, reason] of [
  [[], "empty"],
  [{}, "malformed"],
  [[{ id: 1 }], "malformed"],
]) {
  result = await fetchSourceStories({ fetcher: fetchWith(body) });
  check(!result.ok && result.reason === reason, reason + " fallback");
}
result = await fetchSourceStories({
  fetcher: async () =>
    new Response("<html>error</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
});
check(!result.ok && result.reason === "malformed", "HTML error page");
result = await fetchSourceStories({
  fetcher: async () =>
    new Response("{broken", {
      headers: { "content-type": "application/json" },
    }),
});
check(!result.ok && result.reason === "malformed", "bad JSON");
result = await fetchSourceStories({ fetcher: async () => response({}, 404) });
check(!result.ok && result.reason === "not-found", "deleted post");
let attempts = 0;
result = await fetchSourceStories({
  fetcher: async () => {
    attempts++;
    throw Error("offline");
  },
  sleep: async () => {},
});
check(
  !result.ok && result.reason === "network" && attempts === 2,
  "bounded network retry",
);
attempts = 0;
result = await fetchSourceStories({
  fetcher: async () => {
    attempts++;
    return response({}, 500);
  },
  sleep: async () => {},
});
check(
  !result.ok && result.reason === "http" && attempts === 2,
  "bounded server retry",
);
const delays = [];
attempts = 0;
result = await fetchSourceStories({
  fetcher: async () =>
    ++attempts === 1
      ? response({}, 429, { "retry-after": "1" })
      : response(posts),
  sleep: async (ms) => {
    delays.push(ms);
  },
});
check(
  result.ok && attempts === 2 && delays[0] === 1000,
  "respect short Retry-After",
);
attempts = 0;
result = await fetchSourceStories({
  fetcher: async () => {
    attempts++;
    return response({}, 429, { "retry-after": "60" });
  },
});
check(
  !result.ok && result.reason === "rate-limited" && attempts === 1,
  "no early retry during long rate limit",
);
result = await fetchSourceStories({
  timeoutMs: 5,
  retries: 0,
  fetcher: async (_url, init) =>
    new Promise((_resolve, reject) =>
      init.signal.addEventListener("abort", () => reject(Error("aborted"))),
    ),
});
check(!result.ok && result.reason === "timeout", "request timeout");
result = await fetchSourceStories({
  postId: 13373,
  fetcher: fetchWith(posts[0]),
});
check(result.ok && result.stories.length === 1, "single article");
result = await fetchSourceStories({ postId: 9, fetcher: fetchWith(posts[0]) });
check(
  !result.ok && result.reason === "malformed",
  "mismatched article response rejected",
);
let requested = "";
await fetchSourceStories({
  limit: 100,
  fetcher: async (url, init) => {
    requested = url;
    check(
      init.method === "GET" &&
        init.redirect === "error" &&
        !("Authorization" in init.headers),
      "read-only request",
    );
    return response(posts);
  },
});
check(requested.includes("per_page=6"), "bounded sample size");
const { previewArticle } = loadTs("lib/wordpress/preview.ts");
check(
  previewArticle(normalizePost(posts[0])).alternatePaths.en.startsWith(
    "/source-preview/",
  ),
  "source links isolated",
);
p = clone();
p._embedded["wp:featuredmedia"] = [];
check(
  previewArticle(normalizePost(p)).featuredImage ===
    "/images/source-unavailable.svg",
  "missing image gets explicit placeholder",
);
result = await fetchSourceStories({
  fetcher: async () =>
    new Response("{}", {
      headers: {
        "content-type": "application/json",
        "content-length": "4000001",
      },
    }),
});
check(
  !result.ok && result.reason === "malformed",
  "oversize response rejected",
);
console.log(`PASS: ${checks} WordPress adapter assertions.`);
if (process.env.WORDPRESS_LIVE_TEST === "true") {
  const live = await fetchSourceStories();
  assert.ok(live.ok, JSON.stringify(live));
  console.log(
    "LIVE SOURCE IDS:",
    live.stories.map((s) => s.sourcePostId).join(", "),
  );
}
