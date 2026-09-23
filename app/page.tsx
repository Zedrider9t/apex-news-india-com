import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { preferenceCookie, preferredLocale } from "@/lib/locales";
export default async function EntryPage() {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  redirect(
    `/${preferredLocale(cookieStore.get(preferenceCookie)?.value, requestHeaders.get("accept-language") ?? "")}`,
  );
}
