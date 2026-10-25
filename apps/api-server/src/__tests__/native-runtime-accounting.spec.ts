import type { DataSource, EntityManager } from 'typeorm';
import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { AiAccountedExecution } from '../modules/ai-policy/ai-accounted-execution.js';
import { prepareNativePlan, geminiNativeUsage, type AiNativeRequest } from '../modules/ai-policy/ai-native-metering.js';
import { loadAiPriceCatalog } from '../modules/ai-policy/ai-pricing.js';
import { nativePriceFixture } from './helpers/native-accounting-fixture.js';

const original = process.env.AI_PRICING_CATALOG;
beforeEach(() => { process.env.AI_PRICING_CATALOG = JSON.stringify(nativePriceFixture()); });
afterAll(() => { if (original === undefined) delete process.env.AI_PRICING_CATALOG; else process.env.AI_PRICING_CATALOG = original; });
const account = { scope: 'SERVICE_QUERY' as const, serviceKey: 'neture', userId: 'verified-actor' };
const request: AiNativeRequest = { kind: 'multimodal', provider: 'gemini', model: 'normal', textBytes: 20, maxOutputTokens: 800 };
function harness() {
  const save = jest.fn(async () => {});
  const manager = { getRepository: () => ({ create: (row: unknown) => row, save }) } as unknown as EntityManager;
  const reserve = jest.fn(async () => ({ id: 'reservation', warnings: [] }));
  const settle = jest.fn(async (_reservation, _usage, record: (db: EntityManager) => Promise<void>) => record(manager));
  return { service: new AiAccountedExecution({} as DataSource, { reserve, settle } as any), save, reserve, settle };
}

it.each(['multimodal', 'grounding', 'tts', 'text'] as const)('%s uses the existing ledger and immutable model price before dispatch', async kind => {
  const h = harness();
  const invoke = jest.fn(async () => ({ value: 'result', usage: { inputTokens: 10, outputTokens: 20, units: 1 } }));
  await expect(h.service.invokeNative({ ...request, kind, ...(kind === 'grounding' ? { unit: 'request' as const, units: 1 } : {}) }, account, invoke)).resolves.toBe('result');
  expect(h.reserve.mock.invocationCallOrder[0]).toBeLessThan(invoke.mock.invocationCallOrder[0]);
  expect(h.reserve).toHaveBeenCalledWith(account.scope, account.userId, expect.objectContaining({ requests: 1 }), expect.arrayContaining([expect.objectContaining({ version: 'synthetic-native-v1' })]), 'neture');
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), { requests: 1, tokens: 30, cost: kind === 'grounding' ? 0.02005 : 0.00005 }, expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ native: expect.objectContaining({ kind, usageKnown: true }) }) }));
});

it.each(['QUOTA_EXCEEDED', 'AI_QUOTA_UNAVAILABLE'])('%s never dispatches or tries another provider', async code => {
  const h = harness(); h.reserve.mockRejectedValueOnce(new Error(code)); const invoke = jest.fn();
  await expect(h.service.invokeNative(request, account, invoke)).rejects.toThrow(code);
  expect(invoke).not.toHaveBeenCalled(); expect(h.settle).not.toHaveBeenCalled();
});

it('does not reuse a text provider estimate for an unpriced image', async () => {
  delete process.env.AI_PRICING_CATALOG;
  const h = harness(), invoke = jest.fn();
  await expect(h.service.invokeNative(request, account, invoke)).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
  expect(h.reserve).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
});

it('unit-only OCR records one image even when no text is found, without impersonating a legacy provider enum', async () => {
  const h = harness();
  await expect(h.service.invokeNative({ kind: 'ocr', provider: 'google-vision', model: 'TEXT_DETECTION', unit: 'image', units: 1 }, account,
    async () => ({ value: null, usage: { units: 1 } }))).resolves.toBeNull();
  expect(h.save).not.toHaveBeenCalled();
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), { requests: 1, tokens: 0, cost: 0.05 }, expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ provider: 'google-vision' }) }));
});

it('Qwen uses an exact token rate and its own receipt without enum migration', async () => {
  const h = harness();
  await h.service.invokeNative({ ...request, kind: 'text', provider: 'qwen' }, account, async () => ({ value: 'draft', usage: { inputTokens: 10, outputTokens: 20 } }));
  expect(h.save).not.toHaveBeenCalled();
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cost: 0.00005 }), expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ provider: 'qwen', model: 'normal' }) }));
});

it.each([undefined, {}, { inputTokens: 0, outputTokens: 0 }, { inputTokens: -1, outputTokens: 2 }, { inputTokens: 1, outputTokens: NaN }])('missing/malformed native usage holds the admitted budget', async usage => {
  const h = harness(), invoke = jest.fn(async () => ({ value: Buffer.from('audio'), usage }));
  await expect(h.service.invokeNative({ ...request, kind: 'tts' }, account, invoke)).resolves.toEqual(Buffer.from('audio'));
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), { requests: 1, tokens: 0, cost: 0 }, expect.any(Function), expect.objectContaining({
    uncertain: expect.objectContaining({ requests: 0, tokens: 1_000_800, cost: 1.0016 }),
    detail: expect.objectContaining({ native: expect.objectContaining({ usageKnown: false }) }),
  }));
});

it('provider/response loss retains the whole reservation with a safe failure receipt', async () => {
  const h = harness(), failure = new Error('sensitive upstream response');
  await expect(h.service.invokeNative(request, account, async () => { throw failure; })).rejects.toBe(failure);
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), { requests: 0, tokens: 0, cost: 0 }, expect.any(Function), expect.objectContaining({ outcome: 'error', uncertain: expect.objectContaining({ requests: 1 }) }));
  const receipt = (h.settle.mock.calls[0] as unknown as [unknown, unknown, unknown, { providerRequestId: string }])[3];
  expect(h.save).toHaveBeenCalledWith(expect.objectContaining({ requestId: receipt.providerRequestId, status: 'error' }));
  expect(JSON.stringify(h.save.mock.calls)).not.toContain('sensitive upstream response');
});

it('success survives receipt failure without invoking a provider twice', async () => {
  const h = harness(); h.settle.mockRejectedValueOnce(new Error('unavailable'));
  const invoke = jest.fn(async () => ({ value: 'saved result', usage: { inputTokens: 10, outputTokens: 20 } }));
  await expect(h.service.invokeNative(request, account, invoke)).resolves.toBe('saved result');
  expect(invoke).toHaveBeenCalledTimes(1);
});

it('keeps the admission snapshot if policy prices change during the paid call', async () => {
  const h = harness();
  await h.service.invokeNative(request, account, async () => { delete process.env.AI_PRICING_CATALOG; return { value: 'result', usage: { inputTokens: 10, outputTokens: 20 } }; });
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cost: 0.00005 }), expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ price: expect.objectContaining({ version: 'synthetic-native-v1' }) }) }));
});

it('rejects unit mismatch, understated output bounds, malformed profiles and unexpected profile fields', () => {
  expect(() => prepareNativePlan({ kind: 'ocr', provider: 'google-vision', model: 'TEXT_DETECTION', unit: 'character', units: 1 })).toThrow('AI_POLICY_INVALID');
  expect(() => prepareNativePlan({ ...request, maxOutputTokens: 32001 })).toThrow('AI_POLICY_INVALID');
  const catalog = nativePriceFixture();
  (catalog.rates[0].native!.multimodal as any).secret = 'must-not-be-persisted';
  expect(() => loadAiPriceCatalog(JSON.stringify(catalog))).toThrow('AI_PRICING_INVALID');
});

it('Gemini accounting includes thinking/audio tokens and rejects malformed counts', () => {
  expect(geminiNativeUsage({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, thoughtsTokenCount: 5, totalTokenCount: 30 } })).toEqual({ inputTokens: 10, outputTokens: 20 });
  expect(geminiNativeUsage({ usageMetadata: { promptTokenCount: 10, totalTokenCount: 30 } })).toEqual({ inputTokens: 10, outputTokens: 20 });
  expect(geminiNativeUsage({ usageMetadata: { promptTokenCount: -1, candidatesTokenCount: 3 } })).toEqual({});
});


it('supports per-query search pricing with an explicit admitted query budget', async () => {
  const catalog = nativePriceFixture();
  catalog.rates[0].native!.grounding = { maxInputTokens: 1_000_000, maxOutputTokens: 32000, unit: 'search-query', perUnit: 0.02, maxUnits: 4 };
  process.env.AI_PRICING_CATALOG = JSON.stringify(catalog);
  const h = harness();
  await h.service.invokeNative({ ...request, kind: 'grounding', unit: 'request', units: 1 }, account,
    async () => ({ value: 'answer', usage: { inputTokens: 10, outputTokens: 20, searchQueries: 3 } }));
  expect(h.reserve).toHaveBeenCalledWith(account.scope, account.userId, expect.objectContaining({ cost: 1.0816 }), expect.anything(), 'neture');
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cost: 0.06005 }), expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ native: expect.objectContaining({ unit: 'search-query', units: 3 }) }) }));
});

it('retains the query budget when provider search measurements are missing', async () => {
  const catalog = nativePriceFixture();
  catalog.rates[0].native!.grounding = { maxInputTokens: 1_000_000, maxOutputTokens: 32000, unit: 'search-query', perUnit: 0.02, maxUnits: 4 };
  process.env.AI_PRICING_CATALOG = JSON.stringify(catalog);
  const h = harness();
  await h.service.invokeNative({ ...request, kind: 'grounding', unit: 'request', units: 1 }, account, async () => ({ value: 'answer', usage: { inputTokens: 10, outputTokens: 20 } }));
  expect(h.settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cost: 0 }), expect.any(Function), expect.objectContaining({ uncertain: expect.objectContaining({ cost: 1.0816 }) }));
});

it('unknown unit-only zero cost stays pending instead of being confirmed as free', async () => {
  let status: string | undefined;
  const query = jest.fn(async (sql: string, args?: unknown[]) => {
    if (sql.includes('SELECT * FROM ai_usage_reservations')) return [{ status: 'reserved', scope: account.scope, service_key: 'neture', user_id: account.userId, daily_key: '2026-10-25', monthly_key: '2026-10' }];
    if (sql.startsWith('UPDATE ai_usage_reservations')) status = args![6] as string;
    return [];
  });
  const quota = new AiQuotaService({ transaction: async run => run({ query }) } as unknown as DataSource);
  await quota.settle({ id: 'reservation', warnings: [] }, { requests: 1, tokens: 0, cost: 0 }, async () => {}, {
    outcome: 'success', detail: { provider: 'google-vision', model: 'TEXT_DETECTION', price: prepareNativePlan({ kind: 'ocr', provider: 'google-vision', model: 'TEXT_DETECTION', unit: 'image', units: 1 }).price, attempts: 1,
      native: { kind: 'ocr', unit: 'image', units: null, usageKnown: false } },
  });
  expect(status).toBe('pending');
});


it('separates tool-use prompt tokens from billable generated thoughts', () => {
  expect(geminiNativeUsage({ usageMetadata: { promptTokenCount: 10, toolUsePromptTokenCount: 3, candidatesTokenCount: 2, thoughtsTokenCount: 5, totalTokenCount: 20 } })).toEqual({ inputTokens: 13, outputTokens: 7 });
});
