import express from 'express';
import request from 'supertest';
import { ConsultationGuidanceService } from '../services/consultation-guidance.js';
import { ConsultationSupportService } from '../services/consultation-support.js';
import { consultationWorkspaceRoutes } from '../consultation-workspace.routes.js';
import { NeturePharmacyError } from '../constants.js';

const id = '55555555-5555-4555-8555-555555555555';
const input = { mode: 'floor-pharmacist', productKind: 'local', productId: id, question: '상품 근거와 확인할 사항은?' };
function fixture() {
  const state = { allowed: true, published: true, version: 'v1' };
  const authorize = jest.fn(async (actor: string, org: string) => {
    if (!state.allowed || actor !== 'pharmacist' || org !== 'store')
      throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', 'denied');
  });
  const query = jest.fn(async (sql: string, args: unknown[]) => {
    if (sql.includes('WITH products')) return args[0] === 'store' ? [{ id, kind: 'local', name: 'Fixture product', location: 'A' }] : [];
    if (sql.includes('FROM store_multilingual_product_content_groups')) return state.published ? [{ id: 'group', title: 'Published source', defaultLocale: 'ko', publicKey: 'public', updatedAt: state.version }] : [];
    if (sql.includes('FROM store_multilingual_product_content_pages')) return [{ id: 'page', locale: 'ko', title: '원문', summary: null,
      content: { html: '<p>상품 원문 사실</p>' }, status: 'published', updatedAt: state.version }];
    throw new Error('Unexpected query');
  });
  const run = jest.fn(async (data: any) => ({ productFacts: data.sources.some((s: any) => s.id === 'p1') ? [{ text: '상품 원문 사실', sourceIds: ['p1'] }] : [],
    professionalNotes: [], nextQuestion: null, customerDraft: { text: '확인한 고객 설명', sourceIds: [data.sources[0].id] } }));
  const guidance = new ConsultationGuidanceService({ query } as any, authorize, async () => {}, jest.fn(), jest.fn());
  return { state, authorize, query, run, guidance, service: new ConsultationSupportService(guidance, run) };
}
it('uses the existing product/publication guards, separates sources, and writes no transcript or task history', async () => {
  const f = fixture();
  const result = await f.service.prepare('pharmacist', 'store', { ...input,
    reference: { text: '검토한 전문 참고사항', source: 'Fixture guideline · checked', reviewed: true } });
  expect(result.state).toBe('ready');
  expect(f.run.mock.calls[0][0].sources.map((s: any) => s.kind)).toEqual(['product-fact', 'professional-reference']);
  expect(f.authorize).toHaveBeenCalledWith('pharmacist', 'store', 'floor-pharmacist');
  expect(f.query.mock.calls.every(([sql]) => !/\b(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(true);
  expect(JSON.stringify(result)).not.toContain('검토한 전문 참고사항');
});
it.each(['floor-staff', 'counter-staff', 'forged'])('rejects nonpharmacist mode %s before a source read or provider call', async mode => {
  const f = fixture();
  await expect(f.service.prepare('pharmacist', 'store', { ...input, mode })).rejects.toHaveProperty('httpStatus', 403);
  expect(f.query).not.toHaveBeenCalled(); expect(f.run).not.toHaveBeenCalled();
});
it('rejects a different store and a revoked actor before sending material', async () => {
  const f = fixture();
  await expect(f.service.prepare('pharmacist', 'other-store', input)).rejects.toHaveProperty('httpStatus', 403);
  await expect(f.service.prepare('other-actor', 'store', input)).rejects.toHaveProperty('httpStatus', 403);
  expect(f.run).not.toHaveBeenCalled(); expect(f.query).not.toHaveBeenCalled();
});
it.each([{ text: 'reference', source: '', reviewed: true }, { text: 'reference', source: 'source', reviewed: false }])('requires a checked, identified reference', async reference => {
  const f = fixture();
  await expect(f.service.prepare('pharmacist', 'store', { ...input, reference })).rejects.toHaveProperty('httpStatus', 400);
  expect(f.run).not.toHaveBeenCalled();
});
it('distinguishes missing sources from a provider failure and accepts an explicitly reviewed reference without a publication', async () => {
  const f = fixture(); f.state.published = false;
  expect((await f.service.prepare('pharmacist', 'store', input)).state).toBe('empty');
  expect(f.run).not.toHaveBeenCalled();
  expect((await f.service.prepare('pharmacist', 'store', { ...input, reference: { text: '참고 문헌', source: 'Guideline', reviewed: true } })).state).toBe('ready');
});
it.each(['access', 'source'])('discards a draft when %s changes during the provider call', async change => {
  const f = fixture(); const original = f.run.getMockImplementation()!;
  f.run.mockImplementationOnce(async data => { const brief = await original(data); if (change === 'access') f.state.allowed = false; else f.state.version = 'v2'; return brief; });
  await expect(f.service.prepare('pharmacist', 'store', input)).rejects.toHaveProperty('httpStatus', change === 'access' ? 403 : 409);
});
it('rechecks a draft before use without invoking AI again, and refuses a withdrawn source', async () => {
  const f = fixture(), result = await f.service.prepare('pharmacist', 'store', input);
  expect((await f.service.prepare('pharmacist', 'store', { ...input, verifyOnly: true, sourceVersion: result.sourceVersion })).state).toBe('verified');
  expect(f.run).toHaveBeenCalledTimes(1);
  f.state.published = false;
  await expect(f.service.prepare('pharmacist', 'store', { ...input, verifyOnly: true, sourceVersion: result.sourceVersion })).rejects.toHaveProperty('httpStatus', 409);
  expect(f.run).toHaveBeenCalledTimes(1);
});
it('uses authenticated actor/store values in HTTP and checks the counter epoch before and after preparing', async () => {
  const f = fixture(), app = express(), validate = jest.fn(async () => {});
  app.use(express.json());
  const guard = (req: any, res: any, next: any) => {
    if (req.headers['x-fixture-auth'] !== 'allowed') return res.status(401).json({ success: false });
    req.user = { id: 'pharmacist' }; req.organizationId = 'store'; next();
  };
  app.use(consultationWorkspaceRoutes({} as any, { validate } as any, [guard], [], undefined, f.service));
  expect((await request(app).post('/pharmacy/consultation-support').send(input)).status).toBe(401);
  expect(f.run).not.toHaveBeenCalled();
  const response = await request(app).post('/pharmacy/consultation-support').set('x-fixture-auth', 'allowed')
    .send({ ...input, actorId: 'forged', organizationId: 'other-store', stationId: 'station', epoch: 'epoch' });
  expect(response.status).toBe(200); expect(response.body.data.organizationId).toBe('store');
  expect(validate).toHaveBeenCalledTimes(2); expect(validate).toHaveBeenCalledWith('pharmacist', 'store', 'station', 'epoch');
  expect(response.headers['cache-control']).toBe('private, no-store');
  validate.mockRejectedValueOnce(new NeturePharmacyError(409, 'CONSULTATION_CHANGED', 'changed'));
  expect((await request(app).post('/pharmacy/consultation-support').set('x-fixture-auth', 'allowed').send({ ...input, stationId: 'station' })).status).toBe(409);
  expect(f.run).toHaveBeenCalledTimes(1);
});
