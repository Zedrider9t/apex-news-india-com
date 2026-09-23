# WordPress source integration — review report

Audit: 17–18 September 2026. Public, unauthenticated GET/HEAD requests only. The Hindi `.in` publisher remains the master source. The approved `/en`, `/roman`, locale switching, canonical/hreflang and mock content are unchanged. No translation, publishing, WordPress changes, DNS changes or deployment occurred.

## 1. Public endpoints and actual access

Base: `https://apexnewsindia.in/wp-json/`; core namespace: `wp/v2`.

| Endpoint | Observed result |
| --- | --- |
| REST root | 200; route discovery, namespaces, Asia/Kolkata timezone, GMT offset 5.5 |
| `posts?per_page=6&_embed=1` | 200; six public posts; 538 total at initial audit (changes with publishing) |
| `posts/13373?_embed=1` | 200; individual article |
| `categories?per_page=100` | 200; 28 categories at audit |
| `tags?per_page=10` | 200; ten tags sampled |
| `users?per_page=3`, `users/1` | 404 `rest_no_route`; embedded author also contains an error |
| `media?per_page=3` | 200 with empty array; collection enumeration cannot be relied on |
| `media/13374` | 200; image attachment metadata; featured media also available through `_embed` |
| `types`, `taxonomies` | 200; registered REST shapes listed below |
| `pages?per_page=100&_embed=1` | 200; six pages: register, login, read-history, home, contact, blog |
| `e-floating-buttons` | 200, empty collection |
| `elementor_library` | 401 `rest_forbidden` |

Excerpts, dates, slugs and article HTML are fields on posts, not separate endpoints. Featured media uses `featured_media` plus `_embedded["wp:featuredmedia"]`. Terms use `_embedded["wp:term"]`. Attachments use the media routes. Route advertisement does not prove anonymous access.

Evidence: `wordpress/index.json`, `endpoint-results.json`, `types.json`, `taxonomies.json`, `observed-fields.json`; exact six-post responses in `../tests/fixtures/wordpress-posts.json`. The route snapshot retains core/oEmbed routes and all discovered namespace names; plugin route inventories were not exhaustively audited.

## 2. Exact observed fields

Post top-level keys:

`id, date, date_gmt, guid, modified, modified_gmt, slug, status, type, link, title, content, excerpt, author, featured_media, comment_status, ping_status, sticky, template, format, meta, categories, tags, class_list, aioseo_notices, aioseo_head, aioseo_head_json, aioseo_meta_data, aioseo_breadcrumb, aioseo_breadcrumb_json, amp_enabled, _links, _embedded`

`title.rendered`, `content.rendered`, `excerpt.rendered` contain HTML/entity-encoded text. Content/excerpt expose `protected`. Dates include source-local and GMT fields; normalization uses GMT explicitly. Categories/tags are IDs; embedded terms supply labels, slugs and taxonomy. `guid.rendered` is retained in the raw fixture but is not used as the canonical article URL.

Observed `meta` keys:

`om_disable_all_campaigns, _monsterinsights_skip_tracking, _uf_show_specific_survey, _uf_disable_surveys, footnotes`

Taxonomy rows expose `id,count,description,link,name,slug,taxonomy,meta,_links` and AIOSEO fields; categories additionally have `parent`. Media exposes `source_url,alt_text,caption,description,media_type,mime_type,media_details,post,filename,filesize` alongside standard identity/date/SEO fields. `media_details.sizes` records file, width, height, MIME type and source URL. The recursive field inventory is in `wordpress/observed-fields.json`.

## 3. Unavailable or unproven data

Author ID is public; author profile/name is unavailable through the tested public users routes. No edit-context raw content, private posts, private metadata or protected templates were requested. No explicit live-stream URL, programme schedule, Shorts collection or news-specific metadata was discovered. Twenty recent posts were all `format=standard`, with no inline images, galleries or video/iframe content in that sample. This is not a sitewide absence claim. The home page contains builder imagery; the contact page links a YouTube channel, which does not establish a live feed.

## 4. Types and taxonomies

Types: `post`, `page`, `attachment`, `nav_menu_item`, `wp_block`, `wp_template`, `wp_template_part`, `wp_global_styles`, `wp_navigation`, `wp_font_family`, `wp_font_face`, `e-floating-buttons`, `elementor_library`.

Taxonomies: `category`, `post_tag`, `nav_menu`, `wp_pattern_category`. No custom editorial taxonomy or dedicated news/video/Shorts post type was exposed in this list.

## 5. SEO

All in One SEO (AIOSEO Pro) data is exposed. No Yoast or Rank Math fields appeared in the samples.

`aioseo_head_json` keys:

`title, description, canonical_url, robots, keywords, webmasterTools, schema, og:locale, og:site_name, og:type, og:title, og:description, og:url, og:image, og:image:secure_url, og:image:width, og:image:height, article:published_time, article:modified_time, article:publisher, twitter:card, twitter:site, twitter:title, twitter:description, twitter:creator, twitter:image`

`aioseo_meta_data` keys:

`SEO_om_disable_all_campaigns, _monsterinsights_skip_tracking, _uf_show_specific_survey, _uf_disable_surveys, footnotes`

Source SEO includes English `og:locale=en_US` / schema `inLanguage=en-US` despite Hindi articles. Raw values are preserved for provenance, not applied to the `.com` editions. Normalized Hindi language comes from the explicit publisher configuration. Source HTML SEO is never executed. The isolated preview emits `noindex,nofollow` and is excluded from the sitemap; edition SEO remains intact.

## 6. Media behavior

Direct source upload URLs work in the browser. An image HEAD request carrying `.com` Origin/Referer returned 200 WebP from Hostinger/hcdn with ETag, Last-Modified, Accept-Ranges and `Cache-Control: public,max-age=31557600`. No Access-Control-Allow-Origin was observed: normal image rendering works without it; canvas/export workflows would need separate CORS consideration. This verifies current behavior, not a future hotlinking guarantee.

Observed original: 1200×675 WebP, about 198 KB. Responsive derivatives include 300×169, 768×432 and 1024×576, plus thumbnail/theme sizes. The API supplies the ingredients for srcset, not a direct featured-image srcset string. The preview chooses the 1024px `large` derivative when present, otherwise the original; all sizes remain normalized for later responsive selection. No proxy, image download or duplicated source media was introduced. Source upload paths appear durable but deletion/replacement remains possible; failed images show a neutral local placeholder. A controlled optimizer/CDN can be evaluated later using actual traffic and image metrics.

## 7. Files created or changed

Created:
- `lib/wordpress/{types,html,normalize,client,preview}.ts`
- `app/source-preview/layout.tsx`, `page.tsx`, `[id]/page.tsx`, `source-preview.css`
- `components/editorial-image.tsx`, `public/images/source-unavailable.svg`
- `scripts/{test-wordpress,wordpress-test-loader,check-wordpress-preview}.mjs`
- `tests/fixtures/wordpress-posts.json`
- This report and `docs/wordpress/` audit evidence.

Changed: `components/hero.tsx` and `components/article-card.tsx` delegate images to the shared wrapper; existing local-image behavior is retained. `.env.example`, `package.json`, `package-lock.json`, and `README.md` document/configure the source mode and tests. `htmlparser2` is a server-side HTML parser dependency. Frozen route/content/SEO files and edition styles were not edited.

## 8–9. Raw and normalized models

`WPPost`, `WPRendered`, `WPTerm`, `WPMedia`, `WPImageSize`, `WPLink`, `WPError` describe observed raw shapes with unknown/optional extension fields. The optional `WPAuthor` interface supports future returned author data; it does not imply that profiles were accessible. Runtime validation accepts unknown input rather than trusting TypeScript casts.

`SourceStory` preserves source ID/URL/slug/status, `titleHindi`, raw HTML/excerpt, parsed text paragraphs, UTC publication/modification times, nullable author data, taxonomy relationships, featured image and responsive sizes, inline image/srcset references, inert embeds/gallery IDs, original embedded metadata, SEO, custom fields and warnings. Raw source HTML is retained server-side; only escaped text is rendered in this phase.

`SharedStoryIdentity` uses `wp:apexnewsindia.in:{id}` and contains `sourcePostId`, `sourceRevision=modifiedAt`, `modifiedAt`, `lastSyncedAt`, `syncStatus="source-fetched"`, `englishVersion=null`, `romanHindiVersion=null`. Last sync means this fetch/normalization time, not a persisted sync job. No translations or database were created.

An ephemeral `previewArticle` projection feeds the existing `ApexArticle` component contract. Its English locale selects interface chrome only; source text remains Hindi with `lang="hi"`, and both temporary alternate paths stay in `/source-preview/{id}`. Original category data remains intact; the projection maps known categories into the existing generic UI categories. Neither edition's content adapter is replaced.

## 10–11. Real articles and rendering

Initial fixture IDs: **13373, 13337, 13341, 13345, 13351, 12724**. Includes the Kashi–Vadnagar bike journey, PM birthday coverage, Aligarh, Bareilly, Barabanki and BRICS reporting.

Final live integration IDs on 18 September: **13442, 13444, 13448, 13450, 13452, 13454**. All six detail routes passed. Live content naturally changes between runs. The first article preserves publication `2026-09-18T06:49:14.000Z` and modification `2026-09-18T06:53:09.000Z`, displayed in IST.

Verified existing hero (all three slides), lead/standard cards, source relationship list and article detail with original Hindi title/excerpt/body, direct featured image, category labels, author ID/unavailable state and both timestamps. Temporary Hindi typography adjustments are scoped strictly to the preview. No source scripts or iframe players execute.

## 12. Error and fallback behavior

The client pins HTTPS source origin, performs GET only, rejects redirects, uses a six-second timeout per attempt, caps the response at 4 MB and fetches at most six posts. At most one bounded retry handles network/timeout/5xx failures. Rate limits honor short Retry-After values; long windows immediately fall back rather than retrying early. No credentials are read or sent.

Malformed/non-public/protected posts are rejected; malformed individual rows can be skipped with warnings. Invalid JSON, non-JSON responses, empty results and invalid dates/identities are typed failures. Missing authors/categories retain source IDs with explicit nulls/warnings. Missing/deleted media uses the neutral placeholder. HTML parsing tolerates malformed markup, blocks executable content and leaves media references inert. Disabled mode and source failures render clearly labeled existing mock content; a failed detail never pretends a mock is the requested source article. Deleted/invalid article IDs return 404.

One live verification initially received fallback during a temporary source request failure; a subsequent run fetched live data and passed. This dependency can still fail at runtime; the result is not evidence of guaranteed source uptime.

## 13–16. Validation

- `npm run build`: PASS, Next.js production build.
- `npm run lint`: PASS, no warnings or errors after explicit image alt propagation.
- `npm run typecheck`: PASS.
- `npm run test:wordpress`: **117 assertions PASS**, including malformed data, media/author/category absence, HTML/URL handling, retries, timeouts, rate limiting and response limits.
- `npm run check:editions`: **335 assertions PASS across 20 pages**.
- `npm run check:wordpress`: **50 assertions PASS**, including six live details, disabled fallback, preview noindex, unchanged indexable editions, invalid IDs and sitemap exclusion.
- Browser: source homepage/all three live hero slides and article detail checked at **1600, 1440, 1280, 768, 390, 320px**. No horizontal overflow or clipped hero/detail headings, no broken loaded images; captured browser error/warning log empty, no hydration errors observed. Desktop/mobile visuals inspected. This is targeted integration validation, not a guarantee against all future content lengths.

## 17. Later WordPress-side access

None is required for this phase. If author biographies/bylines, private editorial fields, stream configuration or custom workflows are required later, first agree the public schema with the publisher. Public author exposure may require a narrowly scoped source-side change. No credentials or plugin installations were requested. Do not interpret hidden builder templates as a reason to request admin access.

## 18. Recommended next phase (not implemented)

After review: persist source snapshots and stable story identities; track revision changes; add separate versioned English/Roman Hindi records; introduce translation with provenance and editorial review; define correction/deletion/unpublish semantics and idempotent sync; then feed approved localized records through the existing locale adapter and SEO contracts. Media identity should remain shared. Translation, automatic publishing and deployment require a separate authorized phase.
