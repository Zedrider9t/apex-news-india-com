import type { Metadata } from "next";
import { EditionProvider } from "@/components/edition-provider";
import { editionCopy } from "@/lib/mock-content";
import type { Category } from "@/lib/types";
import "./translation-preview.css";
export const metadata: Metadata = {
  title: "Localization review | Apex",
  robots: { index: false, follow: false },
};
export default function TranslationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categoryLabels = Object.fromEntries(
    Object.entries(editionCopy.en.categories).map(([key, value]) => [
      key,
      value.label,
    ]),
  ) as Record<Category, string>;
  return (
    <EditionProvider locale="en" categoryLabels={categoryLabels}>
      <div data-translation-preview>{children}</div>
    </EditionProvider>
  );
}
