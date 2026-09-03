/**
 * WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §25 — B2B 잔여 부채 회귀 가드
 *
 * 이 스펙은 "canonical B2B 축이 조용히 새는" 경로만 고정한다.
 *
 *   supplier offer → canonical exposure gate → store_cart_items
 *   → service-agnostic B2B confirm → checkout_orders → buyer-order read
 *
 * 고정 대상:
 *   ① soft-delete 된 offer 가 3축(approval/optin/neture) 어디에서도 주문되지 않는다 (DF-6)
 *   ② catalog · orderable · 신청 자격 확인도 같은 soft-delete 게이트를 쓴다
 *   ③ 미승인 offer 차단 · 공급 축 오적용 차단
 *   ④ sourceType 축 혼합 오염 차단 (event_offer ↔ b2b/regular)
 *   ⑤ serviceKey 격리 · buyer organization spoof 차단 · membership fail-closed
 *   ⑥ cart mutation 경계 (id 단독 delete/update 금지)
 *   ⑦ frontend 가격 조작 무시 (서버 가격 권위)
 *   ⑧ 소비자 commerce 재유입 차단 · 제거된 dead API 비존재
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { B2B_ORDERABLE_SOURCE_TYPES } from '../services/cart/b2b-checkout-confirm.core.js';
import {
  resolveOfferExposureStrategy,
  type ExposureOfferRow,
} from '../services/cart/offer-exposure-strategy.js';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');

// 주문 생성은 이 스펙의 대상이 아니다 — 게이트까지만 본다.
jest.mock('../services/checkout.service.js', () => ({
  checkoutService: { createOrder: jest.fn(async () => ({})) },
}));
jest.mock('../utils/buyer-organization.resolver.js', () => ({
  resolveBuyerOrganization: jest.fn(async () => ({ status: 'resolved', organizationId: 'org-1' })),
  isBuyerOrganizationAllowed: jest.fn(async () => true),
}));

import { NetureB2BCartCheckoutService } from '../services/cart/neture-b2b-cart-checkout.service.js';
import { StoreB2BCartCheckoutService } from '../services/cart/store-b2b-cart-checkout.service.js';
import { PharmacyHubCartCheckoutService } from '../services/cart/pharmacy-hub-cart-checkout.service.js';

interface Captured {
  sql: string;
  params: any[];
}

/** offer 재조회 SQL 을 잡기 위한 최소 DataSource. offer 는 항상 0건(= 주문 없음). */
function harness(cartItems: Array<Record<string, any>>) {
  const queries: Captured[] = [];
  const deletes: any[] = [];
  const dataSource = {
    getRepository: () => ({
      find: jest.fn(async () => cartItems),
      findOne: jest.fn(async () => null),
      delete: jest.fn(async (crit: any) => {
        deletes.push(crit);
        return { affected: 1 };
      }),
    }),
    query: jest.fn(async (sql: string, params: any[]) => {
      queries.push({ sql, params });
      return [];
    }),
  } as any;
  return { dataSource, queries, deletes };
}

const cartItem = (over: Record<string, any> = {}) => ({
  id: 'cart-1',
  buyerId: 'buyer-1',
  serviceKey: 'neture',
  sourceType: 'b2b',
  supplierProductOfferId: 'offer-1',
  supplierId: 'sup-1',
  organizationId: null,
  productName: '상품 A',
  quantity: 2,
  priceSnapshot: 1,
  createdAt: new Date(),
  ...over,
});

const offerRow = (over: Partial<ExposureOfferRow> = {}): ExposureOfferRow =>
  ({
    id: 'offer-1',
    supplier_id: 'sup-1',
    price_general: 10000,
    service_unit_price: null,
    is_active: true,
    approval_status: 'APPROVED',
    distribution_type: 'PUBLIC',
    allowed_seller_ids: null,
    track_inventory: false,
    stock_quantity: 0,
    reserved_quantity: 0,
    product_name: '상품 A',
    master_id: 'master-1',
    master_status: 'ACTIVE',
    supplier_status: 'ACTIVE',
    base_shipping_fee: null,
    free_shipping_threshold: null,
    ...over,
  }) as ExposureOfferRow;

describe('① soft-delete 된 offer 는 어떤 공급 축에서도 주문되지 않는다 (DF-6)', () => {
  const cases: Array<[string, string, (ds: any) => { confirm: (s: any, i?: any) => Promise<any> }]> = [
    ['neture', 'neture', (ds) => new NetureB2BCartCheckoutService(ds)],
    ['glycopharm (approval)', 'glycopharm', (ds) => new StoreB2BCartCheckoutService(ds)],
    ['pharmacy-hub (optin)', 'pharmacy-hub', (ds) => new PharmacyHubCartCheckoutService(ds) as any],
  ];

  it.each(cases)('%s 확정 쿼리는 삭제되지 않은 offer 만 본다', async (_label, serviceKey, make) => {
    const { dataSource, queries } = harness([cartItem({ serviceKey })]);
    await make(dataSource)
      .confirm({ buyerId: 'buyer-1', serviceKey })
      .catch(() => undefined);

    const offerQuery = queries.find((q) => q.sql.includes('FROM supplier_product_offers spo'));
    expect(offerQuery).toBeDefined();
    expect(offerQuery!.sql).toMatch(/spo\.deleted_at IS NULL/);
    // serviceKey 는 항상 $2 로만 들어간다 (문자열 결합 금지)
    expect(offerQuery!.params[1]).toBe(serviceKey);
  });

  it('soft-delete 게이트는 strategy 조각이 아니라 Core base 쿼리가 소유한다', () => {
    const core = read('services/cart/b2b-checkout-confirm.core.ts');
    expect(core).toMatch(/AND spo\.deleted_at IS NULL/);
    const strategy = read('services/cart/offer-exposure-strategy.ts');
    // 축마다 복사하면 새 축에서 누락된다 — 실제로 neture 축에 누락돼 있었다.
    expect(strategy).not.toMatch(/offerWhereSql: `[\s\S]{0,200}spo\.deleted_at/);
  });
});

describe('② catalog · orderable · 신청 자격도 같은 soft-delete 게이트를 쓴다', () => {
  const catalog = read('routes/o4o-store/controllers/pharmacy-products.controller.ts');

  it('offer 를 읽는 모든 노출 쿼리가 deleted_at 을 건다', () => {
    const active = (catalog.match(/AND spo\.is_active = true/g) || []).length;
    const deletedGate = (catalog.match(/AND spo\.deleted_at IS NULL/g) || []).length;
    expect(active).toBeGreaterThan(0);
    expect(deletedGate).toBe(active);
  });
});

describe('③ 공급 노출 게이트', () => {
  it('승인 축은 offer_service_approvals 소문자 approved 만 인정한다', () => {
    const s = resolveOfferExposureStrategy('glycopharm')!;
    expect(s.key).toBe('approval');
    expect(s.offerWhereSql).toMatch(/osa\.approval_status\s*=\s*'approved'/);
  });

  it('opt-in 축은 공급자 service_keys 로만 노출한다', () => {
    const s = resolveOfferExposureStrategy('pharmacy-hub')!;
    expect(s.key).toBe('optin');
    expect(s.offerWhereSql).toContain('$2 = ANY(spo.service_keys)');
    expect(s.offerWhereSql).not.toContain('offer_service_approvals');
  });

  it('neture 축은 미승인 offer 를 행 단위로 차단한다', () => {
    const s = resolveOfferExposureStrategy('neture')!;
    const ctx = { buyerId: 'buyer-1', serviceKey: 'neture', organizationId: null };
    expect(s.gate(offerRow({ approval_status: 'PENDING' }), ctx)?.code).toBe('PRODUCT_NOT_APPROVED');
    expect(s.gate(offerRow(), ctx)).toBeNull();
  });

  it('등록되지 않은 serviceKey 는 B2B 확정 대상이 아니다', () => {
    expect(resolveOfferExposureStrategy('unknown-service')).toBeNull();
  });
});

describe('④ sourceType 축 혼합 오염 차단', () => {
  it('B2B 확정 대상은 b2b · regular 뿐이다', () => {
    expect([...B2B_ORDERABLE_SOURCE_TYPES].sort()).toEqual(['b2b', 'regular']);
    for (const t of ['event_offer', 'seller_recruitment', 'operator_approved']) {
      expect(B2B_ORDERABLE_SOURCE_TYPES.has(t)).toBe(false);
    }
  });

  it('event_offer item 은 B2B 확정에서 항목 단위로 탈락한다', async () => {
    const { dataSource, queries } = harness([cartItem({ sourceType: 'event_offer' })]);
    const result = await new NetureB2BCartCheckoutService(dataSource).confirm({
      buyerId: 'buyer-1',
      serviceKey: 'neture',
    });
    expect(result.createdOrders).toHaveLength(0);
    expect(result.failedItems[0].code).toBe('UNSUPPORTED_CART_ITEM_SOURCE');
    // 축이 다르면 offer 재조회조차 하지 않는다.
    expect(queries.find((q) => q.sql.includes('FROM supplier_product_offers spo'))).toBeUndefined();
  });

  it('이벤트오퍼 확정 경로는 event_offer 외 sourceType 을 거부한다', () => {
    const src = read('services/cart/event-offer-cart-checkout.service.ts');
    expect(src).toMatch(/sourceType !== 'event_offer'/);
    expect(src).toContain('UNSUPPORTED_CART_ITEM_SOURCE');
  });
});

describe('⑤ 경계 — serviceKey · buyer organization · membership', () => {
  const routes = read('routes/cart/store-cart.routes.ts');

  it('cart scope 는 인증 buyerId + 경로 serviceKey + active membership 이다', () => {
    expect(routes).toContain('hasActiveServiceMembership(dataSource, buyerId, serviceKey)');
    expect(routes).toContain('SERVICE_MEMBERSHIP_REQUIRED');
    // serviceKey 는 경로 파라미터에서만 온다 (CLAUDE.md §7 Guard Rule 4)
    expect(routes).toMatch(/req\.params\.serviceKey/);
  });

  it('cart 조회는 buyerId + serviceKey 복합 경계로만 한다', () => {
    const core = read('services/cart/b2b-checkout-confirm.core.ts');
    expect(core).toMatch(/where: \{ buyerId: scope\.buyerId, serviceKey: scope\.serviceKey \}/);
  });

  it('client organizationId 는 hint 이며 서버가 재확정한다', () => {
    const core = read('services/cart/b2b-checkout-confirm.core.ts');
    expect(core).toContain('resolveBuyerOrganization');
    expect(core).toContain('FOREIGN_STORE_ORGANIZATION');
    expect(core).toContain('STORE_ORGANIZATION_NOT_FOUND');
    expect(core).toContain('AMBIGUOUS_STORE_ORGANIZATION');
  });

  it('buyer-order read 는 buyerId + 서비스 키 집합으로만 조회한다', () => {
    const src = read('services/checkout/buyer-order-read.service.ts');
    expect(src).toContain('co."buyerId" = $1::uuid');
    expect(src).toContain("co.metadata->>'serviceKey' = ANY($2::text[])");
    // 키 집합이 비면 전체 조회로 넓어지지 않는다.
    expect(src).toContain('input.serviceKeys.length === 0');
  });

  // WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §13:
  //   취소는 write 다. cart · confirm 과 같은 membership 경계를 요구한다.
  //   조회(목록·상세)에는 붙이지 않는다 — 자기 주문 열람은 write 가 아니다.
  it.each([
    ['routes/kpa/controllers/kpa-checkout.controller.ts', 'SERVICE_KEYS.KPA_SOCIETY'],
    ['routes/glycopharm/controllers/checkout.controller.ts', 'SERVICE_KEYS.GLYCOPHARM'],
    ['routes/cosmetics/controllers/cosmetics-order.controller.ts', 'SERVICE_KEYS.K_COSMETICS'],
  ])('%s 의 주문 취소는 active membership 을 요구한다', (rel, key) => {
    const src = read(rel);
    expect(src).toContain(`requireActiveServiceMembership(dataSource, ${key})`);
  });

  it('membership 미들웨어는 serviceKey 를 요청 본문에서 읽지 않는다', () => {
    const mw = read('middleware/service-membership.middleware.ts');
    expect(mw).toContain('SERVICE_MEMBERSHIP_REQUIRED');
    // 판정은 DB SSOT 를 그대로 쓴다 — 새 권한 모델을 만들지 않는다.
    expect(mw).toContain('hasActiveServiceMembership');
    expect(mw).not.toMatch(/req\.(body|query)/);
  });
});

describe('⑥ cart mutation 경계 — id 단독 변경 금지', () => {
  const svc = read('services/cart/store-cart.service.ts');
  const core = read('services/cart/b2b-checkout-confirm.core.ts');

  it('삭제·수정은 항상 buyerId + serviceKey 를 함께 건다', () => {
    expect(svc).not.toMatch(/delete\(\{\s*id\s*\}\)/);
    expect(svc).not.toMatch(/update\(\{\s*id\s*\}/);
    expect(svc).toContain('buyerId');
    expect(svc).toContain('serviceKey');
    expect(core).toMatch(/buyerId: scope\.buyerId/);
  });
});

describe('⑦ 가격 권위는 서버다', () => {
  it('cart priceSnapshot 이 아니라 offer_service_prices → price_general 로 확정한다', () => {
    const core = read('services/cart/b2b-checkout-confirm.core.ts');
    expect(core).toContain('offer_service_prices osp');
    expect(core).toMatch(
      /hasServicePrice \? Number\(offer\.service_unit_price\) : Number\(offer\.price_general\)/,
    );
    expect(core).not.toMatch(/unitPrice = .*priceSnapshot/);
  });
});

describe('⑧ 소비자 commerce 재유입 차단 · dead API 비존재', () => {
  it('매장 소비자 주문 생성 leg 은 410 으로 은퇴 상태를 유지한다', () => {
    const kpa = read('routes/kpa/controllers/kpa-checkout.controller.ts');
    expect(kpa).toContain('STORE_CONSUMER_ORDER_RETIRED');
    expect(kpa).toContain('410');
  });

  it('GET /api/v1/glycopharm/b2b/products (legacy glycopharm_products) 는 존재하지 않는다', () => {
    const routes = read('routes/glycopharm/glycopharm.routes.ts');
    const controller = read('routes/glycopharm/controllers/pharmacy.controller.ts');
    expect(routes).not.toContain('createB2BController');
    expect(routes).not.toMatch(/router\.use\('\/b2b'/);
    expect(controller).not.toContain('export function createB2BController');
  });
});
