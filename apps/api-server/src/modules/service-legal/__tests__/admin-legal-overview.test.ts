import express from 'express';
import request from 'supertest';

const requireRole = jest.fn((role: string) => (req: any, res: any, next: any) => (req.headers['x-role'] === role ? next() : res.status(403).json({ success: false })));
jest.mock('../../../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireRole: (role: string) => requireRole(role),
}));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { buildLegalOverview, createAdminLegalOverviewController, tierOf, type PolicyRow } from '../admin-legal-overview.controller.js';

const BIZ = '11111111-1111-4111-8111-111111111111';
const row = (over: Partial<PolicyRow>): PolicyRow => ({
  id: 'id', service_key: 'neture', document_type: 'terms', slug: 'neture-account-terms', title: 't', version: 1,
  status: 'published', effective_date: '2026-09-17T00:00:00.000Z', published_at: '2026-09-18T00:00:00.000Z', ...over,
});

describe('법적 문서 통합 현황 — 순수 판정', () => {
  it('범위를 계정 · 직영 서비스 · 약국 협력사업 · 기타로 나눈다', () => {
    expect(tierOf('neture')).toBe('account');
    for (const k of ['supplier', 'community', 'funding', 'lecture', 'partner-support']) expect(tierOf(k)).toBe('service');
    expect(tierOf(`business:${BIZ}`)).toBe('business');
    for (const k of ['k-cosmetics', 'kpa-society', 'pharmacy-hub']) expect(tierOf(k)).toBe('other');
  });

  it('게시본 · 동의 건수 · 다음 버전 초안을 묶고, 편집 경로는 계정 · 직영만 준다', () => {
    const rows = [
      row({ id: 'n1', version: 1 }),
      row({ id: 'n2', version: 2, status: 'draft', effective_date: '2026-12-01T00:00:00.000Z', published_at: null }),
      row({ id: 's1', service_key: 'supplier', slug: 'supplier-service-terms' }),
      row({ id: 'b1', service_key: `business:${BIZ}`, slug: `business:${BIZ}-service-terms` }),
      row({ id: 'k1', service_key: 'k-cosmetics', slug: null }),
    ];
    const out = buildLegalOverview(rows, new Map([['n1', 6], ['b1', 2]]), new Map([[BIZ, { key: 'drugstore', name: '합성 사업', status: 'active' }]]));
    expect(out.map((s) => s.tier)).toEqual(['account', 'service', 'business', 'other']);
    const account = out[0];
    expect(account.editPath).toBe('/operations/neture/legal');
    expect(account.documents[0]).toMatchObject({
      documentType: 'terms', slug: 'neture-account-terms',
      published: { id: 'n1', version: 1, effectiveDate: '2026-09-17', acceptances: 6 },
      pendingDraft: { id: 'n2', version: 2, effectiveDate: '2026-12-01' },
    });
    expect(out[1].editPath).toBe('/operations/supplier/legal');
    expect(out[2]).toMatchObject({ label: '합성 사업 (drugstore)', editPath: null, note: expect.stringContaining('사업 관리자') });
    expect(out[2].documents[0].published?.acceptances).toBe(2);
    expect(out[3]).toMatchObject({ serviceKey: 'k-cosmetics', editPath: null, note: expect.stringContaining('퇴역') });
  });

  it('게시본 이하 버전의 초안은 대기 초안으로 보이지 않는다', () => {
    const out = buildLegalOverview([row({ id: 'p', version: 2 }), row({ id: 'd', version: 2, status: 'draft' })], new Map(), new Map());
    expect(out[0].documents[0].pendingDraft).toBeNull();
  });
});

describe('GET /admin/legal-documents/overview', () => {
  function app(query: jest.Mock) {
    const a = express();
    a.use('/admin/legal-documents', createAdminLegalOverviewController({ query } as any));
    return a;
  }

  it('platform:super_admin 만 — 그 밖은 403 이고 DB 를 읽지 않는다', async () => {
    const query = jest.fn();
    expect((await request(app(query)).get('/admin/legal-documents/overview').set('x-role', 'neture:admin')).status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith('platform:super_admin');
    expect(query).not.toHaveBeenCalled();
  });

  it('매개변수 바인딩으로 읽고, 본문(content)은 고르지 않는다', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([row({ id: 'n1' }), row({ id: 'b1', service_key: `business:${BIZ}`, slug: null })])
      .mockResolvedValueOnce([{ id: 'n1', n: 3 }])
      .mockResolvedValueOnce([{ id: BIZ, key: 'drugstore', name: '합성 사업', status: 'active' }]);
    const r = await request(app(query)).get('/admin/legal-documents/overview').set('x-role', 'platform:super_admin');
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toBe('private, no-store');
    expect(r.body.data[0].documents[0].published.acceptances).toBe(3);
    for (const [sql, params] of query.mock.calls) {
      expect(sql).not.toMatch(/\bcontent\b/);
      expect(Array.isArray(params)).toBe(true);
    }
    expect(query.mock.calls[2][0]).toMatch(/FROM semi_franchises WHERE id = ANY\(\$1::uuid\[\]\)/);
    expect(query.mock.calls[2][0]).not.toMatch(/JOIN/);
  });
});
