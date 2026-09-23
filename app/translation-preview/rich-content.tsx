import { createElement, type ReactNode } from "react";
import { planHtml, type HtmlNode } from "@/lib/localization/html";
/** Render the sanitized tree as React elements. Embeds remain inert links in development. */
export function RichContent({ html }: { html: string }) {
  function render(nodes: HtmlNode[]): ReactNode {
    return nodes.map((node, index) => {
      if (node.type === "comment") return null;
      if (node.type === "text") return node.text;
      if (["iframe", "video", "audio", "source", "track"].includes(node.tag))
        return (
          <p className="translation-embed" key={index}>
            Preserved {node.tag} reference:{" "}
            {node.attrs.src ? (
              <a href={node.attrs.src} rel="noreferrer">
                {node.attrs.src}
              </a>
            ) : (
              "no source URL"
            )}
          </p>
        );
      const attrs: Record<string, string | number> = { key: index };
      // Stored IDs/classes stay in localized HTML; preview does not apply publisher CSS or DOM IDs.
      for (const key of [
        "href",
        "src",
        "alt",
        "title",
        "colspan",
        "rowspan",
        "start",
        "datetime",
      ])
        if (node.attrs[key])
          attrs[
            key === "colspan"
              ? "colSpan"
              : key === "rowspan"
                ? "rowSpan"
                : key === "datetime"
                  ? "dateTime"
                  : key
          ] = node.attrs[key];
      if (node.tag === "img") {
        attrs.loading = "lazy";
        attrs.referrerPolicy = "no-referrer";
        attrs.alt = node.attrs.alt ?? "";
        return createElement("img", attrs);
      }
      if (node.tag === "a") attrs.rel = "noreferrer";
      return createElement(
        node.tag,
        attrs,
        ...(["br", "hr"].includes(node.tag) ? [] : [render(node.children)]),
      );
    });
  }
  return <div className="translation-rich">{render(planHtml(html).nodes)}</div>;
}
