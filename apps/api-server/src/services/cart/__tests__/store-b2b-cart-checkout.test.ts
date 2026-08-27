/**
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (§18 · §19 · §28 · §29)
 *
 * `StoreB2BCartCheckoutService` — 승인축 서비스(glycopharm / kpa-society / k-cosmetics)의
 * B2B 주문 확정. 두 가지가 이 스펙의 핵심이다:
 *   1. 공급 노출은 `offer_service_approvals` 승인이 권위다 — opt-in 으로 우회되지 않는다.
 *   2. 매장 조직은 **서버가 확정**한다 — 클라이언트 값은 선택값이다 (결함 O1).
 */
import { StoreB2BCartCheckoutService } from '../store-b2b-cart-checkout.service.js';

const createOrderCalls: any[] = [];
jest.mock('../../checkout.service.js', () => ({
  checkoutService: {
    createOrder: jest.fn(async (dto: any) => {
      createOrderCalls.push(dto);
      const subtotal = dto.items.reduce((s: number, i: any) => s + i.subtotal, 0);
      return {
        id: `order-${createOrderCalls.length}`,
        orderNumber: `GP-${createOrderCalls.length}`,
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        paymentStatus: 'pending',
      };
    }),
  },
}));

/** 서버가 인정하는 매장 조직 후보 — organization_members SSOT 의 대역 */
const candidates: Array<{ organizationId: string }> = [];
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  findStoreOrganizationCandidates: jest.fn(async () => candidates),
  findAnyServiceStoreOrganizationCandidates: jest.fn(async () => candidates),
}));

type Row = Record<string, any>;

function makeService(cartItems: Row[], offerRows: Row[]) {
  const deleted: any[] = [];
  const queries: any[] = [];
  const dataSource = {
    getRepository: () => ({
      find: jest.fn(async () => cartItems),
      delete: jest.fn(async (crit: any) => {
        deleted.push(crit);
        return { affected: 1 };
      }),
    }),
    query: jest.fn(async (sql: string, params: any[]) => {
      queries.push({ sql, params });
      return offerRows;
    }),
  } as any;
  return { service: new StoreB2BCartCheckoutService(dataSource), deleted, queries };
}

const offer = (over: Partial<Row> = {}): Row => ({
  id: 'offer-1',
  supplier_id: 'sup-1',
  price_general: 30000,
  service_unit_price: null,
  is_active: true,
  approval_status: 'PENDING', // 승인축에서는 이 컬럼이 판정 근거가 아니다
  distribution_type: 'PUBLIC',
  allowed_seller_ids: null,
  track_inventory: false,
  stock_quantity: 0,
  reserved_quantity: 0,
  master_id: 'master-1',
  master_status: 'ACTIVE',
  product_name: '승인공급상품 A',
  supplier_status: 'ACTIVE',
  base_shipping_fee: null,
  free_shipping_threshold: null,
  ...over,
});

const cart = (over: Partial<Row> = {}): Row => ({
  id: 'cart-1',
  quantity: 1,
  sourceType: 'b2b',
  productName: '승인공급상품 A',
  supplierId: null,
  supplierProductOfferId: 'offer-1',
  organizationId: null,
  ...over,
});

const scope = { buyerId: 'buyer-1', serviceKey: 'glycopharm' };

beforeEach(() => {
  createOrderCalls.length = 0;
  candidates.length = 0;
  candidates.push({ organizationId: 'org-mine' });
});

describe('승인 게이트 (§18 · §19)', () => {
  it('승인 행 조건을 SQL 에서 강제한다 — approval gate 우회 경로가 없다', async () => {
    const { service, queries } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    expect(queries[0].sql).toContain('offer_service_approvals');
    expect(queries[0].sql).toContain("approval_status = 'APPROVED'");
    // PharmacyHub 식 opt-in 축은 이 서비스의 노출 근거가 아니다
    expect(queries[0].sql).not.toContain('service_keys');
    expect(queries[0].params[1]).toBe('glycopharm');
  });

  it('승인된 offer 는 주문으로 확정된다', async () => {
    const { service, deleted } = makeService([cart({ quantity: 2 })], [offer()]);
    const out = await service.confirm(scope);

    expect(out.serviceKey).toBe('glycopharm');
    expect(out.orderCount).toBe(1);
    expect(out.groupTotalAmount).toBe(60000);
    expect(out.removedCartItemIds).toEqual(['cart-1']);
    expect(deleted[0]).toMatchObject({ buyerId: 'buyer-1', serviceKey: 'glycopharm' });
  });

  it('승인 행이 없으면(쿼리 미조회) 주문 불가 — OFFER_NOT_APPROVED', async () => {
    const { service } = makeService([cart()], []);
    const out = await service.confirm(scope);

    expect(out.orderCount).toBe(0);
    expect(out.failedItems[0].code).toBe('OFFER_NOT_APPROVED');
    expect(createOrderCalls).toHaveLength(0);
  });

  it('order metadata 는 bridge 가 인식하는 source 와 서비스 축을 남긴다', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    const md = createOrderCalls[0].metadata;
    expect(md.source).toBe('store_b2b_cart');
    expect(md.serviceKey).toBe('glycopharm');
    expect(md.orderType).toBe('STORE_RESTOCK');
    expect(md.fulfillmentVisibility).toBe('hidden_until_paid');
    // payment-first
    expect(createOrderCalls[0].paymentStatus).toBeUndefined();
  });

  it('line item 은 SPO id 를 productId 로 쓴다 (공급자 workspace 스코프 축)', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    expect(createOrderCalls[0].items[0].productId).toBe('offer-1');
    expect(createOrderCalls[0].items[0].metadata).toMatchObject({
      supplierProductOfferId: 'offer-1',
      masterId: 'master-1',
      serviceKey: 'glycopharm',
      unitPriceSource: 'price_general',
    });
  });
});

describe('canonical price (§31)', () => {
  it('서비스별 공급가가 있으면 우선한다', async () => {
    const { service } = makeService([cart()], [offer({ service_unit_price: 21000 })]);
    await service.confirm(scope);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(21000);
    expect(createOrderCalls[0].items[0].metadata.unitPriceSource).toBe('offer_service_price');
  });

  it('없으면 price_general 로 폴백한다', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(30000);
  });
});

describe('매장 조직 소유권 (§7 · §28)', () => {
  it('단일 조직 + 선택 없음 → 서버가 자동 확정한다', async () => {
    const { service } = makeService([cart()], [offer()]);
    const out = await service.confirm(scope);

    expect(out.orderCount).toBe(1);
    expect(createOrderCalls[0].sellerOrganizationId).toBe('org-mine');
    expect(out.createdOrders[0].sellerOrganizationId).toBe('org-mine');
  });

  it('다중 조직 + 올바른 선택 → 허용한다 (다중 조직 사용자를 차단하지 않는다)', async () => {
    candidates.push({ organizationId: 'org-second' });
    const { service } = makeService([cart()], [offer()]);
    const out = await service.confirm(scope, { organizationId: 'org-second' });

    expect(out.orderCount).toBe(1);
    expect(createOrderCalls[0].sellerOrganizationId).toBe('org-second');
  });

  it('다중 조직 + 선택 없음 → AMBIGUOUS_STORE_ORGANIZATION', async () => {
    candidates.push({ organizationId: 'org-second' });
    const { service } = makeService([cart()], [offer()]);

    await expect(service.confirm(scope)).rejects.toMatchObject({
      code: 'AMBIGUOUS_STORE_ORGANIZATION',
      status: 400,
    });
    expect(createOrderCalls).toHaveLength(0);
  });

  it('타인 조직 선택 → 403 FOREIGN_STORE_ORGANIZATION', async () => {
    const { service } = makeService([cart()], [offer()]);

    await expect(service.confirm(scope, { organizationId: 'org-victim' })).rejects.toMatchObject({
      code: 'FOREIGN_STORE_ORGANIZATION',
      status: 403,
    });
    expect(createOrderCalls).toHaveLength(0);
  });

  it('접근 가능한 조직이 없음 → 403 STORE_ORGANIZATION_NOT_FOUND', async () => {
    candidates.length = 0;
    const { service } = makeService([cart()], [offer()]);

    await expect(service.confirm(scope)).rejects.toMatchObject({
      code: 'STORE_ORGANIZATION_NOT_FOUND',
      status: 403,
    });
    expect(createOrderCalls).toHaveLength(0);
  });

  it('cart 에 박힌 조직 id 는 권위가 아니다 — 서버 확정값이 주문에 실린다', async () => {
    const { service } = makeService([cart({ organizationId: 'org-someone-else' })], [offer()]);
    const out = await service.confirm(scope);

    expect(out.orderCount).toBe(1);
    expect(createOrderCalls[0].sellerOrganizationId).toBe('org-mine');
  });
});

describe('서비스 격리 및 경로 보호 (§23 · §29)', () => {
  it('event_offer 항목은 이 경로에서 주문되지 않는다', async () => {
    const { service } = makeService([cart({ sourceType: 'event_offer' })], [offer()]);
    const out = await service.confirm(scope);

    expect(out.orderCount).toBe(0);
    expect(out.failedItems[0].code).toBe('UNSUPPORTED_CART_ITEM_SOURCE');
  });

  it('kpa-society / k-cosmetics 도 같은 승인 계약을 쓴다 (§20 — Core 계약 준비)', async () => {
    for (const serviceKey of ['kpa-society', 'k-cosmetics']) {
      createOrderCalls.length = 0;
      const { service, queries } = makeService([cart()], [offer()]);
      const out = await service.confirm({ buyerId: 'buyer-1', serviceKey });

      expect(out.serviceKey).toBe(serviceKey);
      expect(queries[0].sql).toContain('offer_service_approvals');
      expect(queries[0].params[1]).toBe(serviceKey);
      expect(createOrderCalls[0].metadata.serviceKey).toBe(serviceKey);
    }
  });
});
