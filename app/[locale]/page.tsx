import { notFound } from "next/navigation";
import { Newsroom } from "@/components/newsroom";
import { getEditionContent } from "@/lib/mock-content";
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
  return <Newsroom key={locale} {...getEditionContent(locale)} />;
}
