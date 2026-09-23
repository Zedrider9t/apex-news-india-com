import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
// These modules contain only local fixtures or pure functions; erase type-only imports.
async function loadTypedModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
const { preferredLocale } = await loadTypedModule("../lib/locales.ts");
const origin = process.env.CHECK_ORIGIN || "http://127.0.0.1:3010";
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
async function get(path, headers = {}) {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    headers: { "user-agent": "Googlebot", ...headers },
  });
  return { response, html: await response.text() };
}
const [{ en }, { roman }, { articleMedia, shortMedia, categoryMedia }] =
  await Promise.all([
    loadTypedModule("../lib/content/en.ts"),
    loadTypedModule("../lib/content/roman.ts"),
    loadTypedModule("../lib/content/shared.ts"),
  ]);
for (const edition of [en, roman]) {
  check(
    new Set(Object.values(edition.articles).map((a) => a.slug)).size ===
      articleMedia.length,
    "unique localized slugs for every shared article",
  );
  for (const media of articleMedia) {
    check(
      Boolean(
        edition.articles[media.id]?.title &&
        edition.articles[media.id]?.content.length,
      ),
      "every shared article has complete copy",
    );
    check(
      !("featuredImage" in edition.articles[media.id]),
      "article photography is shared, not duplicated by edition",
    );
  }
  for (const media of shortMedia)
    check(
      Boolean(edition.shorts[media.id]?.title),
      "every Short has localized copy",
    );
  for (const media of categoryMedia)
    check(
      Boolean(edition.categories[media.name]?.label),
      "every category has localized labels",
    );
}
for (const [saved, accept, expected] of [
  [undefined, "hi-IN, en;q=0.8", "roman"],
  [undefined, "en-US,hi;q=0.5", "en"],
  ["roman", "en", "roman"],
  ["en", "hi", "en"],
  ["invalid", "fr,hi;q=0.7", "roman"],
  [undefined, "fr,de", "en"],
  [undefined, "hi;q=0,en;q=0.1", "en"],
  [undefined, "en;q=0.4,hi;q=0.8", "roman"],
])
  check(
    preferredLocale(saved, accept) === expected,
    `locale negotiation: ${saved}/${accept}`,
  );
for (const [headers, expected] of [
  [{}, "/en"],
  [{ "accept-language": "hi-IN,en;q=0.5" }, "/roman"],
  [{ cookie: "apex-edition=roman", "accept-language": "en" }, "/roman"],
  [{ cookie: "apex-edition=en", "accept-language": "hi" }, "/en"],
  [{ cookie: "apex-edition=invalid", "accept-language": "fr" }, "/en"],
]) {
  const { response } = await get("/", headers);
  check(response.status === 307, "root uses temporary negotiation redirect");
  check(
    response.headers.get("location") === expected,
    `root selects ${expected}`,
  );
}
const { html: sitemap, response: sitemapResponse } = await get("/sitemap.xml");
check(sitemapResponse.status === 200, "sitemap exists");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => new URL(m[1]),
);
check(urls.length === 30, "two homepages, eighteen articles and ten information pages in sitemap");
for (const url of urls) {
  const locale = url.pathname.split("/")[1];
  const lang = locale === "en" ? "en" : "hi-Latn";
  const { response, html } = await get(url.pathname, {
    cookie: `apex-edition=${locale === "en" ? "roman" : "en"}`,
    "accept-language": locale === "en" ? "hi" : "en",
    "x-apex-locale": locale === "en" ? "roman" : "en",
  });
  check(
    response.status === 200,
    `${url.pathname} is reachable despite opposite preference`,
  );
  check(
    html.includes(`<html lang="${lang}"`),
    `${url.pathname} document language (ignores spoofed header)`,
  );
  check(
    html.includes('name="robots" content="index, follow"'),
    `${url.pathname} indexable`,
  );
  check(
    !html.includes('content="noindex'),
    `${url.pathname} no noindex inherited`,
  );
  check(
    html.includes(`rel="canonical" href="${url.href}"`),
    `${url.pathname} canonical`,
  );
  for (const alternate of ["en", "hi-Latn", "x-default"])
    check(
      html.includes(`hrefLang="${alternate}"`),
      `${url.pathname} alternate ${alternate}`,
    );
  check(
    html.includes('property="og:locale"'),
    `${url.pathname} Open Graph language`,
  );
  check(
    html.includes('name="twitter:card" content="summary_large_image"'),
    `${url.pathname} social card`,
  );
  check(
    html.includes('class="language-switcher"'),
    `${url.pathname} switcher server-rendered`,
  );
  if (!/\/(?:privacy-policy|terms|contact|about|support)$/.test(url.pathname)) {
    const links = [
      ...html.matchAll(/href="(\/(?:en|roman)\/news\/[^"#?]+)"/g),
    ].map((m) => m[1]);
    check(
      links.some((link) => link.startsWith(`/${locale}/news/`)),
      `${url.pathname} edition article links`,
    );
  } else {
    const slug = url.pathname.split("/").at(-1);
    const opposite = locale === "en" ? "roman" : "en";
    check(html.includes(`href="/${opposite}/${slug}"`), `${url.pathname} equivalent-edition switcher`);
    for (const info of ["about", "contact", "support", "privacy-policy", "terms"])
      check(html.includes(`href="/${locale}/${info}"`), `${url.pathname} local footer link to ${info}`);
    if (slug === "privacy-policy" || slug === "terms")
      check(html.includes('dateTime="2026-09-23"') || html.includes('datetime="2026-09-23"'), `${url.pathname} effective date`);
    if (slug === "contact")
      check(
        html.includes(locale === "en" ? "verified public contact channel has not yet been published" : "tasdeeq-shuda public contact channel publish nahin hua"),
        `${url.pathname} contact verification notice`,
      );
    if (slug === "support")
      check(
        html.includes(locale === "en" ? "availability depends on the source stream" : "source stream par nirbhar hai"),
        `${url.pathname} live-stream availability guidance`,
      );
  }
  if (url.pathname === "/en")
    check(
      html.includes("A new India. A bold vision. The road ahead."),
      "English lead copy",
    );
  if (url.pathname === "/roman")
    check(
      html.includes("Naya Bharat. Nayi soch. Ek bada roadmap."),
      "Roman Hindi lead copy",
    );
}
for (const path of [
  "/fr",
  "/en/news/missing-story",
  "/roman/news/missing-story",
  "/en/not-an-information-page",
  "/roman/not-an-information-page",
]) {
  const { response, html } = await get(path);
  check(response.status === 404, `${path} returns 404`);
  check(html.includes("noindex"), `${path} excluded from indexing`);
}
const legacy = await get("/news/viksit-bharat-naya-roadmap");
check(legacy.response.status === 308, "legacy article permanently redirects");
check(
  legacy.response.headers.get("location") ===
    "/roman/news/viksit-bharat-naya-roadmap",
  "legacy article preserves Roman identity",
);
const robots = await get("/robots.txt");
check(
  robots.html.includes("Allow: /") && robots.html.includes("/sitemap.xml"),
  "robots allows editions and advertises sitemap",
);
console.log(
  `PASS: ${checks} edition routing, language, content and SEO assertions across 30 pages.`,
);
