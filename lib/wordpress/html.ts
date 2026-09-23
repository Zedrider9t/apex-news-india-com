import { Parser } from "htmlparser2";
export const SOURCE_ORIGIN = "https://apexnewsindia.in";
export function safeUrl(value: unknown, base = SOURCE_ORIGIN): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function sourceImageUrl(value: unknown): string | null {
  const href = safeUrl(value);
  if (!href) return null;
  const url = new URL(href);
  return url.origin === SOURCE_ORIGIN &&
    url.pathname.startsWith("/wp-content/uploads/") &&
    /\.(?:webp|jpe?g|png|gif|avif)$/i.test(url.pathname)
    ? href
    : null;
}
/** Parse tolerant HTML into escaped React text and inert references. Never execute/render source HTML. */
export function inspectHtml(html: string) {
  const paragraphs: string[] = [],
    images: Array<{ url: string; alt: string; srcset: string | null }> = [],
    embeds: Array<{
      type: "iframe" | "video" | "audio" | "source";
      url: string;
    }> = [];
  const galleries: Array<{ attachmentIds: number[] }> = [];
  let text = "",
    blocked = 0;
  const blockedTags = new Set(["script", "style", "noscript", "template"]);
  const blocks = new Set([
    "p",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "blockquote",
    "br",
    "figcaption",
    "tr",
  ]);
  const flush = () => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) paragraphs.push(clean);
    text = "";
  };
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (blockedTags.has(name)) blocked++;
        if (blocked) return;
        if (blocks.has(name)) flush();
        if (name === "img") {
          const url = safeUrl(attrs.src || attrs["data-src"]);
          if (url)
            images.push({
              url,
              alt: attrs.alt || "",
              srcset: attrs.srcset || null,
            });
        }
        if (
          name === "iframe" ||
          name === "video" ||
          name === "audio" ||
          name === "source"
        ) {
          const url = safeUrl(attrs.src);
          if (url) embeds.push({ type: name, url });
        }
      },
      ontext(value) {
        if (!blocked) text += value;
      },
      onclosetag(name) {
        if (blockedTags.has(name)) blocked = Math.max(0, blocked - 1);
        if (!blocked && blocks.has(name)) flush();
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  flush();
  for (const match of html.matchAll(
    /\[gallery\b[^\]]*\bids=["']([\d,\s]+)["'][^\]]*\]/gi,
  ))
    galleries.push({
      attachmentIds: match[1]
        .split(",")
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    });
  for (const match of html.matchAll(/<!--\s*wp:gallery\s+(\{[^]*?\})\s*-->/g)) {
    try {
      const value: unknown = JSON.parse(match[1]);
      if (
        value &&
        typeof value === "object" &&
        "ids" in value &&
        Array.isArray(value.ids)
      )
        galleries.push({
          attachmentIds: value.ids.filter(
            (id): id is number =>
              typeof id === "number" && Number.isSafeInteger(id) && id > 0,
          ),
        });
    } catch {
      /* malformed block metadata stays raw, never evaluated */
    }
  }
  return { paragraphs, images, embeds, galleries };
}
export const plainText = (html: string) =>
  inspectHtml(html).paragraphs.join(" ");
