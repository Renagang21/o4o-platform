/** Actual native transports and existing accounting; only DB admission/HTTP boundaries are fixtures. */
import type { DataSource, EntityManager } from 'typeorm';
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../utils/ai-editing-model-resolver.js', () => ({ resolveEditingModel: async () => 'normal' }));
jest.mock('../utils/ai-key.util.js', () => ({ resolveAiApiKey: jest.fn(async () => 'synthetic-key') }));
jest.mock('../utils/ai-provider-runtime.js', () => ({
  ...jest.requireActual('../utils/ai-provider-runtime.js'),
  resolveAiTarget: async (_db, provider = 'gemini') => ({ provider, model: 'normal', apiKey: 'synthetic-key' }),
  resolveStrongAiTarget: async (_db, provider = 'gemini') => ({ provider, model: 'strong', apiKey: 'synthetic-key' }),
}));
import { GeminiProvider } from '@o4o/ai-core';
import { executeAccountedNativeAi } from '../modules/ai-policy/ai-accounted-execution.js';
import type { AiNativeInvocation } from '../modules/ai-policy/ai-native-metering.js';
import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { ModelControlService } from '../services/ai-management/model-controls.js';
import { executeMultimodalChat } from '../services/ai-tools/multimodal-chat.js';
import { createLlmPlannerForProvider, createStrongLlmPlannerForProvider, type PlannerInput } from '../services/ai-tools/work-planner.js';
import { runWebResearch } from '../services/ai/web-research.service.js';
import * as aiKeys from '../utils/ai-key.util.js';
import { TtsNarrationService, validateTtsRequest } from '../modules/automation/services/tts-narration.service.js';
import { ProductOcrService } from '../modules/store-ai/services/product-ocr.service.js';
import { nativePriceFixture } from './helpers/native-accounting-fixture.js';

const originalPricing = process.env.AI_PRICING_CATALOG;
const actor = 'verified-actor';
const assetRepo = { findOne: jest.fn(async () => null), create: (row: unknown) => row, save: jest.fn(async row => row) };
const db = { getRepository: () => assetRepo } as unknown as DataSource;
const log = jest.fn();
const manager = { getRepository: () => ({ create: (row: unknown) => row, save: log }) } as unknown as EntityManager;
const invokeNative: AiNativeInvocation = (native, invoke) => executeAccountedNativeAi(db, native, { scope: 'SERVICE_QUERY', serviceKey: 'neture', userId: actor }, invoke);
let reserve: jest.SpyInstance, settle: jest.SpyInstance, http: jest.SpyInstance;
const response = () => ({ candidates: [{ content: { parts: [{ text: '{"assessment":"completed"}' }] }, groundingMetadata: { webSearchQueries: ['synthetic query'], groundingChunks: [{ web: { uri: 'https://example.com', title: 'fixture' } }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, thoughtsTokenCount: 5, totalTokenCount: 30 } });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(aiKeys.resolveAiApiKey).mockReset().mockResolvedValue('synthetic-key');
  process.env.AI_PRICING_CATALOG = JSON.stringify(nativePriceFixture());
  jest.spyOn(ModelControlService.prototype, 'resolve').mockImplementation(async (_usage, fallback) => fallback);
  reserve = jest.spyOn(AiQuotaService.prototype, 'reserve').mockResolvedValue({ id: 'reservation', warnings: [] });
  settle = jest.spyOn(AiQuotaService.prototype, 'settle').mockImplementation(async (_reservation, _usage, record) => { await record(manager); });
  http = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify(response()), { status: 200 }));
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => { if (originalPricing === undefined) delete process.env.AI_PRICING_CATALOG; else process.env.AI_PRICING_CATALOG = originalPricing; });

it('Home inline PDF/image uses native reservation; raw attachment bytes never enter receipts', async () => {
  const text = jest.fn();
  await expect(executeMultimodalChat({ provider: 'gemini', model: 'normal', apiKey: 'synthetic-key', systemPrompt: 'system', userPrompt: 'question', timeoutMs: 1000,
    parts: [{ kind: 'inline', name: 'fixture.pdf', mimeType: 'application/pdf', base64: 'QUJD' }] }, text, invokeNative)).resolves.toMatchObject({ inlineDelivered: true });
  expect(reserve.mock.invocationCallOrder[0]).toBeLessThan(http.mock.invocationCallOrder[0]);
  expect(text).not.toHaveBeenCalled();
  expect(settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tokens: 30 }), expect.any(Function), expect.anything());
  expect(JSON.stringify(settle.mock.calls)).not.toContain('QUJD');
});

const plannerInput: PlannerInput = { goal: { goalId: 'g', request: 'fixture', status: 'active' }, siteDisplayName: 'fixture',
  observation: { siteId: 'healthkr', path: '/', ready: true, elements: [], elementCount: 0, source: 'webpage', fingerprint: 'f' },
  history: [], lastRead: null, stepsLeft: 3, image: { mimeType: 'image/png', base64: 'QUJD', provenance: 'user_image' } };
it.each([['gemini', false], ['gemini', true], ['openai', false], ['openai', true]] as const)('%s vision planner strong=%s keeps provider transport, model and actor quota', async (provider, strong) => {
  if (provider === 'openai') http.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"assessment":"completed"}' } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }), { status: 200 }));
  const planner = strong ? createStrongLlmPlannerForProvider(db, provider, fetch, actor) : createLlmPlannerForProvider(db, provider, fetch, actor);
  await expect(planner.plan(plannerInput)).resolves.toEqual({ assessment: 'completed' });
  expect(reserve).toHaveBeenCalledWith('SERVICE_QUERY', actor, expect.anything(), expect.anything(), 'neture');
  expect(settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tokens: 30 }), expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ provider, model: strong ? 'strong' : 'normal' }) }));
  expect(http).toHaveBeenCalledTimes(1);
  const body = JSON.parse(http.mock.calls[0][1].body);
  if (provider === 'openai') expect(body.messages[1].content[1].image_url.url).toContain('QUJD');
  else expect(body.contents[0].parts[1].inline_data.data).toBe('QUJD');
});

it('vision parsing fails after measurement without repeating paid dispatch', async () => {
  const data = response(); data.candidates[0].content.parts[0].text = 'invalid JSON';
  http.mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }));
  await expect(createLlmPlannerForProvider(db, 'gemini', fetch, actor).plan(plannerInput)).rejects.toThrow('planner: no json');
  expect(http).toHaveBeenCalledTimes(1); expect(settle).toHaveBeenCalledTimes(1);
});

it.each([undefined, actor])('grounding retains public materials and attributes verified actor %s only when supplied by host', async userId => {
  const result = await runWebResearch({ query: 'synthetic public research' }, userId);
  expect(result.grounding?.used).toBe(true);
  expect(reserve).toHaveBeenCalledWith('SERVICE_QUERY', userId, expect.anything(), expect.anything(), 'neture');
  expect(settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tokens: 30, cost: 0.02005 }), expect.any(Function), expect.anything());
});

it('Core Gemini response accounts hidden generation tokens through the unchanged response shape', async () => {
  const result = await new GeminiProvider().complete('system', 'user', { apiKey: 'synthetic-key', model: 'normal', responseMode: 'text' });
  expect(result).toMatchObject({ promptTokens: 10, completionTokens: 20 });
});

it('unconnected research fails before reserving quota or dispatching paid work', async () => {
  jest.mocked(aiKeys.resolveAiApiKey).mockResolvedValueOnce('');
  await expect(runWebResearch({ query: 'synthetic public research' }, actor)).rejects.toThrow('AI_NOT_CONFIGURED');
  expect(reserve).not.toHaveBeenCalled(); expect(settle).not.toHaveBeenCalled(); expect(http).not.toHaveBeenCalled();
});

it('OpenAI audio bytes survive and missing usage retains the admitted token/cost budget', async () => {
  http.mockResolvedValueOnce(new Response(Buffer.from('ID3synthetic-audio'), { status: 200 }));
  const service = new TtsNarrationService(async () => 'synthetic-key');
  const result = await service.synthesize(validateTtsRequest({ provider: 'openai', text: 'fixture narration' }), invokeNative);
  expect(result.audio.toString()).toBe('ID3synthetic-audio');
  expect(settle).toHaveBeenCalledWith(expect.anything(), { requests: 1, tokens: 0, cost: 0 }, expect.any(Function), expect.objectContaining({ uncertain: expect.objectContaining({ tokens: 1_032_000 }), detail: expect.objectContaining({ native: expect.objectContaining({ usageKnown: false }) }) }));
  expect(http).toHaveBeenCalledTimes(1);
});

it('Gemini audio usage is metered independently of PCM/WAV bytes', async () => {
  const data = { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: Buffer.alloc(480).toString('base64') } }] } }], usageMetadata: { promptTokenCount: 10, totalTokenCount: 30 } };
  http.mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }));
  const result = await new TtsNarrationService(async () => 'synthetic-key').synthesize(validateTtsRequest({ provider: 'gemini', text: 'fixture narration' }), invokeNative);
  expect(result.audio.subarray(0, 4).toString()).toBe('RIFF');
  expect(settle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tokens: 30 }), expect.any(Function), expect.anything());
});

it.each([false, true])('OCR records the processed image even when text exists=%s', async hasText => {
  jest.spyOn(ProductOcrService.prototype as any, 'getAccessToken').mockResolvedValue('synthetic-token');
  http.mockResolvedValueOnce(new Response(JSON.stringify({ responses: [hasText ? { fullTextAnnotation: { text: 'fixture label', pages: [] } } : {}] }), { status: 200 }));
  const result = await new ProductOcrService(db).extractAndSave('fixture-product', 'fixture-image', 'https://example.com/image', actor);
  expect(result === null).toBe(!hasText);
  expect(reserve).toHaveBeenCalledWith('PRODUCT_CONTENT', actor, { requests: 1, tokens: 0, cost: 0.05 }, expect.anything(), undefined);
  expect(settle).toHaveBeenCalledWith(expect.anything(), { requests: 1, tokens: 0, cost: 0.05 }, expect.any(Function), expect.objectContaining({ detail: expect.objectContaining({ provider: 'google-vision' }) }));
  expect(log).not.toHaveBeenCalled();
});

it.each(['multimodal', 'tts', 'grounding', 'ocr'])('%s cannot dispatch with missing native pricing', async kind => {
  delete process.env.AI_PRICING_CATALOG;
  if (kind === 'multimodal') await expect(createLlmPlannerForProvider(db, 'gemini', fetch, actor).plan(plannerInput)).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
  if (kind === 'tts') await expect(new TtsNarrationService(async () => 'synthetic-key').synthesize(validateTtsRequest({ provider: 'openai', text: 'fixture' }), invokeNative)).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
  if (kind === 'grounding') await expect(runWebResearch({ query: 'fixture' }, actor)).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
  if (kind === 'ocr') {
    jest.spyOn(ProductOcrService.prototype as any, 'getAccessToken').mockResolvedValue('synthetic-token');
    await expect(new ProductOcrService(db).extractAndSave('p', 'i', 'https://example.com', actor)).resolves.toBeNull();
  }
  expect(http).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
});
