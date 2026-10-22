const execute = jest.fn();
jest.mock('../../ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute }) }));
import { createConsultationTranslator } from '../services/consultation-translator.js';
import logger from '../../../utils/logger.js';

beforeEach(() => {
  jest.clearAllMocks();
  execute.mockResolvedValue({ content: '{"translation":"Private translated utterance"}', provider: 'gemini', model: 'policy-model', requestId: 'provider-id', promptTokens: 10, completionTokens: 5 });
  jest.spyOn(logger, 'info').mockImplementation(() => logger);
});
afterEach(() => jest.restoreAllMocks());
const input = { text: 'Private original utterance', source: 'ko' as const, target: 'en' as const };
const access = () => ({ actorId: 'actor', organizationId: 'store', authorize: jest.fn(async () => true) });
it('reuses existing policy and actor quota while recording only execution metadata', async () => {
  expect(await createConsultationTranslator({} as any)(input, access())).toEqual({ translation: 'Private translated utterance' });
  expect(execute).toHaveBeenCalledWith('CONTENT_TRANSLATION', expect.any(String), expect.any(String), expect.objectContaining({ userId: 'actor', temperature: 0, usage: 'pharmacy.consultation' }));
  const recorded = JSON.stringify((logger.info as jest.Mock).mock.calls);
  expect(recorded).not.toContain('Private');
  expect(recorded).toContain('provider-completed');
});
it('blocks the provider when domain permission is not present', async () => {
  const denied = access(); denied.authorize.mockResolvedValue(false);
  await expect(createConsultationTranslator({} as any)(input, denied)).rejects.toMatchObject({ httpStatus: 503 });
  expect(execute).not.toHaveBeenCalled();
});
it('distinguishes quota failure and hides provider details from responses and logs', async () => {
  execute.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));
  await expect(createConsultationTranslator({} as any)(input, access())).rejects.toMatchObject({ httpStatus: 429 });
  execute.mockRejectedValueOnce(new Error('Private provider details'));
  await expect(createConsultationTranslator({} as any)(input, access())).rejects.toMatchObject({ message: expect.not.stringContaining('Private') });
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain('Private');
});
it.each(['20 mg', '10 mcg'])('does not return a translation that changes a numeric amount or unit: %s', async translation => {
  execute.mockResolvedValueOnce({ content: JSON.stringify({ translation }), provider: 'gemini', model: 'policy-model', requestId: 'provider-id', promptTokens: 10, completionTokens: 5 });
  await expect(createConsultationTranslator({} as any)({ text: '10 mg', source: 'ko', target: 'en' }, access())).rejects.toMatchObject({ httpStatus: 503 });
  expect(logger.info).toHaveBeenCalledWith('[AI_EXTENSION]', expect.objectContaining({ stage: 'failed', errorCode: 'INVALID_RESPONSE' }));
});
it('allows numbers to follow target-language word order while keeping their values', async () => {
  execute.mockResolvedValueOnce({ content: '{"translation":"2 tablets, 3 times daily"}', provider: 'gemini', model: 'policy-model', requestId: 'provider-id', promptTokens: 10, completionTokens: 5 });
  await expect(createConsultationTranslator({} as any)({ text: '하루 3회 2정', source: 'ko', target: 'en' }, access())).resolves.toEqual({ translation: '2 tablets, 3 times daily' });
});
it.each([
  ['10 mg, 5 mL.', '5 mL; 10 mg.'],
  ['0.9%, 20 mmol, 7 mEq, 5 mcg', '5 mcg; 7 mEq; 20 mmol; 0.9%'],
])('preserves quantities across punctuation and word order: %s', async (text, translation) => {
  execute.mockResolvedValueOnce({ content: JSON.stringify({ translation }), provider: 'gemini', model: 'policy-model', requestId: 'provider-id', promptTokens: 10, completionTokens: 5 });
  await expect(createConsultationTranslator({} as any)({ text, source: 'ko', target: 'en' }, access())).resolves.toEqual({ translation });
});
it('does not treat a unit prefix inside a longer word as an interchangeable quantity unit', async () => {
  execute.mockResolvedValueOnce({ content: '{"translation":"10 mg"}', provider: 'gemini', model: 'policy-model', requestId: 'provider-id', promptTokens: 10, completionTokens: 5 });
  await expect(createConsultationTranslator({} as any)({ text: '10 mgX', source: 'ko', target: 'en' }, access())).rejects.toMatchObject({ httpStatus: 503 });
});
