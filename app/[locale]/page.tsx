import { notFound } from "next/navigation";
import { Newsroom } from "@/components/newsroom";
import { getEditionContent } from "@/lib/mock-content";
import { getHomepageArticles } from "@/lib/cms";
import { isLocale } from "@/lib/locales";
import { homeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return homeMetadata(locale);
}

export default async function EditionHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const edition = getEditionContent(locale);
  const articles = await getHomepageArticles(locale);

  return (
    <Newsroom
      key={locale}
      {...edition}
      articles={articles}
    />
  );
}
