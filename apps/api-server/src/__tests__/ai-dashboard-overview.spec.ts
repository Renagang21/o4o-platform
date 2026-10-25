import type { DataSource } from 'typeorm';
import { explainOverview, loadStoreOverviewEvidence } from '../services/ai-extensions/dashboard-overview.service.js';
import { resolveServiceAiProfile } from '../services/ai-extensions/service-query.extension.js';

const evidence = { collectedAt: '2026-10-24T00:00:00Z', metrics: { products: { label: '상품', value: 0 }, requests: { label: '상담 요청', value: null } } };
const output = { summary: '확인한 상품은 0개이며 상담 요청은 확인이 필요합니다.', recommendedActions: ['기존 화면에서 확인'], confidenceScore: 0.5, riskLevel: 'low' };
const profile = resolveServiceAiProfile('neture')!;
function setup() {
  const load = jest.fn(async () => evidence), authorize = jest.fn(async () => true);
  const invoke = jest.fn(async (prompt: { systemPrompt: string; userPrompt: string }) => {
    void prompt;
    return { content: JSON.stringify(output), provider: 'gemini', model: 'fixture', requestId: 'p', promptTokens: 1, completionTokens: 1 };
  });
  return { actorId: 'actor-fixture', profile, featureId: 'store.overview', load, authorize, runtime: { invoke } };
}
it('retains confirmed zero and unknown separately and sends no domain identifiers or client metrics', async () => {
  const input = setup();
  expect(await explainOverview(input)).toMatchObject({ ...output, evidence });
  const prompt = input.runtime.invoke.mock.calls[0][0] as { userPrompt: string };
  expect(JSON.parse(prompt.userPrompt)).toEqual(evidence);
  expect(prompt.userPrompt).not.toContain('actor-fixture');
});
it('does not load data or invoke a provider when the domain denies the actor', async () => {
  const input = setup(); input.authorize.mockResolvedValue(false);
  await expect(explainOverview(input)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect(input.load).not.toHaveBeenCalled(); expect(input.runtime.invoke).not.toHaveBeenCalled();
});
it('does not call a provider when all sources are unavailable', async () => {
  const input = setup(); input.load.mockResolvedValue({ ...evidence, metrics: { products: { label: '상품', value: null }, requests: { label: '요청', value: null } } });
  await expect(explainOverview(input)).rejects.toMatchObject({ code: 'METRICS_UNAVAILABLE' });
  expect(input.runtime.invoke).not.toHaveBeenCalled();
});
it('does not deliver a result if access is revoked while the provider is running', async () => {
  const input = setup(); input.authorize.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(explainOverview(input)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect(input.runtime.invoke).toHaveBeenCalledTimes(1);
});
it('keeps the organization bound in every read and does not turn a query failure into zero', async () => {
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    void params;
    if (sql.includes('store_execution_assets')) throw new Error('fixture failure');
    return [{ count: 0 }];
  });
  const result = await loadStoreOverviewEvidence({ query } as unknown as DataSource, 'organization-fixture');
  expect(result.metrics.materials.value).toBeNull(); expect(result.metrics.products.value).toBe(0);
  for (const call of query.mock.calls) expect(call[1]).toEqual(['organization-fixture']);
});
