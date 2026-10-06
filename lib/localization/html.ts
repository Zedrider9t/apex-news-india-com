import { Parser } from "htmlparser2";
import type { SourceStory } from "../wordpress/types";
import type { TranslationLocale, TextSegment, ValidationIssue } from "./types";
import { GLOSSARY } from "./glossary";
export type HtmlNode =
  | { type: "comment"; text: string }
  | { type: "text"; text: string; segmentId?: string }
  | {
      type: "element";
      tag: string;
      attrs: Record<string, string>;
      attributeSegments: Record<string, string>;
      children: HtmlNode[];
    };
export interface DocumentPlan {
  nodes: HtmlNode[];
  segments: TextSegment[];
  issues: ValidationIssue[];
}
const tags = new Set(
  "p div span section article h1 h2 h3 h4 h5 h6 a img figure figcaption blockquote ul ol li strong b em i u s del ins br hr table thead tbody tfoot tr td th caption sup sub pre code iframe video audio source track picture time".split(
    " ",
  ),
);
const voids = new Set(["img", "br", "hr", "source", "track"]);
const discard = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "object",
  "embed",
  "link",
  "meta",
  "base",
]);
const common = new Set([
  "id",
  "class",
  "title",
  "lang",
  "dir",
  "role",
  "aria-label",
]);
const perTag: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"],
  iframe: ["src", "title", "width", "height", "allowfullscreen"],
  video: ["src", "poster", "controls", "width", "height", "preload"],
  audio: ["src", "controls", "preload"],
  source: ["src", "srcset", "type", "media", "sizes"],
  track: ["src", "kind", "srclang", "label"],
  ol: ["start", "type", "reversed"],
  li: ["value"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  time: ["datetime"],
  blockquote: ["cite"],
};
export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
function safeReference(value: string): boolean {
  if (/[\u0000-\u0020\\]/.test(value)) return false;
  try {
    const u = new URL(value, "https://apexnewsindia.in");
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
function safeSrcset(s: string): boolean {
  return s.split(",").every((part) => {
    const [url, size, ...rest] = part.trim().split(/\s+/);
    return (
      !!url &&
      safeReference(url) &&
      !rest.length &&
      (!size || /^\d+(?:\.\d+)?[wx]$/.test(size))
    );
  });
}
/** Parse to an allowlisted tree, retain safe URLs/attributes, never evaluate WP HTML/shortcodes. */
export function planHtml(html: string, prefix = "body"): DocumentPlan {
  if (html.length > 1_000_000)
    throw new Error("HTML exceeds localization limit");
  const root: HtmlNode[] = [];
  const stack: Array<{ tag: string; children: HtmlNode[]; blocked: boolean }> =
    [];
  const segments: TextSegment[] = [];
  const issues: ValidationIssue[] = [];
  const warn = (message: string) =>
    issues.push({
      code: "source_html_sanitized",
      severity: "warning",
      message,
    });
  const add = (text: string, context: string) => {
    const id = `${prefix}.${segments.length}`;
    segments.push({ id, text, context });
    return id;
  };
  const parser = new Parser(
    {
      onopentag(tag, raw) {
        const blocked = !!stack.at(-1)?.blocked || discard.has(tag);
        const parent = stack.at(-1)?.children ?? root;
        if (blocked) {
          if (!stack.at(-1)?.blocked) warn(`Removed unsafe ${tag} element`);
          stack.push({ tag, children: [], blocked: true });
          return;
        }
        if (!tags.has(tag)) {
          warn(`Unwrapped unsupported ${tag} element`);
          stack.push({ tag, children: parent, blocked: false });
          return;
        }
        const node: Extract<HtmlNode, { type: "element" }> = {
          type: "element",
          tag,
          attrs: {},
          attributeSegments: {},
          children: [],
        };
        for (const [key, value] of Object.entries(raw)) {
          if (!common.has(key) && !(perTag[tag] ?? []).includes(key)) {
            warn(`Removed ${tag}.${key}`);
            continue;
          }
          if (
            ["href", "src", "poster", "cite"].includes(key) &&
            !safeReference(value)
          ) {
            warn(`Removed unsafe ${tag}.${key}`);
            continue;
          }
          if (key === "srcset" && !safeSrcset(value)) {
            warn("Removed unsafe srcset");
            continue;
          }
          node.attrs[key] = value;
          if (
            ["alt", "title", "aria-label", "label"].includes(key) &&
            value.trim()
          )
            node.attributeSegments[key] = add(value, `${tag}@${key}`);
        }
        if (tag === "a" && node.attrs.target === "_blank")
          node.attrs.rel = "noopener noreferrer";
        if (tag === "iframe") node.attrs.sandbox = "";
        parent.push(node);
        stack.push({ tag, children: node.children, blocked: false });
      },
      ontext(text) {
        if (stack.at(-1)?.blocked) return;
        const context = stack.at(-1)?.tag ?? "text";
        const children = stack.at(-1)?.children ?? root;
        // Entity decoding can emit several ontext callbacks for one DOM text node.
        const previous = children.at(-1);
        const node: Extract<HtmlNode, { type: "text" }> =
          previous?.type === "text" ? previous : { type: "text", text: "" };
        node.text += text;
        if (node.segmentId) {
          segments.find((s) => s.id === node.segmentId)!.text = node.text;
        } else if (
          node.text.trim() &&
          !stack.some((n) => n.tag === "code" || n.tag === "pre")
        )
          node.segmentId = add(node.text, context);
        if (node !== previous) children.push(node);
      },
      onclosetag() {
        stack.pop();
      },
      oncomment(text) {
        if (stack.at(-1)?.blocked) return;
        if (text.includes("--")) {
          warn("Removed malformed HTML comment");
          return;
        }
        (stack.at(-1)?.children ?? root).push({ type: "comment", text });
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  return { nodes: root, segments, issues };
}
export function renderHtml(
  nodes: HtmlNode[],
  translations: Record<string, string> = {},
): string {
  return nodes
    .map((n) => {
      if (n.type === "comment") return `<!--${n.text}-->`;
      if (n.type === "text")
        return escapeHtml(
          n.segmentId ? (translations[n.segmentId] ?? n.text) : n.text,
        );
      const attrs = Object.entries(n.attrs)
        .map(
          ([k, v]) =>
            ` ${k}="${escapeHtml(n.attributeSegments[k] ? (translations[n.attributeSegments[k]] ?? v) : v)}"`,
        )
        .join("");
      return (
        `<${n.tag}${attrs}>` +
        (voids.has(n.tag)
          ? ""
          : renderHtml(n.children, translations) + `</${n.tag}>`)
      );
    })
    .join("");
}
export function structure(nodes: HtmlNode[]): unknown {
  return nodes.map((n) =>
    n.type === "comment"
      ? { comment: n.text }
      : n.type === "text"
        ? { text: true }
        : {
            tag: n.tag,
            attrs: Object.fromEntries(
              Object.entries(n.attrs).filter(
                ([k]) => !["alt", "title", "aria-label", "label"].includes(k),
              ),
            ),
            children: structure(n.children),
          },
  );
}
export interface LocalizationPlan {
  body: DocumentPlan;
  excerpt: DocumentPlan;
  segments: TextSegment[];
  source: SourceStory;
}
export function makePlan(source: SourceStory): LocalizationPlan {
  const body = planHtml(source.rawContentHtml),
    excerpt = planHtml(source.rawExcerpt, "excerpt");
  const segments: TextSegment[] = [
    { id: "title", text: source.titleHindi, context: "headline" },
    ...excerpt.segments,
    ...body.segments,
    ...source.categories
      .filter((t) => t.name)
      .map((t) => ({
        id: `category.${t.id}`,
        text: t.name!,
        context: "category",
      })),
    ...source.tags
      .filter((t) => t.name)
      .map((t) => ({ id: `tag.${t.id}`, text: t.name!, context: "tag" })),
  ];
  if (
    segments.length > 800 ||
    segments.reduce((n, s) => n + s.text.length, 0) > 120_000
  )
    throw new Error("Article exceeds bounded development localization limit");
  return { body, excerpt, segments, source };
}
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export interface ProtectedPlan {
  segments: TextSegment[];
  tokens: Record<string, Record<string, string>>;
}
/** Protect literals and known entities before sending text; restoration is per segment. */
export function protectSegments(
  segments: TextSegment[],
  locale: TranslationLocale,
): ProtectedPlan {
  const tokens: ProtectedPlan["tokens"] = {};
  const glossary = Object.keys(GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  const pattern = new RegExp(
    `https?:\\/\\/[^\\s<>"“”]+|\\[[^\\]\\n]+\\]|[0-9०-९]+(?:[.,:/-][0-9०-९]+)*|[₹$€£%“”«»"]|(?<![\\p{L}\\p{M}])(?:${glossary})(?![\\p{L}\\p{M}])|[A-Za-z][A-Za-z._-]*(?: [A-Z][A-Za-z._-]*)*`,
    "gu",
  );
  return {
    tokens,
    segments: segments.map((segment) => {
      if (segment.text.includes("__APX_"))
        throw new Error("Reserved localization token in source");
      const map: Record<string, string> = {};
      tokens[segment.id] = map;
      const text = segment.text.replace(pattern, (match) => {
        const token = `__APX_${Object.keys(map).length}__`;
        map[token] = GLOSSARY[match]?.[locale] ?? match;
        return token;
      });
      return { ...segment, text, protectedLiterals: map };
    }),
  };
}
export function restoreSegments(
  protectedPlan: ProtectedPlan,
  rows: Array<{ id: string; text: string }>,
): { translations: Record<string, string>; issues: ValidationIssue[] } {
  const translations: Record<string, string> = {};
  const issues: ValidationIssue[] = [];
  const expected = new Set(protectedPlan.segments.map((s) => s.id));
  const seen = new Set<string>();
  for (const row of rows) {
    if (!expected.has(row.id) || seen.has(row.id)) {
      issues.push({
        code: "segment_identity",
        severity: "error",
        segmentId: row.id,
        message: "Unknown or duplicate text segment",
      });
      continue;
    }
    seen.add(row.id);
    let text = row.text;
    const map = protectedPlan.tokens[row.id];
    const order = text.match(/__APX_\d+__/g) ?? [];
    if (order.join("|") !== Object.keys(map).join("|"))
      issues.push({
        code: "literal_order",
        severity: "warning",
        segmentId: row.id,
        message:
          "Protected values changed order; verify factual number/date/entity associations during editorial review",
      });
    for (const [token, value] of Object.entries(map)) {
      if (text.split(token).length - 1 !== 1)
        issues.push({
          code: "protected_literal",
          severity: "error",
          segmentId: row.id,
          message: `A protected number, date, entity, URL or quotation marker was changed (${token})`,
        });
      text = text.split(token).join(value);
    }
    if (/__APX_/.test(text))
      issues.push({
        code: "unexpected_token",
        severity: "error",
        segmentId: row.id,
        message: "Unexpected protected token",
      });
    translations[row.id] = text;
  }
  for (const id of expected)
    if (!seen.has(id))
      issues.push({
        code: "missing_segment",
        severity: "error",
        segmentId: id,
        message: "Translation omitted a text segment",
      });
  return { translations, issues };
}
