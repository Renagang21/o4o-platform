import type { EntityManager } from 'typeorm';
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../utils/ai-editing-model-resolver.js', () => ({ resolveEditingProvider: async () => ({ provider: 'qwen', model: 'normal' }), EDITING_MODEL_FALLBACK: 'gemini-3.8-flash' }));
import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { ModelControlService } from '../services/ai-management/model-controls.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
import { nativePriceFixture } from './helpers/native-accounting-fixture.js';

const saved = { pricing: process.env.AI_PRICING_CATALOG, key: process.env.QWEN_API_KEY };
const actor = 'verified-actor';
const log = jest.fn();
const manager = { getRepository: () => ({ create: (row: unknown) => row, save: log }) } as unknown as EntityManager;
const input = { provider: 'gemini' as const, model: 'gemini-3.8-flash', systemPrompt: 'system', userPrompt: 'user', maxTokens: 1000 };
let reserve: jest.SpyInstance, settle: jest.SpyInstance, http: jest.SpyInstance, sleep: jest.SpyInstance;
const gemini = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"blocks":[]}' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 30 } }), { status: 200 });
beforeEach(() => {
  jest.clearAllMocks();
  process.env.AI_PRICING_CATALOG = JSON.stringify(nativePriceFixture());
  process.env.QWEN_API_KEY = 'synthetic-key';
  jest.spyOn(ModelControlService.prototype, 'resolve').mockImplementation(async (_usage, fallback) => fallback);
  jest.spyOn(ModelControlService.prototype, 'allows').mockResolvedValue(true);
  jest.spyOn(aiProxyService as any, 'getApiKey').mockResolvedValue('synthetic-key');
  sleep = jest.spyOn(aiProxyService as any, 'sleep').mockResolvedValue(undefined);
  reserve = jest.spyOn(AiQuotaService.prototype, 'reserve').mockResolvedValue({ id: 'reservation', warnings: [] });
  settle = jest.spyOn(AiQuotaService.prototype, 'settle').mockImplementation(async (_reservation, _usage, record) => { await record(manager); });
  http = jest.spyOn(global, 'fetch').mockImplementation(async () => gemini());
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => {
  if (saved.pricing === undefined) delete process.env.AI_PRICING_CATALOG; else process.env.AI_PRICING_CATALOG = saved.pricing;
  if (saved.key === undefined) delete process.env.QWEN_API_KEY; else process.env.QWEN_API_KEY = saved.key;
});

it.each(['QUOTA_EXCEEDED', 'AI_QUOTA_UNAVAILABLE'])('blocks every proxy attempt after %s without sleeping or dispatch', async code => {
  reserve.mockRejectedValueOnce(new Error(code));
  await expect(aiProxyService.generateContent(input, actor, 'fixture-request')).rejects.toThrow(code);
  expect(http).not.toHaveBeenCalled(); expect(sleep).not.toHaveBeenCalled(); expect(reserve).toHaveBeenCalledTimes(1);
});

it('retains failed attempt capacity and admits the next attempt before provider retry', async () => {
  http.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(aiProxyService.generateContent(input, actor, 'fixture-request')).resolves.toMatchObject({ success: true });
  expect(http).toHaveBeenCalledTimes(2); expect(reserve).toHaveBeenCalledTimes(2); expect(sleep).toHaveBeenCalledTimes(1);
  expect(reserve.mock.invocationCallOrder[0]).toBeLessThan(http.mock.invocationCallOrder[0]);
  expect(reserve.mock.invocationCallOrder[1]).toBeLessThan(http.mock.invocationCallOrder[1]);
  expect(settle.mock.calls[0][3]).toMatchObject({ outcome: 'error', uncertain: { requests: 1 } });
  expect(settle.mock.calls[1][1]).toMatchObject({ requests: 1, tokens: 30 });
});

it('raw editing and lecture calls use actor quota and the original output-token limit', async () => {
  await expect(aiProxyService.generateRawContent(input, actor, 'fixture-request', 'lecture.body')).resolves.toMatchObject({ success: true, rawText: '{"blocks":[]}' });
  expect(reserve).toHaveBeenCalledWith('AI_PROXY', actor, expect.objectContaining({ tokens: 1010 }), expect.anything(), undefined);
  expect(JSON.parse(http.mock.calls[0][1].body).generationConfig.maxOutputTokens).toBe(1000);
  expect(log).toHaveBeenCalledTimes(1); // no old unaccounted duplicate usage log
});

it('receipt failure after successful generation never re-enters the five-attempt provider loop', async () => {
  settle.mockRejectedValueOnce(new Error('receipt unavailable'));
  await expect(aiProxyService.generateContent(input, actor, 'fixture-request')).resolves.toMatchObject({ success: true });
  expect(http).toHaveBeenCalledTimes(1); expect(sleep).not.toHaveBeenCalled();
});

it('legacy Gemini blocks retain tool input and thinking tokens in the same native receipt', async () => {
  http.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"blocks":[]}' }] } }],
    usageMetadata: { promptTokenCount: 10, toolUsePromptTokenCount: 5, candidatesTokenCount: 2, thoughtsTokenCount: 3, totalTokenCount: 20 } }), { status: 200 }));
  await expect(aiProxyService.generateContent(input, actor, 'fixture-request')).resolves.toMatchObject({ usage: { promptTokens: 15, completionTokens: 5 } });
  expect(settle.mock.calls[0][1]).toMatchObject({ tokens: 20 });
});

it('Qwen token usage keeps its own provider receipt and existing draft result', async () => {
  http.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"html":"fixture draft"}' } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }), { status: 200 }));
  const result = await aiProxyService.generateEditingRawContent(input, actor, 'fixture-request', { surface: 'pop' });
  expect(result).toMatchObject({ provider: 'qwen', parsed: { html: 'fixture draft' } });
  expect(settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tokens: 30 }), expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ provider: 'qwen', model: 'normal' }) }));
  expect(log).not.toHaveBeenCalled();
});

it('Qwen admission refusal never bypasses quota by falling back to Gemini', async () => {
  reserve.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));
  await expect(aiProxyService.generateEditingRawContent(input, actor, 'fixture-request', { surface: 'pop' })).rejects.toThrow('QUOTA_EXCEEDED');
  expect(http).not.toHaveBeenCalled(); expect(reserve).toHaveBeenCalledTimes(1);
});

it('Qwen provider failure retains its budget and falls back to accounted canonical Gemini despite a managed Qwen selection', async () => {
  jest.mocked(ModelControlService.prototype.resolve).mockResolvedValue({ provider: 'qwen', model: 'normal', managed: true });
  http.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(aiProxyService.generateEditingRawContent(input, actor, 'fixture-request', { surface: 'pop' })).resolves.toMatchObject({ provider: 'gemini', model: 'gemini-3.8-flash' });
  expect(http).toHaveBeenCalledTimes(2); expect(reserve).toHaveBeenCalledTimes(2);
  expect(settle.mock.calls[0][3]).toMatchObject({ detail: { provider: 'qwen' }, uncertain: { requests: 1 } });
  expect(settle.mock.calls[1][3]).toMatchObject({ detail: { provider: 'gemini' } });
});

it('unpriced Qwen does not trigger a paid alternate call', async () => {
  delete process.env.AI_PRICING_CATALOG;
  await expect(aiProxyService.generateEditingRawContent(input, actor, 'fixture-request', { surface: 'pop' })).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
  expect(http).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
});
