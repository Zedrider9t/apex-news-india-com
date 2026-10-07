import { plainText } from "../wordpress/html";
import { canonical } from "./revisions";
import { planHtml, renderHtml, structure, type LocalizationPlan } from "./html";
import type {
  TranslationLocale,
  ValidationIssue,
  ValidationResult,
} from "./types";
export const VALIDATOR_VERSION = "apex-translation-checks-v4";

const hindiNumberWords: Record<string, string> = {
  "शून्य": "0",
  "एक": "1",
  "दो": "2",
  "तीन": "3",
  "चार": "4",
  "पांच": "5",
  "पाँच": "5",
  "छह": "6",
  "सात": "7",
  "आठ": "8",
  "नौ": "9",
  "दस": "10",
  "ग्यारह": "11",
  "बारह": "12",
  "तेरह": "13",
  "चौदह": "14",
  "पंद्रह": "15",
  "पन्द्रह": "15",
  "सोलह": "16",
  "सत्रह": "17",
  "अठारह": "18",
  "उन्नीस": "19",
  "बीस": "20",
  "इक्कीस": "21",
  "बाईस": "22",
  "तेईस": "23",
  "चौबीस": "24",
  "पच्चीस": "25",
  "छब्बीस": "26",
  "सत्ताईस": "27",
  "अट्ठाईस": "28",
  "अट्ठाइस": "28",
  "उनतीस": "29",
  "तीस": "30",
  "इकतीस": "31",
};

function digitAtom(value: string): string {
  return value.replace(/[०-९]/g, (digit) =>
    String("०१२३४५६७८९".indexOf(digit)),
  );
}

const atoms = (s: string) => {
  const values = (s.match(/[0-9०-९]+(?:[.,:/-][0-9०-९]+)*/g) ?? []).map(
    digitAtom,
  );

  // Hindi news frequently writes calendar day numbers as words (for example
  // "तीन से पांच अक्तूबर"), while natural English uses digits ("October 3 to 5").
  // Normalize only exact Hindi cardinal tokens 0–31 so the validator can
  // preserve the factual values without forcing unnatural English wording.
  const lexical = s
    .split(/[\s,.;:!?()[\]{}“”"'’‘—–/-]+/u)
    .map((token) => hindiNumberWords[token])
    .filter((value): value is string => Boolean(value));

  return [...values, ...lexical].sort();
};
const urls = (s: string) => (s.match(/https?:\/\/[^\s<>"“”]+/g) ?? []).sort();
const quoteMarks = (s: string) => (s.match(/[“”«»"]/g) ?? []).map(() => "\"");
export function validateTranslation(
  plan: LocalizationPlan,
  translations: Record<string, string>,
  locale: TranslationLocale,
  initial: ValidationIssue[] = [],
  confidence = 1,
  providerWarnings: string[] = [],
): ValidationResult {
  const issues = [...initial, ...plan.body.issues, ...plan.excerpt.issues];
  const add = (
    code: string,
    severity: "error" | "warning",
    message: string,
    segmentId?: string,
  ) => issues.push({ code, severity, message, segmentId });
  for (const s of plan.segments) {
    const output = translations[s.id] ?? "";
    if (s.text.trim() && !output.trim())
      add(
        "blank_segment",
        "error",
        "A non-empty source segment has no localized text",
        s.id,
      );
    if (canonical(atoms(s.text)) !== canonical(atoms(output)))
      add("number_mismatch", "error", "Numbers/date components changed", s.id);
    if (canonical(urls(s.text)) !== canonical(urls(output)))
      add("url_mismatch", "error", "Text URLs changed", s.id);
    if (canonical(quoteMarks(s.text)) !== canonical(quoteMarks(output)))
      add("quote_mismatch", "error", "Quotation markers changed", s.id);
    if (
      /<\/?[a-z!][^>]*>/i.test(output) ||
      /```|\*\*|(?:^|\n)#{1,6}\s|\[[^\]]+\]\(https?:/m.test(output)
    )
      add(
        "markup_in_text",
        "error",
        "Provider introduced HTML or Markdown into a text node",
        s.id,
      );
    // Code, source URLs and inert shortcodes are intentional unchanged material.
    const prose = output.replace(/https?:\/\/\S+|\[[^\]]+\]/g, "");
    if (/[\u0900-\u097f]/.test(prose))
      add(
        "untranslated_devanagari",
        "warning",
        `${locale === "en" ? "English" : "Roman Hindi"} contains unexplained Devanagari`,
        s.id,
      );
    const ratio = output.trim().length / Math.max(1, s.text.trim().length);
    if (s.text.trim().length > 35 && (ratio < 0.45 || ratio > 3.8))
      add(
        "length_ratio",
        "warning",
        `Suspicious text length ratio ${ratio.toFixed(2)}`,
        s.id,
      );
    if (
      /आरोप|दावा|कथित|के अनुसार|के मुताबिक|संभावना|हो सकता|बताया|कहा/.test(
        s.text,
      )
    ) {
      const signals =
        locale === "en"
          ? /alleg|claim|report|according|may|might|could|expect|said|says|told|stated|assert|possib|accus|suspect/i
          : /aarop|arop|daav|dava|daawa|kathit|anusaar|anusar|mutabik|sambhav|sakta|saktaa|bataya|kaha|report|claim/i;
      if (!signals.test(output))
        add(
          "attribution_review",
          "warning",
          "Attribution or uncertainty wording may have been lost",
          s.id,
        );
    }
  }
  if (!translations.title?.trim())
    add("blank_title", "error", "Title is blank");
  const body = renderHtml(plan.body.nodes, translations);
  if (!plainText(body).trim())
    add("blank_body", "error", "Article body is blank");
  const parsed = planHtml(body);
  if (
    canonical(structure(plan.body.nodes)) !== canonical(structure(parsed.nodes))
  )
    add(
      "html_structure",
      "error",
      "HTML tags, image references, embeds, URLs or attributes changed",
    );
  if (confidence < 0.9)
    add(
      "low_confidence",
      "warning",
      `Provider confidence ${confidence}; editorial review required`,
    );
  for (const warning of providerWarnings)
    add("provider_warning", "warning", warning);
  if (
    /प्रधानमंत्री|मंत्री|चुनाव|सरकार|राजनीति|पुलिस|हत्या|आरोप|अदालत|बलात्कार|आतंक|स्वास्थ्य/.test(
      plan.source.titleHindi + " " + plan.source.contentText.join(" "),
    )
  )
    add(
      "sensitive_news",
      "warning",
      "Political, legal, health or sensitive reporting requires source-by-source editorial review",
    );
  add(
    "semantic_review",
    "warning",
    "Automated checks cannot prove factual equivalence or verify every proper name. Human bilingual review is required before readiness.",
  );
  return {
    passed: !issues.some((i) => i.severity === "error"),
    issues,
    checkedAt: new Date().toISOString(),
    validatorVersion: VALIDATOR_VERSION,
  };
}
