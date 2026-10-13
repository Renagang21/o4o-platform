jest.mock('@o4o/ai-prompts/store', () => jest.requireActual('../../../../packages/ai-prompts/src/store/index.ts'), { virtual: true });
import { runAiExtension, AiExtensionError } from '@o4o/ai-core';
import type { AiExtensionEvent, AiFunding } from '@o4o/ai-core';
import { contentTranslationExtension } from '../modules/store-ai/services/content-translation.extension.js';

const context = { requestId: 'request-a', serviceId: 'neture', featureId: 'content.translation', actorId: 'actor-a', organizationId: 'store-a', audience: 'staff' as const };
const material = { id: 'content-a', kind: 'store-content', audience: 'staff' as const };
function harness() {
  const events: AiExtensionEvent[] = [];
  const authorize = jest.fn(async () => true);
  const record = jest.fn(async (event: AiExtensionEvent) => { events.push(event); });
  const invoke = jest.fn(async () => ({ content: JSON.stringify({ title: 'Translated', html: '<p>Translated</p>' }), provider: 'provider-a', model: 'model-a', requestId: 'provider-request', promptTokens: 10, completionTokens: 20 }));
  const request = { extension: contentTranslationExtension, input: { title: '원문', html: '<p>원문</p>', targetLocale: 'en' as const }, context, materials: [material], funding: { payer: 'platform' } as AiFunding };
  return { events, authorize, record, invoke, request, run: () => runAiExtension(request, { invoke }, { authorize, record }) };
}

describe('provider-neutral business Extension workflow', () => {
  it('translates through two interchangeable runtimes without changing the Extension', async () => {
    for (const provider of ['provider-a', 'external-assistant']) {
      const h = harness(); h.invoke.mockResolvedValue({ content: '{"title":"T","html":"<p>T</p>"}', provider, model: 'selected-model', requestId: 'p', promptTokens: 1, completionTokens: 2 });
      const result = await h.run();
      expect(result.output).toEqual({ title: 'T', html: '<p>T</p>' });
      expect(result.invocation.provider).toBe(provider);
      expect(h.events.map(e => e.stage)).toEqual(['started', 'provider-completed', 'completed']);
      expect(h.events[1]).toMatchObject({ provider, providerRequestId: 'p', promptTokens: 1, completionTokens: 2, context });
      expect(JSON.stringify(h.events)).not.toContain('원문');
    }
  });
  it('refuses domain access before reading input or invoking a provider', async () => {
    const h = harness(); h.authorize.mockResolvedValue(false);
    const prepare = jest.fn(); h.request.extension = { ...contentTranslationExtension, prepare };
    await expect(h.run()).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(prepare).not.toHaveBeenCalled(); expect(h.invoke).not.toHaveBeenCalled();
  });
  it('does not expose staff materials to consumers even if the domain callback allows access', async () => {
    const h = harness(); h.request.context = { ...context, audience: 'consumer' } as typeof context;
    await expect(h.run()).rejects.toMatchObject({ code: 'MATERIAL_SCOPE_DENIED' });
    expect(h.invoke).not.toHaveBeenCalled();
  });
  it('requires an authenticated actor and a supported read/draft operation', async () => {
    const h = harness(); h.request.context = { ...context, actorId: '' };
    await expect(h.run()).rejects.toMatchObject({ code: 'INVALID_CONTEXT' });
    h.request.context = context; h.request.extension = { ...contentTranslationExtension, operation: 'publish' } as unknown as typeof contentTranslationExtension;
    await expect(h.run()).rejects.toMatchObject({ code: 'INVALID_CONTEXT' });
    expect(h.invoke).not.toHaveBeenCalled();
  });
  it.each<AiFunding>([{ payer: 'platform' }, { payer: 'store' }, { payer: 'user' }, { payer: 'external-account', accountRef: 'connection-ref' }])('passes the selected funding policy to the runtime: %o', async funding => {
    const h = harness(); h.request.funding = funding; await h.run();
    expect(h.invoke).toHaveBeenCalledWith(expect.anything(), context, funding);
    expect(h.events[0].payer).toBe(funding.payer);
  });
  it('records charged provider usage even when business output is invalid', async () => {
    const h = harness(); h.invoke.mockResolvedValue({ content: '{"wrong":true}', provider: 'p', model: 'm', requestId: 'p', promptTokens: 2, completionTokens: 3 });
    await expect(h.run()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(h.events.map(e => e.stage)).toEqual(['started', 'provider-completed', 'failed']);
    expect(h.events[1].completionTokens).toBe(3);
  });
  it.each([['AI_NOT_CONFIGURED: secret detail', 'NOT_CONFIGURED'], ['QUOTA_EXCEEDED: internal data', 'QUOTA_EXCEEDED'], ['HTTP failure containing private data', 'PROVIDER_FAILED']])('normalizes failure without leaking external details: %s', async (message, code) => {
    const h = harness(); h.invoke.mockRejectedValue(new Error(message));
    await expect(h.run()).rejects.toMatchObject({ code });
    expect(JSON.stringify(h.events)).not.toContain(message);
    expect(h.events.at(-1)).toMatchObject({ stage: 'failed', errorCode: code });
  });
  it('does not call the provider if execution history cannot be recorded', async () => {
    const h = harness(); h.record.mockRejectedValue(new Error('unavailable'));
    await expect(h.run()).rejects.toBeInstanceOf(AiExtensionError);
    expect(h.invoke).not.toHaveBeenCalled();
  });
  it('rejects invalid input without starting a paid call', async () => {
    const h = harness(); h.request.input = { title: '', html: '', targetLocale: 'en' };
    await expect(h.run()).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(h.invoke).not.toHaveBeenCalled();
  });
});

it('retains sanitized accounting outage codes through the common Extension boundary', async () => {
  const context = { requestId: 'request', serviceId: 'neture', featureId: 'draft', actorId: 'actor', audience: 'staff' as const };
  const prepare = jest.fn(() => ({ systemPrompt: 's', userPrompt: 'u' }));
  const parse = jest.fn();
  const record = jest.fn(async () => {});
  await expect(runAiExtension({ extension: { id: 'test', operation: 'draft', prepare, parse }, input: {}, context, materials: [], funding: { payer: 'platform' } },
    { invoke: async () => { throw new Error('AI_QUOTA_UNAVAILABLE'); } }, { authorize: async () => true, record })).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
  expect(parse).not.toHaveBeenCalled();
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ stage: 'failed', errorCode: 'AI_QUOTA_UNAVAILABLE' }));
});
