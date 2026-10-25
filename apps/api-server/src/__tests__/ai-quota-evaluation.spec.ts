import type { DataSource } from 'typeorm';
import { AiQuotaService, evaluateAiQuotaRows, type AiQuotaEvaluationRow } from '../modules/ai-policy/ai-quota.service.js';

const row = (extra: Partial<AiQuotaEvaluationRow> = {}): AiQuotaEvaluationRow => ({ layer: 'global', layerKey: '*', limitType: 'cost', period: 'daily', currentValue: '0.10000000', limitValue: '0.3000', warningThreshold: 80, ...extra });
const budget = { requests: 1, tokens: 10, cost: 0.2 };
it('admits an exact decimal cost boundary instead of comparing 0.1 + 0.2 as binary floating point', () => {
  expect(evaluateAiQuotaRows([row()], budget)).toMatchObject({ allowed: true, warnings: [{ usagePercent: 100 }], exceeded: [] });
  expect(evaluateAiQuotaRows([row({ limitValue: '0.29999999' })], budget).allowed).toBe(false);
});
it('includes separately supplied held capacity and uses the same equality semantics as live admission', () => {
  const rule = row({ reservedValue: '0.20000000', limitValue: '0.40000000' });
  expect(evaluateAiQuotaRows([rule], { ...budget, cost: 0.1 }).allowed).toBe(true);
  expect(evaluateAiQuotaRows([rule], { requests: 0, tokens: 0, cost: 0.1 }).allowed).toBe(false);
});
it('does not lose one cost unit when the database decimal has more precision than a JS sum', () => {
  const rule = row({ currentValue: '90071992.54740990', limitValue: '90071992.54740990' });
  expect(evaluateAiQuotaRows([rule], { ...budget, cost: 0.00000001 }).allowed).toBe(false);
});
it.each(['requests', 'tokens'])('preserves %s boundary and prospective overflow behavior', limitType => {
  const rule = row({ limitType, currentValue: 1, reservedValue: 1, limitValue: 3 });
  expect(evaluateAiQuotaRows([rule], { requests: 1, tokens: 1, cost: 0 }).allowed).toBe(true);
  expect(evaluateAiQuotaRows([rule], { requests: 2, tokens: 2, cost: 0 }).allowed).toBe(false);
});
it('keeps missing/invalid usage and rule dimensions unavailable instead of assuming zero', () => {
  expect(() => evaluateAiQuotaRows([row({ currentValue: NaN })], budget)).toThrow('AI_QUOTA_INVALID');
  expect(() => evaluateAiQuotaRows([row({ limitType: 'unknown' })], budget)).toThrow('AI_QUOTA_INVALID');
  expect(() => evaluateAiQuotaRows([], { ...budget, cost: NaN })).toThrow('AI_USAGE_INVALID');
});
it('uses the same calculation for administrator status and returns a canonical decimal sum', async () => {
  const query = jest.fn(async () => [row({ reservedValue: '0.20000000' })]);
  const result = await new AiQuotaService({ query } as unknown as DataSource).getStatus();
  expect(result[0]).toMatchObject({ currentValue: 0.1, reservedValue: 0.2, projectedValue: 0.3, status: 'exceeded', usagePercent: 100 });
});
