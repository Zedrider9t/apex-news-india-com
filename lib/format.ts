import type { Locale } from "./types";
const months = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ],
  roman: [
    "Janvari",
    "Farvari",
    "Maarch",
    "April",
    "Mai",
    "June",
    "Julai",
    "Agast",
    "Sitambar",
    "October",
    "Navambar",
    "Disambar",
  ],
} as const;
export function formatPublishedDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()))
    return locale === "en" ? "Date unavailable" : "Tareekh uplabdh nahi";
  const parts = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${months[locale][Number(part("month")) - 1]} ${part("year")}`;
}
