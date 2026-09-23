import assert from "node:assert/strict";
const liveOrigin =
  process.env.WORDPRESS_PREVIEW_ORIGIN || "http://127.0.0.1:3011";
const mockOrigin = process.env.CHECK_ORIGIN || "http://127.0.0.1:3010";
let checks = 0;
const check = (value, message) => {
  assert.ok(value, message);
  checks++;
};
async function get(origin, path) {
  const response = await fetch(new URL(path, origin), {
    headers: { "user-agent": "Googlebot" },
    redirect: "manual",
  });
  return { response, html: await response.text() };
}
const live = await get(liveOrigin, "/source-preview");
check(live.response.status === 200, "source preview renders");
check(
  live.html.includes("Original Hindi source"),
  "live source mode, not mock fallback",
);
check(
  live.html.includes('content="noindex, nofollow"'),
  "source preview excluded from search",
);
check(live.html.includes('lang="hi"'), "Hindi content language");
check(
  live.html.includes("https://apexnewsindia.in/wp-content/uploads/"),
  "source image URLs reused directly",
);
const ids = [
  ...new Set(
    [...live.html.matchAll(/href="\/source-preview\/(\d+)"/g)].map((m) => m[1]),
  ),
];
check(ids.length > 0 && ids.length <= 6, "limited live sample");
for (const id of ids) {
  const detail = await get(liveOrigin, `/source-preview/${id}`);
  check(detail.response.status === 200, `detail ${id}`);
  check(
    detail.html.includes(`wp:apexnewsindia.in:${id}`),
    `stable source identity ${id}`,
  );
  check(
    detail.html.includes("ORIGINAL HINDI SOURCE") &&
      detail.html.includes('content="noindex, nofollow"'),
    `untranslated noindex source ${id}`,
  );
  check(
    detail.html.includes("Published:") && detail.html.includes("Modified:"),
    `timestamps ${id}`,
  );
  check(
    detail.html.includes("Author unavailable") && detail.html.includes("ID"),
    `explicit unavailable author ${id}`,
  );
  check(
    detail.html.includes("reader-body") &&
      detail.html.includes("https://apexnewsindia.in/wp-content/uploads/"),
    `body and image ${id}`,
  );
}
const fallback = await get(mockOrigin, "/source-preview");
check(
  fallback.response.status === 200 &&
    fallback.html.includes("Mock fallback") &&
    fallback.html.includes("disabled"),
  "disabled mode returns labeled mock fallback",
);
check(
  fallback.html.includes("A new India. A bold vision. The road ahead."),
  "mock content preserved",
);
for (const edition of ["en", "roman"]) {
  const { response, html } = await get(liveOrigin, `/${edition}`);
  check(
    response.status === 200 && html.includes("index, follow"),
    `${edition} remains available/indexable in source mode`,
  );
  check(
    html.includes(
      edition === "en"
        ? "A new India. A bold vision. The road ahead."
        : "Naya Bharat. Nayi soch. Ek bada roadmap.",
    ),
    `${edition} not contaminated with untranslated source copy`,
  );
}
const missing = await get(liveOrigin, "/source-preview/not-an-id");
check(missing.response.status === 404, "invalid source identifier 404");
const sitemap = await get(liveOrigin, "/sitemap.xml");
check(
  !sitemap.html.includes("source-preview"),
  "source harness not in sitemap",
);
console.log(
  `PASS: ${checks} source-preview integration assertions. Live post IDs: ${ids.join(", ")}`,
);
