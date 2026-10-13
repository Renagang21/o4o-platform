const mockQuotaReserve = jest.fn(async (..._args: unknown[]) => ({ id: 'quota-reservation', warnings: [] }));
const mockQuotaSettle = jest.fn(async (..._args: unknown[]) => {});
jest.mock('../modules/ai-policy/ai-quota.service.js', () => ({ AiQuotaService: jest.fn().mockImplementation(() => ({ reserve: (...args: unknown[]) => mockQuotaReserve(...args), settle: (...args: unknown[]) => mockQuotaSettle(...args) })) }));
const mockExecute = jest.fn();
jest.mock('@o4o/ai-core', () => ({ ...jest.requireActual('@o4o/ai-core'), execute: (...args: unknown[]) => mockExecute(...args) }));
jest.mock('../utils/ai-provider-runtime.js', () => ({ resolveAiTarget: async () => ({ provider: 'openai', model: 'configured-model', apiKey: 'synthetic-key' }) }));
import { CopilotEngineService } from '../copilot/copilot-engine.service.js';
import { listServiceAiProfiles } from '../services/ai-extensions/service-query.extension.js';
const savedKey = process.env.GEMINI_API_KEY;
beforeEach(() => {
  jest.clearAllMocks(); process.env.GEMINI_API_KEY = 'synthetic-key';
  mockExecute.mockResolvedValue({ content: '{"summary":"현황 설명","recommendedActions":["검토"],"confidenceScore":0.8,"riskLevel":"low"}', provider: 'openai', model: 'configured-model', promptTokens: 1, completionTokens: 2, requestId: 'p' });
});
afterAll(() => { if (savedKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = savedKey; });
it.each(listServiceAiProfiles().map(p => p.serviceId))('operator summary for %s uses its Extension and the existing selected provider', async service => {
  const result = await new CopilotEngineService().generateInsights(service, { count: 4 }, { id: 'operator-a', role: 'platform:admin' });
  expect(result).toMatchObject({ source: 'ai', insights: [{ message: '현황 설명' }, { message: '검토' }] });
  expect(mockQuotaReserve).toHaveBeenCalledWith('OPERATOR_INSIGHT', 'operator-a', expect.objectContaining({ requests: 1 }), expect.any(Array), service);
  expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai', meta: { service, callerName: `${service}.operator-insight` } }));
});
it('rejects retired services and missing authenticated actors before provider invocation', async () => {
  const engine = new CopilotEngineService();
  await expect(engine.generateInsights('cosmetics', {}, { id: 'a', role: 'admin' })).rejects.toThrow();
  await expect(engine.generateInsights('neture', {}, { id: '', role: 'admin' })).rejects.toThrow();
  expect(mockExecute).not.toHaveBeenCalled();
});
it('preserves deterministic fallback on failed LLM instead of claiming AI success', async () => {
  mockExecute.mockRejectedValue(new Error('provider unavailable'));
  expect(await new CopilotEngineService().generateInsights('neture', {}, { id: 'a', role: 'admin' })).toMatchObject({ source: 'rule-based' });
});
