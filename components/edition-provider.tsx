"use client";
import { createContext, useContext } from "react";
import type { Category, Locale } from "@/lib/types";
import { getTranslator } from "@/lib/messages";
const EditionContext = createContext<{
  locale: Locale;
  categoryLabels: Record<Category, string>;
} | null>(null);
export function EditionProvider({
  locale,
  categoryLabels,
  children,
}: {
  locale: Locale;
  categoryLabels: Record<Category, string>;
  children: React.ReactNode;
}) {
  return (
    <EditionContext.Provider value={{ locale, categoryLabels }}>
      {children}
    </EditionContext.Provider>
  );
}
export function useEdition() {
  const edition = useContext(EditionContext);
  if (!edition)
    throw new Error("Edition UI must be rendered inside EditionProvider");
  return {
    ...edition,
    t: getTranslator(edition.locale),
    categoryLabel: (id: Category) => edition.categoryLabels[id],
  };
}
