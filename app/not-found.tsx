import Link from "next/link";
import { headers } from "next/headers";
import { isLocale } from "@/lib/locales";
export default async function NotFound() {
  const segment = (await headers()).get("x-apex-locale");
  const locale = isLocale(segment) ? segment : "en";
  return (
    <main className="shell not-found">
      <span className="eyebrow">APEX / 404</span>
      <h1>
        {locale === "en"
          ? "This story could not be found."
          : "Yeh khabar yahan nahi mili."}
      </h1>
      <p>
        {locale === "en"
          ? "There is more to explore in the newsroom."
          : "Newsroom mein aur bhi bahut kuch hai."}
      </p>
      <Link href={`/${locale}`} className="primary-button">
        {locale === "en" ? "Back to newsroom →" : "Newsroom mein wapas →"}
      </Link>
    </main>
  );
}
