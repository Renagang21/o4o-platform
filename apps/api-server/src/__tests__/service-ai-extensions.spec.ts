import { runAiExtension } from '@o4o/ai-core';
import type { AiExecutionContext, AiExtensionEvent } from '@o4o/ai-core';
import { O4O_SERVICES } from '../config/service-catalog.js';
import { isRetiredRoleValue } from '../middleware/retired-service.middleware.js';
import { listServiceAiProfiles, resolveServiceAiProfile, createServiceQueryExtension, SERVICE_AI_TASKS } from '../services/ai-extensions/service-query.extension.js';
import { createOperatorInsightExtension } from '../services/ai-extensions/operator-insight.extension.js';

const profiles = listServiceAiProfiles();
it('covers every current canonical service without maintaining a second service identity list', () => {
  expect(profiles.map(p => p.serviceId)).toEqual(O4O_SERVICES.filter(s => !isRetiredRoleValue(s.key)).map(s => s.key));
  expect(profiles).toHaveLength(9);
  expect(resolveServiceAiProfile('partner-support')?.constraints.join(' ')).toContain('협의·계약·보상 판정에 관여하지 않는다');
  expect(resolveServiceAiProfile('kpa')?.serviceId).toBe('kpa-society');
});
it.each(['cosmetics', 'k-cosmetics', 'pharmacy-hub', 'siteguide', 'unknown', '', null, {}])('does not revive retired/unrecognized service %p', service => {
  expect(resolveServiceAiProfile(service)).toBeUndefined();
});

for (const profile of profiles) {
  describe(profile.serviceId, () => {
    it.each(SERVICE_AI_TASKS)('executes %s through the common Core with isolated service rules', async task => {
      const extension = createServiceQueryExtension(profile, task);
      const events: AiExtensionEvent[] = [];
      const context: AiExecutionContext = { requestId: 'r', serviceId: profile.serviceId, featureId: task, actorId: 'actor-a', audience: 'staff' };
      const invoke = jest.fn(async () => ({ content: '검토용 결과', provider: 'independent-provider', model: 'selected-model', promptTokens: 4, completionTokens: 5, requestId: 'p' }));
      const result = await runAiExtension({ extension, input: { profile, task, systemPrompt: '공통 정책', question: '제공한 자료를 도와주세요' }, context, materials: [], funding: { payer: 'platform' } }, { invoke }, {
        authorize: async ctx => ctx.actorId === 'actor-a', record: async event => { events.push(event); },
      });
      expect(result.output).toBe('검토용 결과');
      expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ systemPrompt: expect.stringContaining(profile.constraints[0]) }), context, { payer: 'platform' });
      expect(events.map(e => e.stage)).toEqual(['started', 'provider-completed', 'completed']);
      expect(events[0]).toMatchObject({ extensionId: `${profile.serviceId}.${task}`, operation: task === 'draft' ? 'draft' : 'read' });
    });
    it('rejects cross-service context instead of silently switching Extensions', async () => {
      const extension = createServiceQueryExtension(profile, 'question');
      expect(() => extension.prepare({ profile, task: 'question', systemPrompt: '', question: '질문' }, { requestId: 'r', serviceId: 'foreign-service', featureId: 'question', actorId: 'a', audience: 'staff' })).toThrow();
    });
    it('supports operator insights with the same provider-neutral contract', () => {
      const extension = createOperatorInsightExtension(profile);
      const output = extension.parse('{"summary":"요약","recommendedActions":["확인"],"confidenceScore":0.8}');
      expect(output.summary).toBe('요약');
      expect(output.recommendedActions).toEqual(['확인']);
    });
  });
}

it('public principal is restricted to guest-safe read requests and never receives staff material', async () => {
  const profile = profiles[0]; const extension = createServiceQueryExtension(profile, 'question');
  const invoke = jest.fn(async () => ({ content: '공개 답변', provider: 'p', model: 'm', promptTokens: 1, completionTokens: 1, requestId: 'p' }));
  const context: AiExecutionContext = { requestId: 'r', serviceId: profile.serviceId, featureId: 'question', principal: 'public', audience: 'consumer' };
  const input = { profile, task: 'question' as const, systemPrompt: '', question: '공개 질문' };
  const host = { authorize: jest.fn(async () => true), record: async () => {} };
  expect((await runAiExtension({ extension, input, context, materials: [], funding: { payer: 'platform' } }, { invoke }, host)).output).toBe('공개 답변');
  invoke.mockClear();
  for (const override of [{ materials: [{ id: 'internal', kind: 'staff', audience: 'staff' as const }] }, { context: { ...context, audience: 'staff' as const } }, { extension: { ...extension, operation: 'draft' as const } }, { context: { ...context, actorId: 'fabricated-actor' } }]) {
    await expect(runAiExtension({ extension, input, context, materials: [], funding: { payer: 'platform' }, ...override }, { invoke }, host)).rejects.toMatchObject({ code: 'INVALID_CONTEXT' });
  }
  expect(invoke).not.toHaveBeenCalled();
});
