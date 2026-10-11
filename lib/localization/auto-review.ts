import type { SourceStory } from "../wordpress/types";

export type AutoReviewDecision =
  | { eligible: true; reason: "low_risk_clean" }
  | { eligible: false; reason: string };

const LOW_RISK_CATEGORIES = new Set([
  "business",
  "कारोबार",
  "व्यापार",
  "sports",
  "sport",
  "खेल",
  "entertainment",
  "मनोरंजन",
  "technology",
  "tech",
  "टेक्नोलॉजी",
]);

const SENSITIVE_TERMS = [
  /\b(election|elections|vote|voting|poll|ballot|candidate|minister|government|parliament|assembly|court|supreme court|high court|judge|petition|police|crime|murder|killing|arrest|custody|rape|terror|military|army|border|war|communal|religion|religious|mosque|temple|church|health|disease|hospital|medicine|vaccine|death|suicide|allegation|fraud|scam)\b/i,
  /(चुनाव|मतदान|वोट|उम्मीदवार|मंत्री|सरकार|संसद|विधानसभा|अदालत|सुप्रीम कोर्ट|हाई कोर्ट|न्यायालय|जज|याचिका|पुलिस|अपराध|हत्या|गिरफ्तार|हिरासत|बलात्कार|आतंक|सेना|सीमा|युद्ध|सांप्रदायिक|धर्म|धार्मिक|मस्जिद|मंदिर|चर्च|स्वास्थ्य|बीमारी|अस्पताल|दवा|वैक्सीन|मौत|आत्महत्या|आरोप|धोखाधड़ी|घोटाला)/u,
];

function normalizedCategoryValues(story: SourceStory): string[] {
  return story.categories.flatMap((category) =>
    [category.name, category.slug]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim().toLowerCase()),
  );
}

export function assessAutoApproval(story: SourceStory): AutoReviewDecision {
  if (story.warnings.length)
    return { eligible: false, reason: "source_warnings" };

  const categories = normalizedCategoryValues(story);
  if (!categories.some((value) => LOW_RISK_CATEGORIES.has(value)))
    return { eligible: false, reason: "category_requires_human_review" };

  const text = [
    story.titleHindi,
    story.excerptText,
    ...story.contentText.slice(0, 20),
  ]
    .join(" ")
    .slice(0, 12000);

  if (SENSITIVE_TERMS.some((pattern) => pattern.test(text)))
    return { eligible: false, reason: "sensitive_topic" };

  return { eligible: true, reason: "low_risk_clean" };
}
