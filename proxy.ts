import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "./lib/locales";
import { editorialAuthorized, editorialChallenge } from "./lib/editorial-auth";
// Route-owned locale header gives the root document its server-rendered lang.
// Overwrite any incoming header; preferences never override explicit URLs.
export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/editorial" ||
    request.nextUrl.pathname.startsWith("/editorial/") ||
    request.nextUrl.pathname === "/translation-preview" ||
    request.nextUrl.pathname.startsWith("/translation-preview/") ||
    request.nextUrl.pathname.startsWith("/source-preview/")
  ) {
    if (!editorialAuthorized(request.headers)) return editorialChallenge();
  }

  const segment = request.nextUrl.pathname.split("/")[1];
  const headers = new Headers(request.headers);
  headers.set("x-apex-locale", isLocale(segment) ? segment : "en");
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: [
    "/((?!api|_next|images|apex-logo.png|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
