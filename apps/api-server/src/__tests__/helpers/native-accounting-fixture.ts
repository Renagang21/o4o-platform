import type { AiPriceCatalog } from '../../modules/ai-policy/ai-pricing.js';

/** Synthetic test policy, never a published provider price or production configuration. */
export function nativePriceFixture(): AiPriceCatalog {
  const profile = { maxInputTokens: 1_000_000, maxOutputTokens: 32000 };
  const rates = ['gemini', 'openai', 'claude', 'qwen'].flatMap(provider => ['normal', 'strong', 'gemini-3.8-flash', 'gpt-4o-mini-tts', 'gemini-3.1-flash-tts-preview'].map(model => ({
    provider, model, currency: 'USD', inputPerMillion: 1, outputPerMillion: 2,
    native: { multimodal: { ...profile }, grounding: { ...profile, unit: 'request' as const, perUnit: 0.02 }, tts: { ...profile } },
  })));
  return { version: 'synthetic-native-v1', rates: [...rates, { provider: 'google-vision', model: 'TEXT_DETECTION', currency: 'USD', inputPerMillion: 0, outputPerMillion: 0,
    native: { ocr: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'image', perUnit: 0.05 } } }] };
}
