import { notFound, permanentRedirect } from "next/navigation";
import { getArticle } from "@/lib/cms";
// Preserve original Roman Hindi article links with an unambiguous permanent redirect.
export default async function LegacyArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle("roman", slug);
  if (!article) notFound();
  permanentRedirect(article.alternatePaths.roman);
}
