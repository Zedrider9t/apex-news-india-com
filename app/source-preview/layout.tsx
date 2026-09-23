import type { Metadata } from "next";
import { EditionProvider } from "@/components/edition-provider";
import { editionCopy } from "@/lib/mock-content";
import type { Category } from "@/lib/types";
import "./source-preview.css";
export const metadata: Metadata = {
  title: "WordPress source integration preview | Apex",
  robots: { index: false, follow: false },
};
export default function SourcePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const labels = Object.fromEntries(
    Object.entries(editionCopy.en.categories).map(([key, value]) => [
      key,
      value.label,
    ]),
  ) as Record<Category, string>;
  return (
    <EditionProvider locale="en" categoryLabels={labels}>
      <div data-source-preview>{children}</div>
    </EditionProvider>
  );
}
