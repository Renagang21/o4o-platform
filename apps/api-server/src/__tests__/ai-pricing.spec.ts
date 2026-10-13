import { loadAiPriceCatalog, resolveAiPrice, estimateAiCost } from '../modules/ai-policy/ai-pricing.js';
import { AIUsageLog, AIProvider } from '../entities/AIUsageLog.js';

it('labels compatibility estimates and charges input-only and output-only usage', () => {
  const rate = resolveAiPrice(loadAiPriceCatalog(''), 'gemini', 'any-model');
  expect(rate).toMatchObject({ match: 'provider-estimate', version: 'legacy-provider-estimate-v1', currency: 'USD' });
  expect(estimateAiCost(rate, 1000, 0)).toBe(0.0005);
  expect(estimateAiCost(rate, 0, 1000)).toBe(0.0015);
  const log = Object.assign(new AIUsageLog(), { provider: AIProvider.GEMINI, model: 'any-model', promptTokens: 1000, completionTokens: 0 });
  expect(log.estimateCost()).toBe(0.0005);
});
it('selects model-specific pricing over provider fallback and retains version', () => {
  const catalog = loadAiPriceCatalog(JSON.stringify({ version: 'reviewed-v2', rates: [
    { provider: 'openai', model: '*', currency: 'USD', inputPerMillion: 30, outputPerMillion: 60 },
    { provider: 'openai', model: 'model-small', currency: 'USD', inputPerMillion: 0.1, outputPerMillion: 0.2, apiKey: 'discarded-field' },
  ] }));
  const rate = resolveAiPrice(catalog, 'openai', 'model-small');
  expect(rate).toMatchObject({ version: 'reviewed-v2', match: 'model', inputPerMillion: 0.1 });
  expect(rate).not.toHaveProperty('apiKey');
  expect(estimateAiCost(rate, 1000, 500)).toBe(0.0002);
});
it.each(['invalid', '{}', '{"version":"v1","rates":[]}'])('rejects invalid configuration %s instead of silently making calls free', value => {
  expect(() => loadAiPriceCatalog(value)).toThrow('AI_PRICING_INVALID');
});
it('rejects duplicate model rates, negative prices, unsupported currency and missing providers', () => {
  const rate = { provider: 'openai', model: 'm', currency: 'EUR', inputPerMillion: 1, outputPerMillion: 1 };
  expect(() => loadAiPriceCatalog(JSON.stringify({ version: 'v1', rates: [rate, rate] }))).toThrow('AI_PRICING_INVALID');
  expect(() => loadAiPriceCatalog(JSON.stringify({ version: 'v1', rates: [{ ...rate, inputPerMillion: -1 }] }))).toThrow('AI_PRICING_INVALID');
  expect(() => resolveAiPrice(loadAiPriceCatalog(JSON.stringify({ version: 'v1', rates: [rate] })), 'openai', 'm')).toThrow('AI_PRICING_CURRENCY_UNSUPPORTED');
  expect(() => resolveAiPrice(loadAiPriceCatalog(''), 'unconfigured', 'm')).toThrow('AI_PRICING_NOT_CONFIGURED');
});
it('rejects invalid usage and preserves sub-cent cost precision', () => {
  const rate = resolveAiPrice(loadAiPriceCatalog(''), 'gemini', 'm');
  expect(estimateAiCost(rate, 1, 0)).toBe(0.0000005);
  expect(() => estimateAiCost(rate, -1, 0)).toThrow('AI_USAGE_INVALID');
  expect(() => estimateAiCost(rate, NaN, 0)).toThrow('AI_USAGE_INVALID');
});
