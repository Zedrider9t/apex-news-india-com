# Apex News India — two-edition architecture delivery

Local previews: http://127.0.0.1:3010/en and http://127.0.0.1:3010/roman

## Current routing

| Route                                   | Behavior                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `/`                                     | 307 to saved cookie preference, weighted browser language, or English fallback |
| `/en`, `/roman`                         | Explicit edition homepages; never overridden by preference                     |
| `/en/news/[slug]`, `/roman/news/[slug]` | Localized articles paired by shared story ID                                   |
| `/news/[slug]`                          | 308 to the original story’s Roman Hindi URL                                    |
| Invalid locale / missing article        | 404 with noindex                                                               |
| `/robots.txt`, `/sitemap.xml`           | Crawl permission and 20 URLs with alternate languages                          |

## Files in this architecture update

Added:

- `proxy.ts`
- `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/not-found.tsx`, `app/[locale]/news/[slug]/page.tsx`
- `app/editions.css`, `app/robots.ts`, `app/sitemap.ts`
- `components/edition-provider.tsx`, `components/language-switcher.tsx`
- `lib/locales.ts`, `lib/messages.ts`, `lib/seo.ts`
- `lib/content/shared.ts`, `lib/content/en.ts`, `lib/content/roman.ts`
- `scripts/check-editions.mjs`

Updated:

- `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx`, `app/news/[slug]/page.tsx`
- `components/newsroom.tsx`, `components/hero.tsx`, `components/broadcast-panel.tsx`, `components/article-card.tsx`, `components/brand.tsx`
- `lib/types.ts`, `lib/mock-content.ts`, `lib/cms.ts`, `lib/format.ts`
- `package.json` (integration-check command only), `.env.example`, `README.md`, `DELIVERY.md`

The existing base/refinement styles, media assets, fonts and dependencies were retained.

## Locale and content contracts

`Locale` is `"en" | "roman"`, with `Localized<T>` requiring both keys. `ArticleMedia`, `ShortMedia` and stable category identifiers are shared. `ArticleCopy`, `ShortCopy`, `EditionCopy` and `EditionContent` carry edition text independently of UI components. Nine English and nine Roman Hindi article variants use localized slugs, titles, excerpts, body copy, image descriptions, metadata and category labels. Media paths and story IDs remain shared. `alternatePaths` pairs equivalent articles. `lib/messages.ts` holds typed interface translations; `lib/format.ts` formats dates in the India timezone with English or Roman Hindi month names.

## Switcher and preferences

English | Roman Hindi is a keyboard-accessible, crawlable header control on both homepages and article pages, including narrow mobile layouts. Active links have `aria-current`, with language tags on each option. A selection stores `apex-edition` in a one-year `SameSite=Lax` cookie, with `Secure` on HTTPS. No personal data is stored. Disabled cookies affect persistence only.

Switching an article opens the same story in the other edition. Switching from a homepage opens the other homepage. A full document navigation ensures HTML `lang` updates and search/filter/modal state resets cleanly. Only `/` negotiates preference; direct `/en/...` and `/roman/...` requests are authoritative.

The root document reads a URL-derived header supplied by `proxy.ts`, overwriting any incoming spoofed value. It emits `lang="en"` or `lang="hi-Latn"` server-side. This makes edition pages request-rendered; robots and sitemap remain static. There are no WordPress requests.

## SEO preparation

Both editions emit `index, follow`, localized titles/descriptions, self-canonicals, Open Graph/Twitter cards and reciprocal `en` / `hi-Latn` / `x-default` alternates. English is the x-default. Open Graph uses `en_IN` / `hi_IN`; HTML and hreflang retain `hi-Latn`. Sitemap entries cover both homepages and all 18 article variants. Invalid pages stay noindex.

The canonical origin is configurable through `NEXT_PUBLIC_SITE_URL`, defaulting to `https://apexnewsindia.com`; confirm/set it before a future launch. This is SEO configuration only, with no domain connection or deployment.

## Validation of this update

- `npm run build`: PASS.
- `npm run lint`: PASS, zero warnings/errors.
- `npm run typecheck`: PASS.
- `npm run check:editions`: PASS, **335 assertions across 20 pages**, including fixture completeness, shared media ownership, language negotiation, opposite-cookie behavior, spoofed-header handling, server HTML language, SEO, 404s and legacy redirects.
- Browser: both homepages at **1600, 1440, 1280, 768, 390 and 320px**; no document horizontal overflow and the language control stays visible.
- English hero variants also checked at 1280, 768, 390 and 320px: no overlap with the hero topline.
- Browser: remembered Roman preference at `/`; Roman → English equivalent-article switch updates URL, title and document language; direct edition links remain stable.
- Browser: Roman Hindi search, translated mobile categories/filtering and state reset when switching editions passed.
- Both mobile article headers verified with clear separation from the story body after a height adjustment.
- Browser warnings/errors in tested flows: none.

Mock editorial content and clearly labeled broadcast/Shorts previews remain in use. No dependencies were added, WordPress was not connected, and nothing was deployed. This is an architecture update; the approved visual system remains available for the next polish pass.

---

## Earlier delivery history

The notes below describe earlier design iterations. Current routing, indexing and validation above supersede their architecture details.

### Original frontend delivery

Local production preview: http://127.0.0.1:3010

## 1. Files changed

Modified existing files:

- `app/page.tsx` — server content loading and homepage composition.
- `app/layout.tsx` — self-hosted typography, edition metadata, preview indexing settings.
- `app/globals.css` — complete responsive newsroom design system.
- `lib/cms.ts` — local adapter with article lookup and source integration boundary.
- `package.json`, `package-lock.json` — working ESLint configuration, typecheck script, formatting dependency.
- `tsconfig.json` — formatting only.
- `next-env.d.ts` — regenerated by Next.js during build.
- `README.md` — setup, architecture, feature behavior, performance choices, and next work.

Added components:

- `components/newsroom.tsx`
- `components/hero.tsx`
- `components/broadcast-panel.tsx`
- `components/article-card.tsx`
- `components/brand.tsx`
- `components/section-heading.tsx`

Added routes and content infrastructure:

- `app/news/[slug]/page.tsx`
- `app/not-found.tsx`
- `lib/types.ts`
- `lib/mock-content.ts`
- `lib/format.ts`
- `eslint.config.mjs`

Added local assets and documentation:

- `app/fonts/barlow-condensed-bold.ttf`, `manrope-regular.ttf`, `manrope-bold.ttf`, and both OFL license files.
- `public/images/india.jpg`, `delhi.jpg`, `politics.jpg`, `market.jpg`, `cricket.jpg`, `technology.jpg`, `world.jpg`, `northeast.jpg`, `cinema.jpg`.
- `public/images/studio-concept.webp` — custom generated studio backdrop.
- `public/images/city.jpg`, `newsroom.jpg` — unused stock alternatives retained locally.
- `ASSETS.md`, `DELIVERY.md`.

The original `public/apex-logo.png` is preserved. Build outputs under `.next/` and `tsconfig.tsbuildinfo` are generated artifacts, not authored application files. The directory was not a Git repository, so this inventory is based on the original file inspection and edits performed.

## 2. Components created/refactored

A reusable brand lockup, editorial section heading, flexible article card, independent hero carousel, broadcast panel, and newsroom coordinator replace the original one-file starter. Typed mock data is separated from rendering; editorial ranks control hero, latest, and trending placement. Nine real local story routes and a branded missing-story page were added.

## 3. Visual improvements

Cinematic charcoal surfaces, Apex red accents, oversized condensed headlines, layered photographic hero treatment, numbered story rails, a custom broadcast studio frame, varied latest-news cards, immersive categories, vertical Shorts, an India 2047 coverage feature, app promotion, and an editorial footer. Barlow Condensed and Manrope are self-hosted. The original Apex logo remains the brand anchor.

## 4. Responsive improvements

A 1504px desktop container, tablet story rails, a full-width phone hero, compact mobile news rows, horizontal category/Shorts rails, a compact sticky masthead, and mobile bottom navigation with a central Live action. Checked at 1600, 1440, 1280, 768, 390, and 320 pixels. A tablet min-content overflow issue was fixed; all checked widths fit the viewport.

## 5. Animation and interactions

Manual hero transitions, a controllable breaking ticker, section reveals, image hover zooms, red hover treatments, live indicator pulses, and sticky-header transitions. Reduced-motion support includes scripted scrolling. Search has tagged keyword matching and an empty state. Category filters, all-stories expansion, native dialogs, Escape dismissal, article navigation, and Shorts rail controls work.

## 6. Performance improvements

Static homepage and article rendering; responsive Next Image delivery; reserved image dimensions/aspect ratios; lead-image preload; lazy loading elsewhere; local photographs and fonts; no external animation, carousel, search, or streaming dependencies. Generated studio artwork is a roughly 68KB WebP. There is no autoplay video. Core Web Vitals were not measured in field conditions, so no numerical performance score is claimed.

## 7. Validation

- `npm run build`: PASS, including TypeScript and static page generation.
- `npm run lint`: PASS, zero warnings/errors.
- `npm run typecheck`: PASS.
- Production browser checks: hero navigation, keyword search (including cricket tags), empty search, Escape dismissal, live preview, category filtering, clear filter, nine-story expansion, Shorts scrolling/preview, article navigation, and missing-story recovery.
- Responsive checks: 1600 / 1440 / 1280 / 768 / 390 / 320px; no document overflow.
- Image checks: no broken loaded images.
- Production browser console: no warnings or errors observed during the checked flows.

## 8. What should be built next

Supply verified editorial content and story-specific photography; add topic/category routes and richer article features; connect a licensed live stream and real captioned Shorts; finish publisher policies, newsletter, and app links. When separately authorized, integrate the source publishing pipeline and Roman Hindi conversion, then finish production SEO and performance audits.

## Current boundaries

This is a local frontend preview. No deployment, live-domain change, WordPress connection, or change to apexnewsindia.in was made. Stories are sample copy. Live TV, Shorts without media URLs, app downloads, and newsletter signup are transparently marked as previews or coming soon. The studio backdrop was made with the built-in imagegen tool; its full prompt and asset provenance are in `ASSETS.md`.

## Latest premium refinement — 17 September 2026

Changed in this pass: `components/hero.tsx`, `components/broadcast-panel.tsx`, `components/newsroom.tsx`, `lib/types.ts`, `lib/mock-content.ts`, `app/page.tsx`, `app/layout.tsx`, and these handoff docs. Added `app/refinements.css`. No package changes or new image downloads.

- A real 16:9 desktop hero, India Gate photography, stronger image visibility, layered light, and controllable slow camera motion. Tablet/phone compositions preserve headline space.
- A more prominent four-story rail, larger thumbnails, aligned metadata, tabular indexes, and red hover treatments.
- A richer 16:9 studio frame with pulse, play treatment, programme/anchor/time information, and an up-next schedule. All programme information is explicitly illustrative.
- A compact five-story editorial desk with a lead image that fills the two-row slot and four supporting cards; all-stories still expands to nine articles.
- Brighter full-bleed category windows, refined portrait Shorts with duration and labeled demo views, and an India 2047 feature with chapter navigation.
- Layered section surfaces, subtle rules/glow, and a larger brand presence with a four-format newsroom-network footer.
- No added dependencies; local Next Image delivery and existing self-hosted fonts retained. No autoplay media. Reduced-motion and narrow-phone behavior are respected.

Final checks: `npm run build`, `npm run lint`, and `npm run typecheck` all pass. All three hero slides checked across 1600/1440/1280/768/390/320px: zero horizontal overflow and positive headline-to-badge clearance. Hero pause/resume, disabled narrow-phone motion, five/nine-card expansion, filtering, keyword search, Escape dismissal, live preview, and Shorts preview checked. No browser warnings/errors observed during these checks. No deployment or WordPress connection was made.
