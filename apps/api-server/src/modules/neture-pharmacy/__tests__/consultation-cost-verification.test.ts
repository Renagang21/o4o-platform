/** Real service/extension orchestration, synthetic DB and provider boundary only.
 * Never calls a paid provider or writes operational data. Counts are not billing.
 */
const execute = jest.fn(), assertEnabled = jest.fn(async () => {});
jest.mock('../../ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute, assertEnabled }) }));
import { ConsultationGuidanceService } from '../services/consultation-guidance.js';
import { createConsultationGuidanceSelector } from '../services/consultation-guidance.extension.js';
import { createConsultationTranslator } from '../services/consultation-translator.js';
import { ConsultationSupportService } from '../services/consultation-support.js';
import { createConsultationSupportRunner } from '../services/consultation-support.extension.js';
import { NeturePharmacyError } from '../constants.js';
import logger from '../../../utils/logger.js';

const productId = '55555555-5555-4555-8555-555555555555';
const session = '00000000-0000-4000-8000-000000000001';
type Stage = 'plan' | 'select' | 'translate' | 'draft';
function fixture() {
  const state = { allowed: true, revision: 'v1', text: '합성 시험 상품의 게시된 사실입니다.', tone: 'neutral' as 'neutral' | 'friendly' };
  const calls: Record<Stage, number> = { plan: 0, select: 0, translate: 0, draft: 0 };
  execute.mockImplementation(async (_scope: string, system: string, raw: string) => {
    const input = JSON.parse(raw);
    let stage: Stage, output: unknown;
    if (system.startsWith('Read the current pharmacy conversation')) {
      stage = 'plan'; output = { needsProduct: true, terms: ['합성'], clarification: null };
    } else if (system.startsWith('Select up to three supplied published product passages')) {
      stage = 'select'; output = { passageIds: [1] };
    } else if (system.startsWith('Help a pharmacist review')) {
      stage = 'draft'; output = { productFacts: [{ text: input.sources[0].text, sourceIds: [input.sources[0].id] }], professionalNotes: [], nextQuestion: null,
        customerDraft: { text: '검토할 합성 시험 설명입니다.', sourceIds: [input.sources[0].id] } };
    } else if (_scope === 'CONTENT_TRANSLATION') {
      stage = 'translate'; output = { translation: 'Synthetic published product information.' };
    } else throw new Error('Unexpected provider boundary');
    calls[stage]++;
    return { content: JSON.stringify(output), provider: 'gemini', model: 'synthetic-policy-model', requestId: 'synthetic-request', promptTokens: 10, completionTokens: 5 };
  });
  const query = jest.fn(async (sql: string, args: unknown[]) => {
    if (sql.includes('WITH products') || sql.includes('WITH eligible')) return [{ id: productId, kind: 'local', name: '합성 시험 상품', location: 'A', metadata: '합성', knowledge: null }];
    if (sql.includes('FROM store_multilingual_product_content_groups')) return [{ id: 'group', title: '합성 게시 자료', defaultLocale: 'ko', publicKey: 'synthetic', updatedAt: state.revision }];
    if (sql.includes('FROM store_multilingual_product_content_pages')) return [{ id: 'page', locale: 'ko', title: '합성 자료', summary: state.text,
      content: { html: '<p>합성 시험 주의사항입니다.</p>' }, status: 'published', updatedAt: state.revision }];
    throw new Error(`Unexpected fixture query: ${args?.length}`);
  });
  const authorize = async (actor: string, org: string) => {
    if (!state.allowed || actor !== 'pharmacist' || org !== 'store') throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', 'Denied');
  };
  const db = { query } as never;
  const guidance = new ConsultationGuidanceService(db, authorize, async () => {}, createConsultationGuidanceSelector(db), createConsultationTranslator(db),
    async () => ({ tone: state.tone, formality: 'polite', length: 'standard' }));
  const support = new ConsultationSupportService(guidance, createConsultationSupportRunner(db));
  const request = (reuseSession?: string) => ({ mode: 'floor-pharmacist', productKind: 'local', productId, question: '합성 시험 상품 설명', ...(reuseSession ? { reuseSession } : {}) });
  const flow = async (reuseSession?: string) => {
    const input = request(reuseSession);
    const search = await guidance.searchSupportProducts('pharmacist', 'store', input);
    const selected = await guidance.prepare('pharmacist', 'store', { ...input, intent: 'product-details', language: 'en', useAi: true, translateMaterial: true });
    const draft = await support.prepare('pharmacist', 'store', input);
    return { search, card: selected.card, draft };
  };
  return { state, calls, query, flow, support, guidance, request };
}
beforeEach(() => {
  jest.clearAllMocks();jest.useFakeTimers({ now: new Date('2026-11-12T00:00:00Z') });
  jest.spyOn(logger, 'info').mockImplementation(() => logger);
});
afterEach(() => { jest.useRealTimers();jest.restoreAllMocks(); });
it('compares a whole repeated consultation: eight provider boundaries become four with identical validated output', async () => {
  const baseline = fixture(), original = await baseline.flow();
  expect(await baseline.flow()).toEqual(original);
  expect(baseline.calls).toEqual({ plan: 2, select: 2, translate: 2, draft: 2 });
  const cached = fixture(), first = await cached.flow(session), reads = cached.query.mock.calls.length;
  expect(await cached.flow(session)).toEqual(first);
  expect(first).toEqual(original);
  expect(cached.calls).toEqual({ plan: 1, select: 1, translate: 1, draft: 1 });
  expect(cached.query.mock.calls.length).toBeGreaterThan(reads);
  expect(cached.query.mock.calls.every(([sql]) => !/\b(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(true);
  console.log('[CONSULTATION_COST_VERIFICATION]', JSON.stringify({ scope: 'synthetic-single-process-two-identical-flows', baselineProviderBoundaries: baseline.calls,
    reusedProviderBoundaries: cached.calls, baselineDatabaseReads: baseline.query.mock.calls.length, reusedDatabaseReads: cached.query.mock.calls.length, actualBilledCost: null, operationalLatency: null, clinicalQuality: 'not-evaluated' }));
});
it('expires all four stages and keeps subsequent customer sessions independent', async () => {
  const f = fixture();await f.flow(session);await f.flow(session);
  jest.advanceTimersByTime(60_001);await f.flow(session);
  expect(f.calls).toEqual({ plan: 2, select: 2, translate: 2, draft: 2 });
  await f.flow('00000000-0000-4000-8000-000000000002');
  expect(f.calls).toEqual({ plan: 3, select: 3, translate: 3, draft: 3 });
});
it('refreshes material-dependent stages and rejects a stale draft proof without another paid call', async () => {
  const f = fixture(), first = await f.flow(session);f.state.revision = 'v2';f.state.text = '변경된 합성 상품 사실입니다.';
  await expect(f.support.prepare('pharmacist', 'store', { ...f.request(session), verifyOnly: true, sourceVersion: first.draft.sourceVersion })).rejects.toMatchObject({ httpStatus: 409 });
  expect(f.calls).toEqual({ plan: 1, select: 1, translate: 1, draft: 1 });
  await f.flow(session);expect(f.calls).toEqual({ plan: 1, select: 2, translate: 2, draft: 2 });
});
it('does not reuse after revoked access or grant a different actor/store professional access', async () => {
  const f = fixture();await f.flow(session);f.state.allowed = false;
  await expect(f.flow(session)).rejects.toMatchObject({ httpStatus: 403 });
  for (const [actor, org] of [['staff', 'store'], ['pharmacist', 'other-store']])
    await expect(f.support.prepare(actor, org, f.request(session))).rejects.toMatchObject({ httpStatus: 403 });
  expect(f.calls).toEqual({ plan: 1, select: 1, translate: 1, draft: 1 });
});
it('changes store expression only through a new draft and invalidates the old proof', async () => {
  const f = fixture(), first = await f.flow(session);f.state.tone = 'friendly';
  await expect(f.support.prepare('pharmacist', 'store', { ...f.request(session), verifyOnly: true, sourceVersion: first.draft.sourceVersion })).rejects.toMatchObject({ httpStatus: 409 });
  await f.support.prepare('pharmacist', 'store', f.request(session));
  expect(f.calls).toEqual({ plan: 1, select: 1, translate: 1, draft: 2 });
  const drafts = execute.mock.calls.filter(([, system]) => String(system).startsWith('Help a pharmacist review'));
  expect(JSON.parse(drafts.at(-1)![2]).expression.tone).toBe('friendly');
});

it('coalesces simultaneous complete consultations before any result is ready', async () => {
  const f = fixture();
  const [a,b] = await Promise.all([f.flow(session),f.flow(session)]);
  expect(a).toEqual(b);expect(f.calls).toEqual({plan:1,select:1,translate:1,draft:1});
});
