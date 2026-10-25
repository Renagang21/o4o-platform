/** Real text hosts → existing accounting adapter; DB admission and provider transport are injected. */
import express from 'express';
import request from 'supertest';
import type { DataSource, EntityManager } from 'typeorm';
import type { ExecuteResult } from '@o4o/ai-core';

const providerCall = jest.fn();
jest.mock('@o4o/ai-core', () => ({ execute: (...args: unknown[]) => providerCall(...args) }));
jest.mock('../utils/ai-provider-runtime.js', () => ({
  ...jest.requireActual('../utils/ai-provider-runtime.js'),
  resolveAiTarget: jest.fn(async (_db: unknown, provider = 'gemini') => ({ provider, model: 'normal', apiKey: 'synthetic-key' })),
  resolveStrongAiTarget: jest.fn(async (_db: unknown, provider = 'gemini') => ({ provider, model: 'strong', apiKey: 'synthetic-key' })),
}));
jest.mock('../utils/ai-editing-model-resolver.js', () => ({ resolveEditingModel: async () => 'normal' }));
jest.mock('../utils/ai-key.util.js', () => ({ resolveAiApiKey: async () => 'synthetic-key' }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { executeAccountedAi } from '../modules/ai-policy/ai-accounted-execution.js';
import { ModelControlService } from '../services/ai-management/model-controls.js';
import { createLlmPlanner, createStrongLlmPlanner, createLlmPlannerForProvider, createStrongLlmPlannerForProvider } from '../services/ai-tools/work-planner.js';
import type { PlannerInput } from '../services/ai-tools/work-planner.js';
import { inferFileStructure } from '../services/ai-tools/file-understanding/structure-inference.service.js';
import { profileWorkbook } from '../services/ai-tools/file-understanding/profile.js';
import { createHospitalRoutes } from '../routes/hospital/hospital.routes.js';

const db = {} as DataSource;
const actor = 'verified-user';
const save = jest.fn();
const manager = { getRepository: () => ({ create: (row: unknown) => row, save }) } as unknown as EntityManager;
const pricing = process.env.AI_PRICING_CATALOG;
let reserve: jest.SpyInstance;
let settle: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.AI_PRICING_CATALOG;
  jest.spyOn(ModelControlService.prototype, 'resolve').mockImplementation(async (_usage, fallback) => fallback);
  reserve = jest.spyOn(AiQuotaService.prototype, 'reserve').mockResolvedValue({ id: 'reservation', warnings: [] });
  settle = jest.spyOn(AiQuotaService.prototype, 'settle').mockImplementation(async (_reservation, _usage, record) => { await record(manager); });
  providerCall.mockImplementation(async input => ({
    content: '{"assessment":"completed"}', provider: input.provider, model: input.config.model,
    promptTokens: 12, completionTokens: 5, attempts: 1, durationMs: 2, requestId: 'synthetic-request',
  }));
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => { if (pricing === undefined) delete process.env.AI_PRICING_CATALOG; else process.env.AI_PRICING_CATALOG = pricing; });

const input: PlannerInput = {
  goal: { goalId: 'g', request: '테스트 항목 찾기', status: 'active' }, siteDisplayName: 'test',
  observation: { siteId: 'healthkr', path: '/', ready: true, elements: [], elementCount: 0, source: 'webpage', fingerprint: 'f' },
  history: [], lastRead: null, stepsLeft: 3,
};

it.each(['normal', 'strong', 'provider-normal', 'provider-strong'])('%s text planner reserves actor quota before dispatch and retains model choice', async kind => {
  const planner = kind === 'normal' ? createLlmPlanner(db, fetch, undefined, false, actor)
    : kind === 'strong' ? createStrongLlmPlanner(db, fetch, actor)
    : kind === 'provider-normal' ? createLlmPlannerForProvider(db, 'openai', fetch, actor)
    : createStrongLlmPlannerForProvider(db, 'openai', fetch, actor);
  await expect(planner.plan(input)).resolves.toEqual({ assessment: 'completed' });
  expect(reserve).toHaveBeenCalledWith('SERVICE_QUERY', actor, expect.objectContaining({ requests: 1 }), expect.any(Array), 'neture');
  expect(reserve.mock.invocationCallOrder[0]).toBeLessThan(providerCall.mock.invocationCallOrder[0]);
  expect(providerCall).toHaveBeenCalledTimes(1);
  expect(providerCall).toHaveBeenCalledWith(expect.objectContaining({
    provider: kind.startsWith('provider-') ? 'openai' : 'gemini',
    config: expect.objectContaining({ model: kind.includes('strong') ? 'strong' : 'normal' }),
  }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ userId: actor, status: 'success' }));
});

it.each(['QUOTA_EXCEEDED', 'AI_QUOTA_UNAVAILABLE'])('text planner never dispatches after %s', async code => {
  reserve.mockRejectedValueOnce(new Error(code));
  await expect(createLlmPlanner(db, fetch, undefined, false, actor).plan(input)).rejects.toThrow(code);
  expect(providerCall).not.toHaveBeenCalled();
  expect(settle).not.toHaveBeenCalled();
});

it('invalid provider JSON is accounted once and not retried by parsing', async () => {
  providerCall.mockResolvedValueOnce({ content: 'unparseable', provider: 'gemini', model: 'normal', promptTokens: 12, completionTokens: 5, attempts: 1 } as ExecuteResult);
  await expect(createLlmPlanner(db, fetch, undefined, false, actor).plan(input)).rejects.toThrow('planner: no json');
  expect(providerCall).toHaveBeenCalledTimes(1);
  expect(settle).toHaveBeenCalledTimes(1);
});

it('text host rejects invalid prices before quota admission or a paid attempt', async () => {
  process.env.AI_PRICING_CATALOG = 'invalid';
  await expect(createLlmPlanner(db, fetch, undefined, false, actor).plan(input)).rejects.toThrow('AI_PRICING_INVALID');
  expect(reserve).not.toHaveBeenCalled();
  expect(providerCall).not.toHaveBeenCalled();
});

it('receipt persistence failure returns the generated plan without a second paid call', async () => {
  settle.mockRejectedValueOnce(new Error('receipt unavailable'));
  await expect(createStrongLlmPlanner(db, fetch, actor).plan(input)).resolves.toEqual({ assessment: 'completed' });
  expect(providerCall).toHaveBeenCalledTimes(1);
});

const schema = { id: 'catalog', fields: [{ key: 'label', description: '이름', required: true }] };
const profile = profileWorkbook({ sourceFormat: 'csv', sheets: [{ sheetName: 'Sheet1', matrix: [['이름'], ['테스트']] }] });
const inference = { confidence: 0.9, warnings: [], sheets: [{ sheetName: 'Sheet1', unmappedColumns: [], regions: [{ startRow: 0, headerRow: 0, dataStartRow: 1, confidence: 0.9, columns: [{ sourceColumn: 0, targetField: 'label', confidence: 0.9 }] }] }] };
function structureResponse() {
  providerCall.mockResolvedValueOnce({ content: JSON.stringify(inference), provider: 'gemini', model: 'normal', promptTokens: 12, completionTokens: 5, attempts: 1, requestId: 'synthetic-request' });
}

it('file service validates structure after paid settlement and keeps authenticated attribution', async () => {
  structureResponse();
  await expect(inferFileStructure({ profile, targetSchema: schema, resolveModel: () => 'normal', resolveApiKey: () => 'synthetic-key' },
    invocation => executeAccountedAi(db, invocation, { scope: 'SERVICE_QUERY', serviceKey: 'neture', userId: actor }))).resolves.toMatchObject({ model: 'normal', inference: { confidence: 0.9 } });
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ userId: actor }));
  expect(providerCall).toHaveBeenCalledTimes(1);
});

const app = express();
app.use(express.json());
app.use('/hospital', createHospitalRoutes());
it('public structure host is anonymous neture quota; body cannot invent a user or billing service', async () => {
  structureResponse();
  const r = await request(app).post('/hospital/ai/structure').send({ profile, targetSchema: schema, userId: 'forged-user', serviceKey: 'forged-service' });
  expect(r.status).toBe(200);
  expect(reserve).toHaveBeenCalledWith('SERVICE_QUERY', undefined, expect.anything(), expect.anything(), 'neture');
  expect(save.mock.calls[0][0].userId).toBeUndefined();
});

it('invalid public profile is rejected before quota admission or provider dispatch', async () => {
  await request(app).post('/hospital/ai/structure').send({ profile: {}, targetSchema: schema }).expect(400);
  expect(reserve).not.toHaveBeenCalled();
  expect(providerCall).not.toHaveBeenCalled();
});

it.each([['QUOTA_EXCEEDED', 429], ['AI_QUOTA_UNAVAILABLE', 503]] as const)('public structure reports %s and never calls provider', async (code, status) => {
  reserve.mockRejectedValueOnce(new Error(code));
  const r = await request(app).post('/hospital/ai/structure').send({ profile, targetSchema: schema });
  expect(r.status).toBe(status);
  expect(r.body.code).toBe(code);
  expect(providerCall).not.toHaveBeenCalled();
});
