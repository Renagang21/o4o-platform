import express from 'express';
import request from 'supertest';
import { createPublicServiceLegalController } from '../public-service-legal.controller.js';

/**
 * GET /:serviceKey/policies/:documentType/scheduled — 공고 화면이 시행 예정일을 하드코딩하지 않도록
 * 관리자가 초안에 입력한 시행일을 메타로만 돌려준다(본문 · 작성자 · 변경 사유 미노출).
 */
type Row = Record<string, unknown>;
function makeApp(rows: { draft?: Row | null; published?: Row | null }) {
  const findOne = jest.fn(async ({ where }: any) => (where.status === 'draft' ? rows.draft ?? null : rows.published ?? null));
  const db = { getRepository: () => ({ findOne }) };
  const app = express();
  app.use('/public/services', createPublicServiceLegalController(db as any));
  return { app, findOne };
}
const draft = (version: number, extra: Row = {}): Row => ({
  id: 'd', service_key: 'neture', document_type: 'terms', status: 'draft', version, title: 'Neture 계정 이용약관',
  slug: 'neture-account-terms', effective_date: '2026-12-01', content: '초안 본문 — 노출 금지', change_reason: '내부 사유', created_by: 'u', ...extra,
});

describe('공개 시행 예정 조회', () => {
  it('게시본보다 높은 버전의 시행일 있는 초안 메타만 돌려준다 (본문 · 내부 필드 없음)', async () => {
    const { app, findOne } = makeApp({ draft: draft(2), published: { version: 1, status: 'published' } });
    const r = await request(app).get('/public/services/neture/policies/terms/scheduled?slug=neture-account-terms');
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ serviceKey: 'neture', documentType: 'terms', version: 2, title: 'Neture 계정 이용약관', slug: 'neture-account-terms', effectiveDate: '2026-12-01' });
    expect(JSON.stringify(r.body)).not.toMatch(/초안 본문|내부 사유|created_by|createdBy/);
    const draftQuery = findOne.mock.calls[0][0];
    expect(draftQuery.where).toMatchObject({ service_key: 'neture', document_type: 'terms', status: 'draft', slug: 'neture-account-terms' });
    expect(draftQuery.where.effective_date).toBeDefined(); // Not(IsNull()) — 시행일 없는 초안 제외
    expect(r.headers['cache-control']).toBe('no-store');
  });

  it('예정 초안이 없거나, 게시본 이하 버전이면 data:null', async () => {
    expect((await request(makeApp({ draft: null }).app).get('/public/services/neture/policies/terms/scheduled')).body).toEqual({ success: true, data: null });
    const same = makeApp({ draft: draft(2), published: { version: 2, status: 'published' } });
    expect((await request(same.app).get('/public/services/neture/policies/terms/scheduled')).body.data).toBeNull();
  });

  it('게시본이 없으면 첫 예정 초안을 돌려준다', async () => {
    const { app } = makeApp({ draft: draft(1, { service_key: 'supplier', slug: 'supplier-service-terms' }), published: null });
    expect((await request(app).get('/public/services/supplier/policies/terms/scheduled')).body.data).toMatchObject({ version: 1, effectiveDate: '2026-12-01' });
  });

  it('미등록 키는 조회하지 않는다', async () => {
    const { app, findOne } = makeApp({ draft: draft(2) });
    expect((await request(app).get('/public/services/unregistered-fixture/policies/terms/scheduled')).status).toBe(404);
    expect(findOne).not.toHaveBeenCalled();
  });
});
