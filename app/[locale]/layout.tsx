import { notFound } from "next/navigation";
import { isLocale } from "@/lib/locales";
import { EditionProvider } from "@/components/edition-provider";
import { editionCopy } from "@/lib/mock-content";
export default async function EditionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const categoryLabels = Object.fromEntries(
    Object.entries(editionCopy[locale].categories).map(([id, value]) => [
      id,
      value.label,
    ]),
  ) as Record<import("@/lib/types").Category, string>;
  return (
    <EditionProvider locale={locale} categoryLabels={categoryLabels}>
      {children}
    </EditionProvider>
  );
}
