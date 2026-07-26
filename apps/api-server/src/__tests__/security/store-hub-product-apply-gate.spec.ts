/**
 * Store HUB Product Apply — Service Approval Gate + serviceKey Spoofing Tests
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1
 * IR: IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1 (HUB-P0-01 / HUB-P0-04)
 *
 * 검증 대상:
 *   HUB-P0-01  카탈로그에 노출될 수 없는 offer 는 ID 직접 지정으로도 신청할 수 없다.
 *   HUB-P0-04  service_key 는 마운트에서 서버가 도출하며, 클라이언트 값으로 타 서비스 row 를 만들 수 없다.
 *
 * DB 미사용 — DataSource.query 를 스텁해 컨트롤러가 실제로 발행하는 SQL/파라미터를 관찰한다.
 * (게이트가 SQL 로 표현되므로, 게이트 존재 여부는 발행된 SQL 과 바인딩 파라미터로 판정한다.)
 */

import express from 'express';
import request from 'supertest';
import { createPharmacyProductsController } from '../../routes/o4o-store/controllers/pharmacy-products.controller.js';

// ─────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────

const OFFER_ID = '11111111-2222-3333-4444-555555555555';
const ORG_ID = '99999999-8888-7777-6666-555555555555';

interface QueryCall { sql: string; params: any[]; }

/**
 * offerRows: findApplicableOffer 가 반환할 행. [] 이면 '노출 불가'.
 * 나머지 query 는 빈 배열로 응답한다.
 */
/** 마운트 serviceKey → service_memberships / offer_service_approvals 키 (프로덕션 매핑과 동일) */
const MEMBERSHIP_KEY: Record<string, string> = {
  kpa: 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
};

function buildApp(opts: {
  serviceKey?: 'kpa' | 'glycopharm' | 'cosmetics';
  offerRows: any[];
  calls: QueryCall[];
}) {
  const { serviceKey, offerRows, calls } = opts;

  const dataSource: any = {
    getRepository: () => ({ create: (x: any) => x, save: async (x: any) => x, findOne: async () => null }),
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      // requirePharmacyOwner(createRequireStoreOwner → isStoreOwner) 는 실제로 실행시킨다.
      if (/FROM role_assignments/i.test(sql)) return [{ '?column?': 1 }];
      if (/FROM organization_members/i.test(sql)) return [{ organization_id: ORG_ID, role: 'owner' }];
      if (/FROM supplier_product_offers/i.test(sql) && /neture_suppliers/i.test(sql)) return offerRows;
      return [];
    },
    transaction: async (fn: any) => fn({ getRepository: () => ({ findOne: async () => null, create: (x: any) => x, save: async (x: any) => x }) }),
  };

  // requireAuth: 인증된 store owner 주입 (memberships 는 createRequireStoreOwner 가 JWT 에서 읽는 형태).
  const mount = serviceKey ?? 'kpa';
  const requireAuth: any = (req: any, _res: any, next: any) => {
    req.user = {
      id: 'user-1',
      roles: [`${mount}:store_owner`],
      memberships: [{ serviceKey: MEMBERSHIP_KEY[mount], status: 'active' }],
    };
    next();
  };

  const app = express();
  app.use(express.json());
  app.use('/pharmacy/products', createPharmacyProductsController(dataSource, requireAuth, serviceKey));
  // asyncHandler → next(err) 로 전달되는 ApiError 를 응답으로 변환
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    });
  });
  return app;
}

/** findApplicableOffer 가 발행한 SQL 호출을 찾는다. */
function gateCall(calls: QueryCall[]): QueryCall | undefined {
  return calls.find(c => /FROM supplier_product_offers/i.test(c.sql) && /neture_suppliers/i.test(c.sql));
}

// ─────────────────────────────────────────────────────
// HUB-P0-01 — 신청 게이트가 카탈로그 노출 게이트와 일치
// ─────────────────────────────────────────────────────

describe('POST /apply — service approval gate (HUB-P0-01)', () => {
  it('노출 불가 offer(현재 서비스 미승인)는 404 OFFER_NOT_AVAILABLE', async () => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: 'kpa', offerRows: [], calls });

    const res = await request(app).post('/pharmacy/products/apply').send({ supplyProductId: OFFER_ID });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OFFER_NOT_AVAILABLE');
  });

  it('게이트 SQL 에 offer_service_approvals.approved 조건과 현재 서비스 승인키가 바인딩된다', async () => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: 'kpa', offerRows: [], calls });

    await request(app).post('/pharmacy/products/apply').send({ supplyProductId: OFFER_ID });

    const call = gateCall(calls);
    expect(call).toBeDefined();
    expect(call!.sql).toMatch(/offer_service_approvals/);
    expect(call!.sql).toMatch(/approval_status\s*=\s*'approved'/);
    expect(call!.sql).toMatch(/spo\.is_active\s*=\s*true/);
    expect(call!.sql).toMatch(/s\.status\s*=\s*'ACTIVE'/);
    // kpa 마운트 → 승인키 'kpa-society' 가 바인딩되어야 한다 (role-prefix 'kpa' 아님)
    expect(call!.params).toContain('kpa-society');
    expect(call!.params).not.toContain('kpa');
  });

  it.each([
    ['glycopharm', 'glycopharm'],
    ['cosmetics', 'k-cosmetics'],
  ] as const)('%s 마운트는 승인키 %s 로 게이트한다', async (mount, approvalKey) => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: mount, offerRows: [], calls });

    await request(app).post('/pharmacy/products/apply').send({ supplyProductId: OFFER_ID });

    expect(gateCall(calls)!.params).toContain(approvalKey);
  });

  it('PUBLIC 은 승인 없이도 통과한다 (기존 정책 유지)', async () => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: 'kpa', offerRows: [{ distribution_type: 'PUBLIC' }], calls });

    const res = await request(app).post('/pharmacy/products/apply').send({ supplyProductId: OFFER_ID });

    // 게이트 SQL 자체가 PUBLIC 예외를 포함해야 한다
    expect(gateCall(calls)!.sql).toMatch(/distribution_type\s*=\s*'PUBLIC'/);
    expect(res.status).not.toBe(404);
  });

  it('비-UUID offerId 는 500 이 아니라 404 로 처리된다', async () => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: 'kpa', offerRows: [], calls });

    const res = await request(app).post('/pharmacy/products/apply').send({ supplyProductId: 'not-a-uuid' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OFFER_NOT_AVAILABLE');
    // uuid 캐스팅 쿼리 자체가 발행되지 않아야 한다
    expect(gateCall(calls)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────
// HUB-P0-04 — serviceKey 서버 고정 / 스푸핑 차단
// ─────────────────────────────────────────────────────

describe('POST /apply — serviceKey spoofing (HUB-P0-04)', () => {
  it.each([
    ['kpa', 'glycopharm'],
    ['glycopharm', 'kpa-society'],
    ['cosmetics', 'glycopharm'],
  ] as const)('%s 경로에 타 서비스 service_key(%s) 전송 시 400 SERVICE_KEY_MISMATCH', async (mount, spoofed) => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: mount, offerRows: [{ distribution_type: 'PUBLIC' }], calls });

    const res = await request(app)
      .post('/pharmacy/products/apply')
      .send({ supplyProductId: OFFER_ID, service_key: spoofed });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SERVICE_KEY_MISMATCH');
    // 거부는 게이트 조회보다 먼저 — 어떤 write 경로도 타지 않는다
    expect(gateCall(calls)).toBeUndefined();
  });

  it.each([
    ['kpa', 'kpa-society'],
    ['glycopharm', 'glycopharm'],
    ['cosmetics', 'k-cosmetics'],
  ] as const)('%s 경로에 도출값과 동일한 service_key(%s)는 허용된다 (기존 프론트 회귀 방지)', async (mount, derived) => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: mount, offerRows: [{ distribution_type: 'PUBLIC' }], calls });

    const res = await request(app)
      .post('/pharmacy/products/apply')
      .send({ supplyProductId: OFFER_ID, service_key: derived });

    // mismatch 가드가 걸리지 않고 게이트 통과 후 하위 신청 흐름까지 진행됐음을 확인한다.
    // (하위 ProductApprovalV2Service 는 실 DB 가 필요해 본 스펙에서 성공까지 가지 않는다.)
    expect(res.body.code).not.toBe('SERVICE_KEY_MISMATCH');
    expect(gateCall(calls)).toBeDefined();
  });

  it('service_key 미전송(KPA 프론트 현행)도 허용된다', async () => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: 'kpa', offerRows: [{ distribution_type: 'PUBLIC' }], calls });

    const res = await request(app).post('/pharmacy/products/apply').send({ supplyProductId: OFFER_ID });

    expect(res.body.code).not.toBe('SERVICE_KEY_MISMATCH');
    expect(gateCall(calls)).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────
// HUB-P0-04 — 읽기 경로도 마운트 축을 읽는다
// ─────────────────────────────────────────────────────

describe('GET /applications · /approved — read axis derived from mount (HUB-P0-04)', () => {
  it.each([
    ['kpa', 'kpa-society'],
    ['glycopharm', 'glycopharm'],
    ['cosmetics', 'k-cosmetics'],
  ] as const)('%s: query.service_key 를 무시하고 %s 로 조회한다', async (mount, derived) => {
    const calls: QueryCall[] = [];
    const app = buildApp({ serviceKey: mount, offerRows: [], calls });

    await request(app).get('/pharmacy/products/approved?service_key=glycopharm');

    const call = calls.find(c => /FROM product_approvals/i.test(c.sql));
    expect(call).toBeDefined();
    expect(call!.params).toEqual([ORG_ID, derived]);
  });
});
