import { createHash } from "node:crypto";
import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResponse,
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
                      ? "\nTarget: natural Roman Hindi for Indian readers. Hindi grammar in Latin script, not English translation or mechanical character transliteration. Prefer Bharat, Pradhanmantri, sarkar, Delhi; preserve conventional proper-name spellings."
                      : "\nTarget: professional English news translation, semantically faithful to the Hindi. No added background or stylistic rewriting."),
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
              temperature: 0.1,
              maxOutputTokens: 16384,
              responseFormat: {
                text: { mimeType: "application/json", schema },
              },
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
}
