const mockQuotaReserve = jest.fn(async (..._args: unknown[]) => ({ id: 'quota-reservation', warnings: [] }));
const mockQuotaSettle = jest.fn(async (..._args: unknown[]) => {});
jest.mock('../modules/ai-policy/ai-quota.service.js', () => ({ AiQuotaService: jest.fn().mockImplementation(() => ({ reserve: (...args: unknown[]) => mockQuotaReserve(...args), settle: (...args: unknown[]) => mockQuotaSettle(...args) })) }));
const mockExecute = jest.fn();
const mockSave = jest.fn(async (value: unknown) => value);
jest.mock('@o4o/ai-core', () => ({ ...jest.requireActual('@o4o/ai-core'), execute: (...args: unknown[]) => mockExecute(...args) }));
jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true, getRepository: () => ({ create: (v: unknown) => v, save: mockSave }) } }));
jest.mock('../services/ai-operations.service.js', () => ({ aiOperationsService: { recordRequest: jest.fn(), shouldAllowRequest: () => ({ allowed: true }), recordResult: jest.fn() } }));
jest.mock('../services/ai-card-exposure.service.js', () => ({ aiCardExposureService: { selectCards: () => [] } }));
import express from 'express';
import request from 'supertest';
import { AiQueryController } from '../controllers/ai/AiQueryController.js';
import { aiQueryService } from '../services/ai-query.service.js';
import { listServiceAiProfiles } from '../services/ai-extensions/service-query.extension.js';

const profiles = listServiceAiProfiles();
const app = express(); app.use(express.json());
app.use((req: any, _res, next) => { if (req.headers['x-test-auth']) req.user = { id: 'authenticated-actor' }; next(); });
app.post('/query', new AiQueryController().query as any);
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(aiQueryService, 'canQuery').mockResolvedValue({ allowed: true });
  jest.spyOn(aiQueryService, 'getPolicy').mockResolvedValue({ systemPrompt: '공통 정책', defaultModel: 'configured-model' } as any);
  jest.spyOn(aiQueryService as any, 'getApiKey').mockResolvedValue('synthetic-key');
  jest.spyOn(aiQueryService, 'getDailyUsage').mockResolvedValue({ used: 1, limit: 10, remaining: 9 });
  mockExecute.mockResolvedValue({ content: '답변', provider: 'gemini', model: 'configured-model', requestId: 'provider-run', promptTokens: 1, completionTokens: 2 });
});
afterEach(() => jest.restoreAllMocks());

it.each(profiles.map(p => p.serviceId))('HTTP request for %s runs its real Extension and preserves the query envelope', async serviceId => {
  const response = await request(app).post('/query').set('X-Test-Auth', 'yes').send({ serviceId, task: 'summary', question: '제공한 내용을 요약해 주세요', userId: 'forged-actor', storeId: 'foreign-store' });
  expect(response.status).toBe(200); expect(response.body).toMatchObject({ success: true, answer: '답변', remainingQueries: 9 });
  expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ meta: { service: serviceId, callerName: `${serviceId}.summary` }, config: expect.objectContaining({ model: 'configured-model' }) }));
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ userId: 'authenticated-actor', success: true }));
  expect(mockQuotaReserve).toHaveBeenCalledWith('SERVICE_QUERY', 'authenticated-actor', expect.objectContaining({ requests: 1 }), expect.any(Array), serviceId);
});
it('keeps old requests without service/task on the representative service', async () => {
  expect((await request(app).post('/query').set('X-Test-Auth', 'yes').send({ question: '기존 질문' })).status).toBe(200);
  expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ meta: { service: 'neture', callerName: 'neture.question' } }));
});
it('refuses unauthenticated calls before AI or persistence', async () => {
  expect((await request(app).post('/query').send({ question: '질문', serviceId: 'neture' })).status).toBe(401);
  expect(mockExecute).not.toHaveBeenCalled(); expect(mockSave).not.toHaveBeenCalled();
});
it.each([{ serviceId: 'k-cosmetics' }, { serviceId: 'unregistered' }, { serviceId: 'neture', task: 'delete' }])('refuses unsupported service or side-effect task %p', async body => {
  expect((await request(app).post('/query').set('X-Test-Auth', 'yes').send({ question: '질문', ...body })).status).toBe(400);
  expect(mockExecute).not.toHaveBeenCalled(); expect(mockSave).not.toHaveBeenCalled();
});
it('retains existing per-user quota rejection before a paid call', async () => {
  (aiQueryService.canQuery as jest.Mock).mockResolvedValue({ allowed: false, reason: '한도 초과' });
  expect((await request(app).post('/query').set('X-Test-Auth', 'yes').send({ question: '질문', serviceId: 'community' })).status).toBe(429);
  expect(mockExecute).not.toHaveBeenCalled();
});
it('missing AI connection does not pretend to produce a successful answer', async () => {
  (aiQueryService as any).getApiKey.mockResolvedValue('');
  const response = await request(app).post('/query').set('X-Test-Auth', 'yes').send({ question: '질문', serviceId: 'lecture' });
  expect(response.status).toBe(500); expect(response.body.errorCode).toBe('NO_API_KEY'); expect(mockExecute).not.toHaveBeenCalled();
});

it.each([['QUOTA_EXCEEDED',429],['AI_QUOTA_UNAVAILABLE',503]])('returns %s without a provider call or successful query log', async (code, status) => {
  mockQuotaReserve.mockRejectedValueOnce(new Error(code as string));
  const response = await request(app).post('/query').set('X-Test-Auth', 'yes').send({ question: '질문', serviceId: 'community' });
  expect(response.status).toBe(status); expect(response.body.errorCode).toBe(code);
  expect(mockExecute).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});
