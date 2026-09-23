# Apex News India — English & Roman Hindi editions

A custom dark newsroom frontend built in the existing Next.js / React / TypeScript project. The `/en` and `/roman` editions retain **illustrative sample content**. An isolated, opt-in WordPress preview now reads public Hindi source articles. It does not modify apexnewsindia.in, connect a domain, translate content, or deploy anything.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production preview:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3010
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

`next lint` was removed from the starter configuration because this project uses Next.js 16. ESLint now uses the official Next.js flat configuration. Prettier is available for formatting.

## Structure

- `app/page.tsx` negotiates an edition only at `/`; `app/[locale]/page.tsx` composes each edition homepage.
- `components/newsroom.tsx` coordinates navigation, search, filters, media rails, dialogs, and footer.
- `components/hero.tsx` is an independently controlled editorial carousel.
- `components/broadcast-panel.tsx` contains the broadcast preview frame.
- `components/article-card.tsx` supports lead, standard, and responsive list presentations.
- `components/brand.tsx` preserves the supplied logo and provides the shared brand lockup.
- `components/section-heading.tsx` provides consistent editorial section headers.
- `app/[locale]/news/[slug]/page.tsx` renders localized articles. Legacy `/news/[slug]` links permanently redirect to their Roman Hindi equivalents. Unknown locales/slugs return 404.
- `lib/types.ts` defines article, category, and Short contracts, including future source-post IDs, media URLs, view counts, and editorial ranks.
- `lib/mock-content.ts` assembles edition content from `lib/content/en.ts`, `roman.ts`, and shared media/identities in `shared.ts`.
- `lib/cms.ts` is the content adapter boundary. It currently returns local data only.
- `lib/format.ts` formats article timestamps in the India timezone.
- `app/globals.css` defines the base design system, motion, and responsive layouts.
- `app/refinements.css` adds the final cinematic/broadcast treatment and breakpoint-specific editorial density.
- `app/fonts/` contains self-hosted Manrope and Barlow Condensed, with OFL licenses.

## Working interactions

Search checks titles, descriptions, categories, and optional search tags. It includes an empty state and native modal focus containment. Category navigation, the mega menu, and visual category tiles filter the latest feed. All-stories expands the feed. Articles open real edition-specific routes. The carousel is manual to avoid unexpected motion. The breaking ticker has pause/resume controls and pauses on hover/focus. Mobile top stories, categories, and Shorts support horizontal scrolling. Phone navigation includes a central Live TV action.

Live TV opens a clearly labeled disconnected-stream preview. Shorts open an editorial preview until media URLs are supplied; the data model supports real media and optional view counts. App and newsletter controls explain their coming-soon state and do not collect data. About/editorial/privacy dialogs describe the prototype; they are not final publisher policy documents.

## Responsive design and accessibility

The desktop container caps at 1504px with a cinematic hero and side rail. At tablet sizes the top stories become a horizontal rail. Phones receive a compact masthead, full-width lead story, compact latest-news rows, swipe rails, and fixed bottom navigation with safe-area support. Breakpoints cover large desktops, 1280px, tablets, and narrow phones.

Native buttons and links, named icon controls, a skip link, keyboard-operable dialogs, Escape dismissal, visible focus rings, and reduced-motion styles are included. System reduced-motion preference also controls scripted scrolling. Reveals remain readable without JavaScript.

## Performance decisions

The homepage and nine story pages are pre-rendered. Images use Next Image with responsive sizes, reserved aspect ratios, lead-image preload, and default lazy loading below the fold. Photos and fonts are local, so there are no third-party image/font requests during normal rendering. There are no animation, carousel, player, analytics, or external search libraries. Motion uses opacity and transforms; reveals use one IntersectionObserver. No autoplay video or automatic hero rotation.

These are implementation measures, not a measured Core Web Vitals guarantee. Run Lighthouse against the production build and collect field metrics after launch.

## Preview safeguards

The edition date intentionally matches the fixed sample content, rather than presenting old fixtures as current news. Both editions now emit `index, follow`, as requested. Photography is representative and story pages still disclose sample content. This remains a local, unpublished preview.

## Next work

1. Finalize real editorial copy, licensed photographs, topic pages, and publisher information.
2. Supply the Apex live stream, Shorts videos/captions, programme schedule, and analytics/view-count source.
3. Add category/topic routes, pagination, article share/save functions, and editorial corrections/author pages.
4. When explicitly authorized, replace the local adapter with the Hindi-to-Roman-Hindi publishing pipeline, source-post mapping, validation, and publish/update/unpublish handling.
5. Finish canonical/hreflang metadata, NewsArticle structured data for verified stories, sitemap, newsletter/app integration, and production performance audits before deployment.

See `ASSETS.md` for photography sources and the generated studio concept prompt.

## Premium refinement pass — 17 September 2026

The desktop hero now uses a true 16:9 India Gate composition with brighter imagery, layered gradients, and a slow CSS camera drift. Motion can be paused, pauses offscreen, and is disabled for reduced-motion preferences and narrow phones. Top Stories uses a tighter four-story rail with larger aligned thumbnails. Latest News shows a lead story and four supporting cards by default, expanding to all nine fixtures on demand.

The broadcast frame includes typed programme, presenter, time-slot, and up-next information. This is explicitly a sample rundown, not a real broadcast schedule. Shorts use crop-specific 9:16 posters and labeled demo view counts. Categories, the India 2047 feature package, section surfaces, and the Apex newsroom-network footer receive stronger depth and hierarchy.

No runtime dependency or external service was added. Final build, lint, and TypeScript checks pass. All three hero slides were checked at 1600, 1440, 1280, 768, 390, and 320px, with no document overflow or headline/badge overlap.

## Two-edition architecture

- `/en` and `/roman`: English and Roman Hindi homepages.
- `/en/news/[slug]` and `/roman/news/[slug]`: translated articles with edition-specific slugs.
- `/`: temporary 307 redirect; valid `apex-edition` cookie first, then weighted `Accept-Language` (Hindi → Roman Hindi, English → English), otherwise English. Explicit edition URLs never negotiate or redirect to a preference.
- `/news/[slug]`: original Roman Hindi URLs receive permanent 308 redirects.

`Locale = "en" | "roman"`; `Localized<T>` requires both editions. `ArticleMedia` and `ShortMedia` own stable IDs and shared photography. `ArticleCopy`, `ShortCopy`, `EditionCopy`, and `EditionContent` separate editorial text from components. Categories retain stable identifiers for filtering but expose translated labels and descriptors. `ApexArticle.alternatePaths` pairs the same story across different slugs. All UI messages have compile-time checked keys in `lib/messages.ts`.

The header's **English | Roman Hindi** control is visible on desktop, tablet, and mobile, including article pages. It uses real crawlable links, marks the active edition, and writes a one-year, first-party `SameSite=Lax` preference cookie on selection (`Secure` on HTTPS). Switching editions makes a document navigation so the root HTML language and local interaction state reset together. Article switches retain story identity; home switches open the other homepage. Blocking cookies does not prevent switching; it only removes persistence.

`proxy.ts` derives and overwrites a private request header from the URL. The root layout uses it to emit `lang="en"` or `lang="hi-Latn"` in the server response. This deliberately makes edition pages request-rendered; assets and Next Image optimization remain shared. No locale detection runs repeatedly on edition pages.

## Edition SEO

Localized titles, descriptions, Open Graph and Twitter metadata, self-canonicals, and reciprocal `en` / `hi-Latn` / `x-default` alternates are implemented. English is the `x-default` target. Open Graph uses its supported `en_IN` / `hi_IN` locale convention; HTML and hreflang retain the Roman script marker. `/sitemap.xml` lists both homepages and all 18 article URLs with language alternates. `/robots.txt` allows crawling and references the sitemap. Invalid routes remain noindex 404s.

`NEXT_PUBLIC_SITE_URL` controls the canonical/sitemap origin; it defaults to `https://apexnewsindia.com` and should be set to the confirmed public origin before any future launch. It is configuration only: no domain or deployment operation has occurred.

## Edition integration checks

With the production preview running on port 3010:

```bash
npm run check:editions
```

Set `CHECK_ORIGIN` to test another local preview port. The script uses the existing TypeScript dev dependency to load pure fixture modules and checks copy completeness, shared assets, locale negotiation, all 20 indexable pages, language tags, canonical and alternate metadata, opposite preferences, invalid routes, robots, and legacy redirects. No test dependency was added.

## Read-only WordPress source preview — 18 September 2026

The approved editions remain mock-backed. Set `USE_WORDPRESS_CONTENT=true` only to enable original Hindi source content at `/source-preview` and `/source-preview/{postId}`. The default is false, with labeled mock fallback. This development harness is noindex, but is not an authenticated access boundary; keep it local during this phase.

After `npm run build`, run these in separate terminals:

```bash
# Default/mock preview
npm run start -- --hostname 127.0.0.1 --port 3010

# Public source preview
USE_WORDPRESS_CONTENT=true npm run start -- --hostname 127.0.0.1 --port 3011
```

Open http://127.0.0.1:3011/source-preview. No credentials are required. Direct source image URLs are reused. `SOURCE_WP_API` is a reference setting; the implemented client deliberately pins the public source origin.

```bash
npm run test:wordpress
npm run check:editions
npm run check:wordpress
```

The unit suite uses saved public JSON fixtures and stubbed failures. The preview check requires both servers above and live source availability. `CHECK_ORIGIN` and `WORDPRESS_PREVIEW_ORIGIN` override their test origins. Optional `WORDPRESS_LIVE_TEST=true npm run test:wordpress` adds a direct live adapter smoke test.

See [the complete integration report](docs/WORDPRESS-INTEGRATION.md) for exact endpoints/fields, hidden authors, AIOSEO findings, media behavior, models, file inventory, validation and the proposed next phase. Translation and deployment have not started.

## Gemini localization and sync-state development

A separate server-side localization engine now stores immutable Hindi source snapshots and versioned English/Roman Hindi records. `GeminiTranslationProvider` is the first implementation of the replaceable provider interface. No real Gemini output has been generated yet: `GEMINI_API_KEY` is missing. The three saved source articles have clearly labeled pending translations.

Read [the localization/sync guide](docs/LOCALIZATION-SYNC.md) for private free-tier configuration, HTML preservation, validation, revision rules, quota stops and limitations. Set the key only in ignored `.env.local`, with a Google project whose billing is disabled. No provider/model fallback occurs. The approved editions remain unchanged and mock-backed.

```bash
npm run localize -- seed 13373 13337 12724
# Only after private Gemini free-tier configuration:
npm run localize -- sync 13373 13337 12724
npm run test:localization
# Requires a running local production preview and seeded records:
npm run check:localization
```

Review `/translation-preview` and `/translation-preview/{postId}/en` or `/roman`. These are read-only, noindex local review pages, excluded from the sitemap. Generated records remain drafts requiring bilingual editorial review. No deploy, publish, automatic sync schedule, DNS change, or WordPress write has been performed.
