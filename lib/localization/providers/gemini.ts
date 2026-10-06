import { createHash } from "node:crypto";
import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResponse,
  FactualVerificationRequest,
  FactualVerificationResponse,
} from "../types";
import { TranslationProviderError, TRANSLATION_RULES } from "../provider";
const schema = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["segments", "confidence", "warnings"],
  additionalProperties: false,
};
const verificationSchema = {
  type: "object",
  properties: {
    passed: { type: "boolean" },
    confidence: { type: "number" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          segmentId: { type: "string" },
          type: {
            type: "string",
            enum: [
              "number_association",
              "date",
              "name_entity",
              "attribution",
              "quote",
              "omission",
              "addition",
              "meaning",
            ],
          },
          message: { type: "string" },
          sourceEvidence: { type: "string" },
          translationEvidence: { type: "string" },
        },
        required: [
          "segmentId",
          "type",
          "message",
          "sourceEvidence",
          "translationEvidence",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["passed", "confidence", "issues"],
  additionalProperties: false,
};
function object(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
export class GeminiTranslationProvider implements TranslationProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  constructor(
    options: {
      apiKey?: string;
      model?: string;
      fetcher?: typeof fetch;
      timeoutMs?: number;
      freeTierConfirmed?: boolean;
    } = {},
  ) {
    if (typeof window !== "undefined")
      throw new TranslationProviderError(
        "configuration",
        "Translation providers are server-side only",
      );
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model =
      options.model ?? process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    if (!this.apiKey.trim())
      throw new TranslationProviderError(
        "configuration",
        "GEMINI_API_KEY is missing; no live translation request was made.",
      );
    if (!(
      options.freeTierConfirmed ??
      process.env.GEMINI_FREE_TIER_CONFIRMED === "true"
    ))
      throw new TranslationProviderError(
        "configuration",
        "Confirm the Google project has billing disabled with GEMINI_FREE_TIER_CONFIRMED=true. The API cannot enforce free-tier billing for a paid project.",
      );
    if (!/^gemini-[a-z0-9.-]+$/.test(this.model))
      throw new TranslationProviderError(
        "configuration",
        "Invalid GEMINI_MODEL",
      );
  }
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const result = await this.fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    TRANSLATION_RULES +
                    (request.locale === "roman"
                      ? "\nTarget: natural Roman Hindi for Indian readers. Keep Hindi grammar and newsroom tone in Latin script; do not translate into English and do not mechanically transliterate word-for-word. Prefer natural broadcast/news phrasing. Use established English terms only where they are normal in Indian news, such as CM, route, bike, rally, medical team. Preserve conventional proper-name spellings and all facts."
                      : "\nTarget: polished Indian newsroom English that is semantically faithful to the Hindi source. Preserve every fact, caveat, attribution, quote, date, number and named entity, but restructure sentences naturally so they read as original English journalism rather than literal translation. Do not translate Hindi idioms mechanically. Examples: 'हरी झंडी दिखाई' -> 'flagged off'; 'यात्रा निकाली गई' -> 'the rally/yatra was launched' or 'set out' depending on context; 'जानें पूरा रूट' -> 'full route and schedule'; 'दस राज्यों और सैकड़ों गांवों' -> '10 states and hundreds of villages'. Avoid awkward constructions such as 'taken out from' or 'moving with the rally'. No added background, inference or sensationalism."),
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      target: request.locale,
                      segments: request.segments.map(
                        ({ protectedLiterals: _protectedLiterals, ...segment }) =>
                          segment,
                      ),
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
              responseJsonSchema: schema,
            },
          }),
        },
      );
      const reader = result.body?.getReader();
      let raw = "";
      let bytes = 0;
      const decoder = new TextDecoder();
      if (!reader)
        throw new TranslationProviderError(
          "malformed",
          "Gemini returned an empty response",
        );
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > 2_000_000) {
          await reader.cancel();
          throw new TranslationProviderError(
            "malformed",
            "Gemini response exceeded size limit",
          );
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
      let data: Record<string, unknown>;
      try {
        data = object(JSON.parse(raw));
      } catch {
        if (result.status === 429)
          throw new TranslationProviderError(
            "quota",
            "Gemini HTTP 429; quota/rate limit response was not JSON. Stopped without retries or fallback.",
            { httpStatus: 429 },
          );
        throw new TranslationProviderError(
          "malformed",
          `Gemini HTTP ${result.status}: response was not JSON`,
        );
      }
      if (!result.ok) {
        const error = object(data.error);
        // Strip arbitrary API error messages; retain exact quota identifiers/limits without credentials or request text.
        const details = Array.isArray(error.details) ? error.details : [];
        const quota = details.flatMap((d) => {
          const x = object(d);
          return Array.isArray(x.violations)
            ? x.violations.map((v) => {
                const q = object(v);
                return Object.fromEntries(
                  ["quotaMetric", "quotaId", "quotaValue", "quotaDimensions"]
                    .filter((k) => k in q)
                    .map((k) => [k, q[k]]),
                );
              })
            : [];
        });
        const retry = details
          .map(object)
          .find((d) => typeof d.retryDelay === "string")?.retryDelay;
        const safeDetails = JSON.parse(
          JSON.stringify({
            httpStatus: result.status,
            status: typeof error.status === "string" ? error.status : "UNKNOWN",
            quota,
            retryDelay: retry,
          })
            .split(this.apiKey)
            .join("[REDACTED]"),
        ) as Record<string, unknown>;
        if (result.status === 429)
          throw new TranslationProviderError(
            "quota",
            "Gemini returned HTTP 429 RESOURCE_EXHAUSTED. Translation stopped; no automatic retry, model switch or paid provider fallback.",
            safeDetails,
          );
        throw new TranslationProviderError(
          result.status === 401 ||
            result.status === 403 ||
            result.status === 404
            ? "configuration"
            : "unavailable",
          `Gemini HTTP ${result.status}. No provider fallback attempted.`,
          safeDetails,
        );
      }
      const candidates = Array.isArray(data.candidates) ? data.candidates : [];
      const candidate = object(candidates[0]);
      if (candidate.finishReason !== "STOP")
        throw new TranslationProviderError(
          "blocked",
          `Gemini did not complete the translation (${typeof candidate.finishReason === "string" ? candidate.finishReason : "NO_CANDIDATE"}); partial output rejected.`,
        );
      const content = object(candidate.content);
      const parts = Array.isArray(content.parts) ? content.parts : [];
      const text = parts
        .map(object)
        .filter((p) => p.thought !== true)
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .join("");
      let out: Record<string, unknown>;
      try {
        out = object(JSON.parse(text));
      } catch {
        throw new TranslationProviderError(
          "malformed",
          "Gemini returned malformed structured output",
        );
      }
      if (
        !Array.isArray(out.segments) ||
        out.segments.length > 800 ||
        typeof out.confidence !== "number" ||
        out.confidence < 0 ||
        out.confidence > 1 ||
        !Array.isArray(out.warnings) ||
        out.warnings.some((w) => typeof w !== "string") ||
        out.segments.some((s) => {
          const v = object(s);
          return (
            typeof v.id !== "string" ||
            typeof v.text !== "string" ||
            v.text.length > 100_000
          );
        })
      )
        throw new TranslationProviderError(
          "malformed",
          "Gemini output does not match the translation schema",
        );
      const usage = Object.fromEntries(
        Object.entries(object(data.usageMetadata)).filter(
          ([, v]) => typeof v === "number",
        ),
      ) as Record<string, number>;
      return {
        segments: out.segments as TranslationResponse["segments"],
        confidence: out.confidence,
        warnings: (out.warnings as string[]).slice(0, 30),
        metadata: {
          provider: this.name,
          model:
            typeof data.modelVersion === "string"
              ? data.modelVersion
              : this.model,
          promptVersion: request.promptVersion,
          responseId:
            typeof data.responseId === "string"
              ? data.responseId
              : createHash("sha256").update(text).digest("hex"),
          usage,
        },
      };
    } catch (error) {
      if (error instanceof TranslationProviderError) throw error;
      throw new TranslationProviderError(
        controller.signal.aborted ? "timeout" : "unavailable",
        controller.signal.aborted
          ? "Gemini request timed out; no partial translation accepted."
          : "Gemini network request failed; no provider fallback attempted.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async verify(
    request: FactualVerificationRequest,
  ): Promise<FactualVerificationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const allowedTypes = new Set([
      "number_association",
      "date",
      "name_entity",
      "attribution",
      "quote",
      "omission",
      "addition",
      "meaning",
    ]);
    try {
      const result = await this.fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You are a factual translation verifier for a news publisher. Compare only the supplied Hindi source segment and its supplied translation. Your task is textual equivalence, not real-world truth checking. Never use the current date, publication date, chronology outside the sentence, historical knowledge, arithmetic, age calculation, birthday calculation, or any inference from whether a date is past or future. Do not decide that a translation is wrong merely because a verb tense appears inconsistent with today's date; compare tense only with the source wording itself. Natural English reordering and idiomatic tense choices are allowed when they preserve the source claim. For every reported issue, quote a short exact sourceEvidence substring and a short exact translationEvidence substring from that same segment. For an omission, translationEvidence may be empty. For an addition, sourceEvidence may be empty. If the mismatch cannot be demonstrated from those two excerpts alone, report no issue. Check number-to-noun associations, dates, names/organizations, attribution/uncertainty, quotations, omissions, additions, and meaning. Do not use outside knowledge.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      target: request.locale,
                      segments: request.segments,
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseJsonSchema: verificationSchema,
            },
          }),
        },
      );
      const raw = await result.text();
      let data: Record<string, unknown>;
      try {
        data = object(JSON.parse(raw));
      } catch {
        throw new TranslationProviderError(
          "malformed",
          `Gemini verifier HTTP ${result.status}: response was not JSON`,
        );
      }
      if (!result.ok) {
        throw new TranslationProviderError(
          result.status === 401 ||
            result.status === 403 ||
            result.status === 404
            ? "configuration"
            : result.status === 429
              ? "quota"
              : "unavailable",
          `Gemini verifier HTTP ${result.status}; verification stopped.`,
          { httpStatus: result.status },
        );
      }
      const candidates = Array.isArray(data.candidates) ? data.candidates : [];
      const candidate = object(candidates[0]);
      if (candidate.finishReason !== "STOP")
        throw new TranslationProviderError(
          "blocked",
          `Gemini verifier did not complete (${
            typeof candidate.finishReason === "string"
              ? candidate.finishReason
              : "NO_CANDIDATE"
          }).`,
        );
      const content = object(candidate.content);
      const parts = Array.isArray(content.parts) ? content.parts : [];
      const text = parts
        .map(object)
        .filter((p) => p.thought !== true)
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .join("");
      let out: Record<string, unknown>;
      try {
        out = object(JSON.parse(text));
      } catch {
        throw new TranslationProviderError(
          "malformed",
          "Gemini verifier returned malformed structured output",
        );
      }
      const issues = Array.isArray(out.issues) ? out.issues.map(object) : [];
      const normalizedIssues = issues.map((issue) => ({
        segmentId:
          typeof issue.segmentId === "string" ? issue.segmentId : "",
        type:
          typeof issue.type === "string"
            ? issue.type.trim().toLowerCase().replace(/[\s-]+/g, "_")
            : "",
        message: typeof issue.message === "string" ? issue.message : "",
        sourceEvidence:
          typeof issue.sourceEvidence === "string" ? issue.sourceEvidence : "",
        translationEvidence:
          typeof issue.translationEvidence === "string"
            ? issue.translationEvidence
            : "",
      }));
      if (
        typeof out.passed !== "boolean" ||
        typeof out.confidence !== "number" ||
        out.confidence < 0 ||
        out.confidence > 1 ||
        normalizedIssues.length > 100 ||
        normalizedIssues.some(
          (issue) =>
            !issue.segmentId ||
            !allowedTypes.has(issue.type) ||
            !issue.message ||
            issue.message.length > 1000 ||
            issue.sourceEvidence.length > 1000 ||
            issue.translationEvidence.length > 1000,
        )
      )
        throw new TranslationProviderError(
          "malformed",
          "Gemini verifier output does not match the verification schema",
        );
      const usage = Object.fromEntries(
        Object.entries(object(data.usageMetadata)).filter(
          ([, v]) => typeof v === "number",
        ),
      ) as Record<string, number>;
      const verifiedIssues: FactualVerificationResponse["issues"] =
        normalizedIssues.map((issue) => ({
          segmentId: issue.segmentId,
          type: issue.type as FactualVerificationResponse["issues"][number]["type"],
          message: issue.message,
          sourceEvidence: issue.sourceEvidence,
          translationEvidence: issue.translationEvidence,
        }));
      return {
        passed: out.passed,
        confidence: out.confidence,
        issues: verifiedIssues,
        metadata: {
          provider: this.name,
          model:
            typeof data.modelVersion === "string"
              ? data.modelVersion
              : this.model,
          promptVersion: request.promptVersion,
          responseId:
            typeof data.responseId === "string"
              ? data.responseId
              : createHash("sha256").update(text).digest("hex"),
          usage,
        },
      };
    } catch (error) {
      if (error instanceof TranslationProviderError) throw error;
      throw new TranslationProviderError(
        controller.signal.aborted ? "timeout" : "unavailable",
        controller.signal.aborted
          ? "Gemini factual verification timed out."
          : "Gemini factual verification request failed.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

}
