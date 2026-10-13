const mockQuotaReserve = jest.fn(async (..._args: unknown[]) => ({ id: 'quota-reservation', warnings: [] }));
const mockQuotaSettle = jest.fn(async (..._args: unknown[]) => {});
jest.mock('../modules/ai-policy/ai-quota.service.js', () => ({ AiQuotaService: jest.fn().mockImplementation(() => ({ reserve: (...args: unknown[]) => mockQuotaReserve(...args), settle: (...args: unknown[]) => mockQuotaSettle(...args) })) }));
const mockExecute = jest.fn();
jest.mock('@o4o/ai-core', () => ({ ...jest.requireActual('@o4o/ai-core'), execute: (...args: unknown[]) => mockExecute(...args) }));
import { LmsAIService } from '../modules/ai/services/LmsAIService.js';
import { OperatorAiLlmService } from '../modules/neture/services/operator-ai-llm.service.js';
import { lmsAssistanceExtension } from '../modules/ai/services/lms-assistance.extension.js';
import { operatorActionsExtension } from '../modules/neture/services/operator-actions.extension.js';

const quiz = { questions: [{ id: 'q', question: '질문', correctAnswer: 'a' }], userAnswers: [{ questionId: 'q', answer: 'b', isCorrect: false }] };
const ctx = { pendingApprovals: 0, pendingSuppliers: 1, uncuratedProducts: 0, pendingInquiries: 3, activeProducts: 2, pendingRegs: 0 };
const originalGemini = process.env.GEMINI_API_KEY;
const originalOpenai = process.env.OPENAI_API_KEY;
beforeEach(() => { jest.clearAllMocks(); process.env.GEMINI_API_KEY = 'synthetic-key'; delete process.env.OPENAI_API_KEY; });
afterAll(() => { if (originalGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalGemini; if (originalOpenai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalOpenai; });

it('LMS quiz uses business prompt/output normalization and common execution events', async () => {
  mockExecute.mockResolvedValue({ content: '{"summary":"설명","insights":["좋음",2],"recommendations":["복습"]}', model: 'm', provider: 'gemini', promptTokens: 1, completionTokens: 2, requestId: 'p' });
  expect(await LmsAIService.getInstance().analyzeQuiz(quiz, 'learner-a')).toEqual({ summary: '설명', insights: ['좋음'], recommendations: ['복습'] });
  expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ systemPrompt: expect.stringContaining('LMS tutor'), userPrompt: expect.stringContaining('correct:') }));
});
it('LMS keeps assignment fallback for unavailable provider and refuses anonymous actors', async () => {
  mockExecute.mockRejectedValue(new Error('AI_NOT_CONFIGURED'));
  expect(await LmsAIService.getInstance().feedbackAssignment({ submissionContent: '답안' }, 'learner-a')).toMatchObject({ recommendations: [expect.stringContaining('AI 키')] });
  await expect(LmsAIService.getInstance().analyzeQuiz(quiz, '')).rejects.toThrow('AUTH_REQUIRED');
});
it('LMS no-key fallback does not issue a paid call', async () => {
  delete process.env.GEMINI_API_KEY;
  expect(await LmsAIService.getInstance().analyzeQuiz(quiz, 'a')).toMatchObject({ insights: [expect.any(String)] });
  expect(mockExecute).not.toHaveBeenCalled();
});
it('Neture cache is isolated by actor and metrics and recommendations are not executed', async () => {
  mockExecute.mockResolvedValue({ content: '[{"type":"supplier","priority":"high","reason":"검토 필요","confidence":0.9}]', model: 'm', provider: 'gemini', promptTokens: 1, completionTokens: 2, requestId: 'p' });
  const service = new OperatorAiLlmService();
  const actions = await service.generate(ctx, 'operator-a');
  expect(actions).toMatchObject([{ actionType: 'NAVIGATE', actionUrl: '/operator/suppliers' }]);
  await service.generate(ctx, 'operator-a'); expect(mockExecute).toHaveBeenCalledTimes(1);
  await service.generate(ctx, 'operator-b'); expect(mockExecute).toHaveBeenCalledTimes(2);
  await service.generate({ ...ctx, pendingSuppliers: 2 }, 'operator-a'); expect(mockExecute).toHaveBeenCalledTimes(3);
});
it('Neture rejects removed action types and low-confidence suggestions', () => {
  expect(operatorActionsExtension.parse('[{"type":"curation","priority":"high","reason":"제안","confidence":0.9},{"type":"supplier","priority":"high","reason":"제안","confidence":0.1}]')).toEqual([]);
});
it('LMS Extension validates quiz structure before a provider can be invoked', () => {
  expect(() => lmsAssistanceExtension.prepare({ kind: 'quiz', payload: {} as any }, {} as any)).toThrow();
});
