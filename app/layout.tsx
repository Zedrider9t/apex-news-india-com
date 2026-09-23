import { headers } from "next/headers";
import { isLocale, localeConfig } from "@/lib/locales";
import { siteOrigin } from "@/lib/seo";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./refinements.css";
import "./editions.css";
const display = localFont({
  src: "./fonts/barlow-condensed-bold.ttf",
  variable: "--font-display",
  weight: "700",
  display: "swap",
  fallback: ["Arial Narrow", "Arial"],
});
const body = localFont({
  src: [
    { path: "./fonts/manrope-regular.ttf", weight: "400" },
    { path: "./fonts/manrope-bold.ttf", weight: "700" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["Arial"],
});
export const metadata: Metadata = {
  metadataBase: siteOrigin,
  title: "Apex News India",
  robots: { index: true, follow: true },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requested = (await headers()).get("x-apex-locale");
  const locale = isLocale(requested) ? requested : "en";
  return (
    <html
      lang={localeConfig[locale].lang}
      className={`${display.variable} ${body.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
