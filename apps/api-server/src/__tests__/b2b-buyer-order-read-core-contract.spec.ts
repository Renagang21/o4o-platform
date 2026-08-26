/**
 * WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1 (DF-1 · DF-4)
 *
 * 매장 buyer 주문 **조회** canonical contract 회귀 가드.
 * 계약 정본: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` §3.
 *
 *   A. Core 동작   — ownership · serviceKey 격리 · 페이지네이션 · 404 수렴 · 필터 바인딩
 *   B. wrapper 계약 — 3서비스 controller 가 같은 Core 를 쓰는지(중복 구현 재발 금지)
 *   C. regression  — 소비자 commerce 재유입 0 / SQL 조각 주입 경로 0
 *
 * A 는 fake DataSource 로 발행 SQL 과 파라미터를 직접 검증한다(DB 없음).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  listBuyerOrders,
  getBuyerOrderDetail,
  isBuyerOrderReadFailure,
  normalizeBuyerOrderPaging,
} from '../services/checkout/buyer-order-read.service';
import { getBuyerOrderServiceKeys } from '../constants/buyer-order-service-scope';
import { SERVICE_KEYS } from '../constants/service-keys';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

const WRAPPERS = [
  'routes/kpa/controllers/kpa-checkout.controller.ts',
  'routes/glycopharm/controllers/checkout.controller.ts',
  'routes/cosmetics/controllers/cosmetics-order.controller.ts',
];

const BUYER = '11111111-1111-4111-8111-111111111111';
const OTHER_BUYER = '22222222-2222-4222-8222-222222222222';
const ORDER = '33333333-3333-4333-8333-333333333333';
// 키 집합 리터럴을 여기서 다시 쓰지 않는다 — SSOT 에서만 온다
// (canonical contract spec 의 '단일 정의' 가드와 같은 이유).
const KEYS = getBuyerOrderServiceKeys(SERVICE_KEYS.KPA_SOCIETY);

interface Issued {
  sql: string;
  params: any[];
}

/** 발행된 SQL 을 기록하는 fake DataSource. rows 는 호출 순서대로 돌려준다. */
function fakeDataSource(responses: any[][]) {
  const issued: Issued[] = [];
  let i = 0;
  const ds = {
    query: jest.fn(async (sql: string, params: any[]) => {
      issued.push({ sql, params });
      return responses[i++] ?? [];
    }),
  };
  return { ds: ds as any, issued };
}

const orderRow = (over: Record<string, any> = {}) => ({
  id: ORDER,
  orderNumber: 'KPA-0001',
  status: 'created',
  paymentStatus: 'pending',
  subtotal: '10000.00',
  shippingFee: '3000.00',
  discount: '0.00',
  totalAmount: '13000.00',
  shippingAddress: null,
  items: [{ productId: 'p1', quantity: 2 }],
  metadata: { serviceKey: 'kpa-society', organizationId: 'org-1' },
  paidAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  itemCount: 1,
  ...over,
});

describe('A. Buyer order read Core — 조회 의미·경계', () => {
  it('목록은 buyerId 와 serviceKey 집합을 항상 함께 건다 (UUID 단독 조회 금지)', async () => {
    const { ds, issued } = fakeDataSource([[{ count: 3 }], [orderRow()]]);

    await listBuyerOrders(ds, { buyerId: BUYER, serviceKeys: KEYS });

    for (const { sql, params } of issued) {
      expect(sql).toContain('co."buyerId" = $1::uuid');
      expect(sql).toContain("co.metadata->>'serviceKey' = ANY($2::text[])");
      expect(params[0]).toBe(BUYER);
      expect(params[1]).toEqual(KEYS);
    }
  });

  it('목록은 buyerId 를 SQL 에 문자열로 박지 않는다 (parameter binding 필수)', async () => {
    const { ds, issued } = fakeDataSource([[{ count: 0 }], []]);
    await listBuyerOrders(ds, { buyerId: BUYER, serviceKeys: KEYS });
    for (const { sql } of issued) {
      expect(sql).not.toContain(BUYER);
      for (const key of KEYS) expect(sql).not.toContain(key);
    }
  });

  it('serviceKey 집합이 비면 전체 조회로 넓어지지 않고 빈 목록이 된다', async () => {
    const { ds, issued } = fakeDataSource([]);
    const result = await listBuyerOrders(ds, { buyerId: BUYER, serviceKeys: [] });
    expect(result.orders).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(issued).toHaveLength(0); // 쿼리 자체를 발행하지 않는다
  });

  it('decimal 컬럼을 number 로 정규화한다 (3서비스 금액 타입 통일)', async () => {
    const { ds } = fakeDataSource([[{ count: 1 }], [orderRow()]]);
    const { orders } = await listBuyerOrders(ds, { buyerId: BUYER, serviceKeys: KEYS });
    expect(orders[0].totalAmount).toBe(13000);
    expect(typeof orders[0].totalAmount).toBe('number');
  });

  it('페이지네이션은 limit 상한 100 · page 하한 1 로 정규화된다', () => {
    expect(normalizeBuyerOrderPaging(undefined, undefined)).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
    expect(normalizeBuyerOrderPaging('3', '10')).toEqual({ page: 3, limit: 10, offset: 20 });
    expect(normalizeBuyerOrderPaging(1, 9999).limit).toBe(100);
    expect(normalizeBuyerOrderPaging(-5, 20).page).toBe(1);
    expect(normalizeBuyerOrderPaging('abc', 'abc')).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('상세는 id ∧ buyerId ∧ serviceKey 복합 조건으로만 조회한다', async () => {
    const { ds, issued } = fakeDataSource([[orderRow()]]);

    const result = await getBuyerOrderDetail(ds, {
      orderId: ORDER,
      buyerId: BUYER,
      serviceKeys: KEYS,
    });

    expect(isBuyerOrderReadFailure(result)).toBe(false);
    expect(issued[0].sql).toContain('co.id = $1::uuid');
    expect(issued[0].sql).toContain('co."buyerId" = $2::uuid');
    expect(issued[0].sql).toContain("co.metadata->>'serviceKey' = ANY($3::text[])");
    expect(issued[0].params).toEqual([ORDER, BUYER, KEYS]);
  });

  it('타 매장(다른 buyerId) 주문은 조회되지 않고 404 로 수렴한다', async () => {
    // buyerId 조건 때문에 DB 가 0 row 를 돌려주는 상황
    const { ds } = fakeDataSource([[]]);
    const result = await getBuyerOrderDetail(ds, {
      orderId: ORDER,
      buyerId: OTHER_BUYER,
      serviceKeys: KEYS,
    });

    expect(isBuyerOrderReadFailure(result)).toBe(true);
    if (isBuyerOrderReadFailure(result)) {
      expect(result.httpStatus).toBe(404);
      expect(result.code).toBe('ORDER_NOT_FOUND');
    }
  });

  it('없는 주문과 타 serviceKey 주문의 응답이 구분되지 않는다 (존재 노출 금지)', async () => {
    const a = await getBuyerOrderDetail(fakeDataSource([[]]).ds, {
      orderId: ORDER,
      buyerId: BUYER,
      serviceKeys: KEYS,
    });
    const b = await getBuyerOrderDetail(fakeDataSource([[]]).ds, {
      orderId: ORDER,
      buyerId: BUYER,
      serviceKeys: ['glycopharm'],
    });
    expect(a).toEqual(b);
  });

  it('잘못된 형식의 order id 는 쿼리 전에 404 다 (uuid 캐스트 500 방지)', async () => {
    const { ds, issued } = fakeDataSource([]);
    const result = await getBuyerOrderDetail(ds, {
      orderId: 'not-a-uuid',
      buyerId: BUYER,
      serviceKeys: KEYS,
    });
    expect(isBuyerOrderReadFailure(result)).toBe(true);
    expect(issued).toHaveLength(0);
  });

  it('serviceKey 집합이 비면 상세도 404 다', async () => {
    const { ds, issued } = fakeDataSource([]);
    const result = await getBuyerOrderDetail(ds, {
      orderId: ORDER,
      buyerId: BUYER,
      serviceKeys: [],
    });
    expect(isBuyerOrderReadFailure(result)).toBe(true);
    expect(issued).toHaveLength(0);
  });

  it('K-Cosmetics 부가 필터도 placeholder 로만 바인딩된다', async () => {
    const { ds, issued } = fakeDataSource([[{ count: 0 }], []]);

    await listBuyerOrders(ds, {
      buyerId: BUYER,
      serviceKeys: ['cosmetics'],
      filters: {
        channel: 'travel',
        status: 'created',
        travelGuideId: "g' OR 1=1 --",
        travelTourSessionId: 'ts-1',
        travelTaxRefundEligible: 'true',
        travelTaxRefundStatus: 'pending',
      },
    });

    const { sql, params } = issued[0];
    expect(sql).toContain("co.metadata->'travel'->>'guideId' = $");
    // 필터 값은 어떤 경우에도 SQL 문자열에 나타나지 않는다
    expect(sql).not.toContain('OR 1=1');
    expect(params).toContain("g' OR 1=1 --");
    // buyerId · serviceKeys 는 항상 앞자리를 지킨다
    expect(params[0]).toBe(BUYER);
    expect(params[1]).toEqual(['cosmetics']);
  });

  it('필터를 주지 않으면 buyerId · serviceKey 2개 조건만 건다', async () => {
    const { ds, issued } = fakeDataSource([[{ count: 0 }], []]);
    await listBuyerOrders(ds, { buyerId: BUYER, serviceKeys: KEYS });
    expect(issued[0].params).toHaveLength(2);
  });

  it('상세는 쓰기를 수행하지 않는다 (읽기 전용)', async () => {
    const { ds, issued } = fakeDataSource([[orderRow()]]);
    await getBuyerOrderDetail(ds, { orderId: ORDER, buyerId: BUYER, serviceKeys: KEYS });
    for (const { sql } of issued) {
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i);
    }
  });
});

describe('B. wrapper 계약 — 3서비스가 같은 Core 를 쓴다 (DF-4)', () => {
  it.each(WRAPPERS)('%s 는 Core 목록/상세를 호출한다', (file) => {
    const code = read(file);
    expect(code).toContain("from '../../../services/checkout/buyer-order-read.service.js'");
    expect(code).toContain('listBuyerOrders(dataSource');
    expect(code).toContain('getBuyerOrderDetail(dataSource');
  });

  it.each(WRAPPERS)('%s 는 serviceKey 집합을 SSOT 에서만 가져온다', (file) => {
    const code = read(file);
    expect(code).toContain('getBuyerOrderServiceKeys');
  });

  it.each(WRAPPERS)('%s 는 buyer 주문 조회 쿼리를 직접 만들지 않는다', (file) => {
    const code = read(file);
    // 조회 구현이 wrapper 로 되돌아가면 3벌 중복(DF-4)이 재발한다.
    expect(code).not.toMatch(/createQueryBuilder\(\s*['"`]co['"`]\s*\)/);
    expect(code).not.toMatch(/SELECT[\s\S]{0,400}FROM checkout_orders[\s\S]{0,200}"buyerId"/i);
  });

  it.each(WRAPPERS)('%s 는 buyerId 를 요청 body/query 에서 받지 않는다', (file) => {
    const code = read(file);
    expect(code).not.toMatch(/req\.(body|query)[.[]\s*['"`]?buyerId/);
    expect(code).toMatch(/authReq\.user\?\.id/);
  });

  it('세 wrapper 의 404 응답 코드가 동일하다', () => {
    const core = read('services/checkout/buyer-order-read.service.ts');
    expect(core).toContain("code: 'ORDER_NOT_FOUND'");
    for (const file of WRAPPERS) {
      const code = read(file);
      expect(code).toContain('isBuyerOrderReadFailure(result)');
      expect(code).toContain('result.httpStatus, result.code, result.message');
    }
  });
});

describe('C. regression — 재유입 금지선', () => {
  it('Core 는 소비자 commerce 개념을 도입하지 않는다', () => {
    const core = read('services/checkout/buyer-order-read.service.ts');
    expect(core).not.toMatch(/consumer|customerOrder|platform-seller|sellerOrganizationId/i);
  });

  it('Core 는 호출부에서 SQL 조각을 받지 않는다 (필터는 타입 고정)', () => {
    const core = read('services/checkout/buyer-order-read.service.ts');
    // 호출부가 넘기는 것은 값뿐 — where/sql 문자열을 받는 입력 필드가 없어야 한다.
    expect(core).not.toMatch(/\b(whereSql|rawWhere|sqlFragment|extraSql)\??:\s*string/);
  });

  it('Core 는 쓰기 SQL 을 포함하지 않는다 (WO §19 read-only)', () => {
    const core = read('services/checkout/buyer-order-read.service.ts');
    expect(core).not.toMatch(/\b(INSERT INTO|UPDATE checkout_orders|DELETE FROM)\b/i);
  });
});
