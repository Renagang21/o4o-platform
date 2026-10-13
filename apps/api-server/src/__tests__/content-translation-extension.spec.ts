jest.mock('@o4o/ai-prompts/store', () => jest.requireActual('../../../../packages/ai-prompts/src/store/index.ts'), { virtual: true });
const execute = jest.fn();
jest.mock('../modules/ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute }) }));
import { ContentTranslationService } from '../modules/store-ai/services/content-ai-translation.service.js';
import logger from '../utils/logger.js';

const access = { actorId: 'actor-a', organizationId: 'store-a', contentId: 'content-a', authorize: jest.fn(async () => true) };
beforeEach(() => {
  jest.clearAllMocks();
  access.authorize.mockResolvedValue(true);
  execute.mockResolvedValue({ content: '{"title":"Translated","html":"<p>Translated</p>"}', provider: 'gemini', model: 'policy-model', requestId: 'p', promptTokens: 10, completionTokens: 20 });
  jest.spyOn(logger, 'info').mockImplementation(() => logger);
  jest.spyOn(logger, 'warn').mockImplementation(() => logger);
});
afterEach(() => jest.restoreAllMocks());

it('preserves the translation response and passes actor to existing per-user quota/log policy', async () => {
  const result = await new ContentTranslationService({} as any).translate('원문', '<p>원문</p>', 'en', access);
  expect(result).toMatchObject({ result: { title: 'Translated', html: '<p>Translated</p>' }, model: 'policy-model' });
  expect(execute).toHaveBeenCalledWith('CONTENT_TRANSLATION', expect.any(String), expect.any(String), { maxTokens: 6000, temperature: 0.2, userId: 'actor-a' });
  expect(logger.info).toHaveBeenCalledWith('[AI_EXTENSION]', expect.objectContaining({ stage: 'completed', provider: 'gemini', payer: 'platform' }));
});
it('does not invoke LLM when the existing domain authorization rejects', async () => {
  access.authorize.mockResolvedValue(false);
  expect(await new ContentTranslationService({} as any).translate('원문', '<p>원문</p>', 'en', access)).toBeNull();
  expect(execute).not.toHaveBeenCalled();
});
it('preserves null-on-failure and does not log source/generated content or provider errors', async () => {
  execute.mockRejectedValue(new Error('private provider response'));
  expect(await new ContentTranslationService({} as any).translate('private input', '<p>private input</p>', 'en', access)).toBeNull();
  expect(JSON.stringify((logger.warn as jest.Mock).mock.calls)).not.toContain('private');
});
it('refuses malformed generated data and records a business failure after provider usage', async () => {
  execute.mockResolvedValue({ content: '{"title":42,"html":"secret generated text"}', provider: 'openai', model: 'model-b', requestId: 'p', promptTokens: 1, completionTokens: 2 });
  expect(await new ContentTranslationService({} as any).translate('원문', '<p>원문</p>', 'en', access)).toBeNull();
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain('secret generated text');
  expect(logger.info).toHaveBeenCalledWith('[AI_EXTENSION]', expect.objectContaining({ stage: 'failed', errorCode: 'INVALID_RESPONSE' }));
});
