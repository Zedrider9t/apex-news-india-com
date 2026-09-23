import type { TranslationProvider } from "../types";
import { GeminiTranslationProvider } from "./gemini";
import { TranslationProviderError } from "../provider";
export function createTranslationProvider(): TranslationProvider {
  const name = process.env.TRANSLATION_PROVIDER || "gemini";
  if (name !== "gemini")
    throw new TranslationProviderError(
      "configuration",
      `Provider ${name} is not configured. Automatic fallback is disabled.`,
    );
  return new GeminiTranslationProvider();
}
