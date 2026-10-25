/** Sanitized configuration evidence. Loading prices does not verify credentials or provider access. */
import { createHash } from 'node:crypto';
import { loadAiPriceCatalog, type AiPriceCatalog } from './ai-pricing.js';

export interface AiPricingObservation {
  state: 'loaded' | 'legacy-estimates' | 'invalid';
  version: string | null;
  fingerprint: string | null;
  modelRateCount: number | null;
  nativeProfileCount: number | null;
  currencies: string[];
  code: 'AI_PRICING_INVALID' | null;
}

export function fingerprintAiPriceCatalog(catalog: AiPriceCatalog): string {
  return createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
}

/** The caller supplies its own process value; an empty value never consults ambient configuration. */
export function observeAiPricingCatalog(value = ''): AiPricingObservation {
  try {
    const catalog = loadAiPriceCatalog(value);
    return {
      state: value ? 'loaded' : 'legacy-estimates',
      version: catalog.version,
      fingerprint: fingerprintAiPriceCatalog(catalog),
      modelRateCount: catalog.rates.length,
      nativeProfileCount: catalog.rates.reduce((total, rate) => total + Object.keys(rate.native ?? {}).length, 0),
      currencies: [...new Set(catalog.rates.map(rate => rate.currency))].sort(),
      code: null,
    };
  } catch {
    return { state: 'invalid', version: null, fingerprint: null, modelRateCount: null,
      nativeProfileCount: null, currencies: [], code: 'AI_PRICING_INVALID' };
  }
}
