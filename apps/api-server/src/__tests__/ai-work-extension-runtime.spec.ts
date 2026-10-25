import type { DataSource } from 'typeorm';
import { runAiExtension, type AiBusinessExtension } from '@o4o/ai-core';
import { createAccountedExtensionRuntime } from '../services/ai-extensions/accounted-runtime.js';
import { createPolicyExtensionRuntime } from '../services/ai-extensions/policy-runtime.js';
import { executeAccountedAi } from '../modules/ai-policy/ai-accounted-execution.js';
import { prepareManagedAiRequest } from '../services/ai-management/runtime-models.js';

jest.mock('../modules/ai-policy/ai-accounted-execution.js', () => ({ executeAccountedAi: jest.fn() }));
jest.mock('../services/ai-management/runtime-models.js', () => ({ prepareManagedAiRequest: jest.fn() }));
const db = {} as DataSource;
const response = { content: '{"summary":"fixture"}', provider: 'openai', model: 'fixture-model', promptTokens: 10, completionTokens: 5, requestId: 'provider-fixture' };
const extension: AiBusinessExtension<string, unknown> = {
  id: 'fixture.read', operation: 'read', prepare: text => ({ systemPrompt: 'fixture', userPrompt: text }), parse: text => JSON.parse(text),
};
const request = { extension, input: 'private-fixture', context: { requestId: 'request-fixture', serviceId: 'neture', featureId: 'fixture', actorId: 'actor-fixture', audience: 'staff' as const }, materials: [], funding: { payer: 'platform' as const } };
beforeEach(() => {
  jest.clearAllMocks();
  (executeAccountedAi as jest.Mock).mockResolvedValue(response);
  (prepareManagedAiRequest as jest.Mock).mockImplementation(async (_db, _usage, value) => ({ ...value, provider: 'openai' }));
});
function runtime(userId?: string) {
  return createAccountedExtensionRuntime(db, {
    usage: 'lms.quiz', request: { config: { apiKey: 'fixture-key', model: 'fixture-model' } },
    accounting: { scope: 'LMS_ASSISTANCE', serviceKey: 'lecture', userId },
  });
}
it('denies access before resolving a model or making an accounted call', async () => {
  await expect(runAiExtension(request, runtime(), { authorize: async () => false, record: async () => {} })).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect(prepareManagedAiRequest).not.toHaveBeenCalled();
  expect(executeAccountedAi).not.toHaveBeenCalled();
});
it('uses the managed request, keeps verified accounting attribution, and records metadata only', async () => {
  const record = jest.fn(async () => {});
  await runAiExtension(request, runtime('actor-fixture'), { authorize: async () => true, record });
  expect(executeAccountedAi).toHaveBeenCalledWith(db, expect.objectContaining({ provider: 'openai', userPrompt: 'private-fixture' }), { scope: 'LMS_ASSISTANCE', serviceKey: 'lecture', userId: 'actor-fixture' });
  expect(JSON.stringify(record.mock.calls)).not.toContain('private-fixture');
  expect(JSON.stringify(record.mock.calls)).not.toContain('fixture-key');
});
it('does not repeat a successful provider call when output parsing fails', async () => {
  (executeAccountedAi as jest.Mock).mockResolvedValue({ ...response, content: 'invalid JSON' });
  await expect(runAiExtension(request, runtime(), { authorize: async () => true, record: async () => {} })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  expect(executeAccountedAi).toHaveBeenCalledTimes(1);
});
it('keeps scheduled platform work outside user attribution', async () => {
  await runAiExtension(request, runtime(undefined), { authorize: async () => true, record: async () => {} });
  expect(executeAccountedAi).toHaveBeenCalledWith(db, expect.anything(), expect.objectContaining({ userId: undefined }));
});
it('rejects a different accounting actor before selecting or invoking a model', async () => {
  await expect(runAiExtension(request, runtime('other-actor'), { authorize: async () => true, record: async () => {} })).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect(prepareManagedAiRequest).not.toHaveBeenCalled();
  expect(executeAccountedAi).not.toHaveBeenCalled();
});
it('uses the existing policy and current context actor, and refuses another payer', async () => {
  const execute = jest.fn().mockResolvedValue(response);
  const adapter = createPolicyExtensionRuntime({ execute }, 'CONTENT_TRANSLATION', { usage: 'pharmacy.consultation', maxTokens: 1000 });
  await runAiExtension(request, adapter, { authorize: async () => true, record: async () => {} });
  expect(execute).toHaveBeenCalledWith('CONTENT_TRANSLATION', 'fixture', 'private-fixture', { usage: 'pharmacy.consultation', maxTokens: 1000, userId: 'actor-fixture' });
  execute.mockClear();
  await expect(runAiExtension({ ...request, funding: { payer: 'user' } }, adapter, { authorize: async () => true, record: async () => {} })).rejects.toMatchObject({ code: 'FUNDING_UNSUPPORTED' });
  expect(execute).not.toHaveBeenCalled();
});
