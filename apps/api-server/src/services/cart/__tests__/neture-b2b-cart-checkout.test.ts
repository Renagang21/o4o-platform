/**
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (§22 · §31 · §32)
 *
 * `NetureB2BCartCheckoutService` 는 공통 Core 의 wrapper 가 됐다.
 * 이 스펙은 **회귀 방지**가 목적이다 — Neture 계약 표면(실패 code 어휘 · metadata ·
 * seller 축 · `pg_` paymentGroupId · 결과 shape)이 공통화 전과 동일해야 한다.
 */
import { NetureB2BCartCheckoutService } from '../neture-b2b-cart-checkout.service.js';

const createOrderCalls: any[] = [];
jest.mock('../../checkout.service.js', () => ({
  checkoutService: {
    createOrder: jest.fn(async (dto: any) => {
      createOrderCalls.push(dto);
      const subtotal = dto.items.reduce((s: number, i: any) => s + i.subtotal, 0);
      return {
        id: `order-${createOrderCalls.length}`,
        orderNumber: `NB-${createOrderCalls.length}`,
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        paymentStatus: 'pending',
      };
    }),
  },
}));

// 매장 조직 후보는 서버 SSOT 에서만 온다 — 이 스펙은 그 위의 승격 규칙을 검증한다.
const candidates: Array<{ organizationId: string }> = [];
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  findStoreOrganizationCandidates: jest.fn(async () => candidates),
  findAnyServiceStoreOrganizationCandidates: jest.fn(async () => candidates),
}));

type CartRow = Record<string, any>;
type OfferRow = Record<string, any>;

function makeService(cartItems: CartRow[], offerRows: OfferRow[]) {
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
  return { service: new NetureB2BCartCheckoutService(dataSource), deleted, queries };
}

const offer = (over: Partial<OfferRow> = {}): OfferRow => ({
  id: 'offer-1',
  supplier_id: 'sup-1',
  price_general: 12000,
  service_unit_price: null,
  is_active: true,
  approval_status: 'APPROVED',
  distribution_type: 'PUBLIC',
  allowed_seller_ids: null,
  track_inventory: false,
  stock_quantity: 0,
  reserved_quantity: 0,
  master_id: 'master-1',
  master_status: 'ACTIVE',
  product_name: '공급상품 A',
  supplier_status: 'ACTIVE',
  base_shipping_fee: null,
  free_shipping_threshold: null,
  ...over,
});

const cart = (over: Partial<CartRow> = {}): CartRow => ({
  id: 'cart-1',
  quantity: 2,
  sourceType: 'b2b',
  productName: '공급상품 A',
  supplierId: 'sup-1',
  supplierProductOfferId: 'offer-1',
  organizationId: null,
  ...over,
});

const scope = { buyerId: 'buyer-1', serviceKey: 'neture' };

beforeEach(() => {
  createOrderCalls.length = 0;
  candidates.length = 0;
});

describe('Neture B2B 계약 표면 (§22 회귀)', () => {
  it('주문을 공급자별로 생성하고 결과 shape 을 유지한다', async () => {
    const { service, deleted } = makeService([cart()], [offer()]);
    const out = await service.confirm(scope);

    expect(out.serviceKey).toBe('neture');
    expect(out.orderCount).toBe(1);
    expect(out.createdOrders).toHaveLength(1);
    expect(out.groupTotalAmount).toBe(24000);
    expect(out.removedCartItemIds).toEqual(['cart-1']);
    expect(out.createdOrders[0]).toMatchObject({
      orderId: 'order-1',
      orderNumber: 'NB-1',
      supplierId: 'sup-1',
      itemCount: 1,
      paymentStatus: 'pending',
      cartItemIds: ['cart-1'],
    });
    // 결함 O2 — cart 정리는 항상 buyerId + serviceKey 로 스코프된다
    expect(deleted[0]).toMatchObject({ buyerId: 'buyer-1', serviceKey: 'neture' });
  });

  it('paymentGroupId 는 pg_ 접두사를 유지하고 그룹 전체가 공유한다', async () => {
    const { service } = makeService(
      [cart(), cart({ id: 'cart-2', supplierId: 'sup-2', supplierProductOfferId: 'offer-2' })],
      [offer(), offer({ id: 'offer-2', supplier_id: 'sup-2' })],
    );
    const out = await service.confirm(scope);

    expect(out.paymentGroupId).toMatch(/^pg_/);
    expect(out.orderCount).toBe(2);
    expect(new Set(out.createdOrders.map((o) => o.paymentGroupId)).size).toBe(1);
    expect(createOrderCalls[0].metadata.paymentGroupSource).toBe('multi_supplier_cart');
  });

  it('order metadata 규약을 유지한다 (source 는 bridge 식별 축이다)', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    const md = createOrderCalls[0].metadata;
    expect(md.source).toBe('neture_b2b_checkout');
    expect(md.serviceKey).toBe('neture');
    expect(md.orderType).toBe('STORE_RESTOCK');
    expect(md.fulfillmentVisibility).toBe('hidden_until_paid');
    expect(md.pricingRevalidationRequired).toBe(true);
    expect(md.sourceTypes).toEqual(['b2b']);
    expect(md.cartItemIds).toEqual(['cart-1']);
    expect(md.supplierProductOfferIds).toEqual(['offer-1']);
    // payment-first: 주문 생성 시점에 결제 상태를 만들지 않는다
    expect(createOrderCalls[0].paymentStatus).toBeUndefined();
    expect(createOrderCalls[0].collectionStatus).toBeUndefined();
  });

  it('line item 은 SPO id 를 productId 로 쓰고 snapshot metadata 를 유지한다', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    const li = createOrderCalls[0].items[0];
    expect(li.productId).toBe('offer-1'); // master_id 아님 — 공급자 workspace 스코프 축
    expect(li.metadata).toMatchObject({
      sourceType: 'b2b',
      supplierProductOfferId: 'offer-1',
      cartItemId: 'cart-1',
      pricingSource: 'regular',
      confirmedUnitPrice: 12000,
    });
  });

  it('조직이 없으면 seller 축은 buyer 로 남는다 (서버가 임의로 채우지 않는다)', async () => {
    candidates.push({ organizationId: 'org-9' }); // 접근 가능하지만 cart 에 없다
    const { service } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    expect(createOrderCalls[0].sellerId).toBe('buyer-1');
    expect(createOrderCalls[0].sellerOrganizationId).toBeUndefined();
  });
});

describe('canonical price 재확정 (§31)', () => {
  it('서비스별 공급가가 있으면 그 값을 쓴다', async () => {
    const { service } = makeService(
      [cart({ quantity: 2, priceSnapshot: 1 })],
      [offer({ service_unit_price: 9900, price_general: 12000 })],
    );
    await service.confirm(scope);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(9900);
    expect(createOrderCalls[0].items[0].subtotal).toBe(19800);
  });

  it('서비스별 공급가가 없으면 price_general 로 폴백한다', async () => {
    const { service } = makeService([cart({ quantity: 1 })], [offer({ service_unit_price: null })]);
    await service.confirm(scope);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(12000);
  });

  it('frontend priceSnapshot 을 조작해도 주문 금액에 반영되지 않는다', async () => {
    const { service } = makeService([cart({ quantity: 1, priceSnapshot: 1 })], [offer()]);
    await service.confirm(scope);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(12000);
  });
});

describe('게이트 어휘 보존', () => {
  const cases: Array<[string, Partial<OfferRow>, string]> = [
    ['비활성 상품', { is_active: false }, 'PRODUCT_INACTIVE'],
    ['미승인 상품', { approval_status: 'PENDING' }, 'PRODUCT_NOT_APPROVED'],
    ['비활성 공급자', { supplier_status: 'PENDING' }, 'SUPPLIER_INACTIVE'],
    ['PRIVATE 유통', { distribution_type: 'PRIVATE' }, 'DISTRIBUTION_DENIED'],
    ['가격 0', { price_general: 0 }, 'INVALID_PRICE'],
  ];

  it.each(cases)('%s → %s', async (_label, over, code) => {
    const { service } = makeService([cart()], [offer(over)]);
    const out = await service.confirm(scope);
    expect(out.orderCount).toBe(0);
    expect(out.failedItems.map((f) => f.code)).toContain(code);
  });

  it('offer 미조회 → OFFER_NOT_FOUND', async () => {
    const { service } = makeService([cart()], []);
    const out = await service.confirm(scope);
    expect(out.failedItems[0].code).toBe('OFFER_NOT_FOUND');
  });

  it('cart supplierId 불일치 → SUPPLIER_MISMATCH', async () => {
    const { service } = makeService([cart({ supplierId: 'sup-other' })], [offer()]);
    const out = await service.confirm(scope);
    expect(out.failedItems[0].code).toBe('SUPPLIER_MISMATCH');
  });

  it('supplierProductOfferId / supplierId 누락 → MISSING_*', async () => {
    const { service } = makeService(
      [cart({ supplierProductOfferId: null }), cart({ id: 'cart-2', supplierId: null })],
      [offer()],
    );
    const out = await service.confirm(scope);
    expect(out.failedItems.map((f) => f.code).sort()).toEqual(['MISSING_OFFER', 'MISSING_SUPPLIER']);
  });

  it('b2b/regular 가 아닌 항목 → UNSUPPORTED_CART_ITEM_SOURCE (event_offer 경로 보호)', async () => {
    const { service } = makeService([cart({ sourceType: 'event_offer' })], [offer()]);
    const out = await service.confirm(scope);
    expect(out.failedItems[0].code).toBe('UNSUPPORTED_CART_ITEM_SOURCE');
    expect(out.orderCount).toBe(0);
  });

  it.each([[0], [-1], [1001], [1.5]])('수량 %s → INVALID_QUANTITY', async (quantity) => {
    const { service } = makeService([cart({ quantity })], [offer()]);
    const out = await service.confirm(scope);
    expect(out.failedItems[0].code).toBe('INVALID_QUANTITY');
  });

  it('재고 부족 → INSUFFICIENT_STOCK', async () => {
    const { service } = makeService(
      [cart({ quantity: 5 })],
      [offer({ track_inventory: true, stock_quantity: 4, reserved_quantity: 2 })],
    );
    const out = await service.confirm(scope);
    expect(out.failedItems[0].code).toBe('INSUFFICIENT_STOCK');
  });

  it('같은 공급자 중 하나가 실패하면 그룹 전체를 보류한다 (GROUP_PARTIAL_FAILURE)', async () => {
    const { service } = makeService(
      [cart(), cart({ id: 'cart-2', supplierProductOfferId: 'offer-2' })],
      [offer(), offer({ id: 'offer-2', is_active: false })],
    );
    const out = await service.confirm(scope);
    expect(out.orderCount).toBe(0);
    expect(out.failedItems.map((f) => f.code).sort()).toEqual(['GROUP_PARTIAL_FAILURE', 'PRODUCT_INACTIVE']);
  });
});

describe('매장 조직 신뢰 경계 (결함 O1 · §32)', () => {
  it('cart 에 남의 조직 id 가 들어있으면 주문으로 승격되지 않는다', async () => {
    candidates.push({ organizationId: 'org-mine' });
    const { service } = makeService([cart({ organizationId: 'org-someone-else' })], [offer()]);

    await expect(service.confirm(scope)).rejects.toMatchObject({
      code: 'FOREIGN_STORE_ORGANIZATION',
      status: 403,
    });
    expect(createOrderCalls).toHaveLength(0);
  });

  it('cart 조직이 서버 후보 집합 안이면 seller 축으로 승격된다', async () => {
    candidates.push({ organizationId: 'org-mine' });
    const { service } = makeService([cart({ organizationId: 'org-mine' })], [offer()]);
    const out = await service.confirm(scope);

    expect(out.orderCount).toBe(1);
    expect(createOrderCalls[0].sellerId).toBe('org-mine');
    expect(createOrderCalls[0].sellerOrganizationId).toBe('org-mine');
  });

  it('body organizationId 스푸핑도 서버 후보 집합으로 차단된다', async () => {
    candidates.push({ organizationId: 'org-mine' });
    const { service } = makeService([cart()], [offer()]);

    await expect(service.confirm(scope, { organizationId: 'org-victim' })).rejects.toMatchObject({
      code: 'FOREIGN_STORE_ORGANIZATION',
    });
    expect(createOrderCalls).toHaveLength(0);
  });
});

describe('서비스 격리 (§29)', () => {
  it('cart 조회는 buyerId + serviceKey 로만 스코프된다', async () => {
    const cartFind = jest.fn(async () => [cart()]);
    const dataSource = {
      getRepository: () => ({ find: cartFind, delete: jest.fn(async () => ({ affected: 1 })) }),
      query: jest.fn(async () => [offer()]),
    } as any;
    await new NetureB2BCartCheckoutService(dataSource).confirm(scope);

    expect(cartFind.mock.calls[0][0]).toMatchObject({
      where: { buyerId: 'buyer-1', serviceKey: 'neture' },
    });
  });

  it('offer 재조회는 serviceKey 를 파라미터로 바인딩한다 (문자열 결합 금지)', async () => {
    const { service, queries } = makeService([cart()], [offer()]);
    await service.confirm(scope);

    expect(queries[0].params[1]).toBe('neture');
    expect(queries[0].sql).not.toContain("'neture'");
  });

  it('등록되지 않은 serviceKey 는 확정 불가', async () => {
    const { service } = makeService([cart()], [offer()]);
    await expect(
      service.confirm({ buyerId: 'buyer-1', serviceKey: 'unknown-service' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CART_SERVICE' });
  });
});
