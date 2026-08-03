/**
 * WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1 (Phase 1)
 *
 * `PharmacyHubCartCheckoutService` 의 게이트·공급자 분리·서버 가격 재검증을 검증한다.
 * DataSource 와 checkoutService 를 stub 으로 대체해 DB 없이 순수 로직만 확인한다.
 */
import { PharmacyHubCartCheckoutService, PharmacyHubCheckoutError } from '../pharmacy-hub-cart-checkout.service.js';

// checkoutService.createOrder 를 가로채 호출 인자를 검사한다
const createOrderCalls: any[] = [];
jest.mock('../../checkout.service.js', () => ({
  checkoutService: {
    createOrder: jest.fn(async (dto: any) => {
      createOrderCalls.push(dto);
      const subtotal = dto.items.reduce((s: number, i: any) => s + i.subtotal, 0);
      return {
        id: `order-${createOrderCalls.length}`,
        orderNumber: `PH-${createOrderCalls.length}`,
        totalAmount: subtotal,
      };
    }),
  },
}));

type CartRow = {
  id: string;
  quantity: number;
  sourceType: string;
  productName: string;
  supplierId?: string | null;
  supplierProductOfferId?: string | null;
};

type OfferRow = Record<string, any>;

function makeService(cartItems: CartRow[], offerRows: OfferRow[]) {
  const deleted: any[] = [];
  const dataSource = {
    getRepository: () => ({
      find: jest.fn(async () => cartItems),
      delete: jest.fn(async (crit: any) => { deleted.push(crit); return { affected: 1 }; }),
    }),
    query: jest.fn(async () => offerRows),
  } as any;
  return { service: new PharmacyHubCartCheckoutService(dataSource), deleted };
}

const offer = (over: Partial<OfferRow> = {}): OfferRow => ({
  id: 'offer-1',
  supplier_id: 'sup-1',
  price_general: 12000,
  service_unit_price: 9900,
  is_active: true,
  distribution_type: 'SERVICE',
  track_inventory: false,
  stock_quantity: 0,
  reserved_quantity: 0,
  supplier_status: 'ACTIVE',
  master_status: 'ACTIVE',
  product_name: '검증상품 A',
  master_id: 'master-1',
  ...over,
});

const cart = (over: Partial<CartRow> = {}): CartRow => ({
  id: 'cart-1',
  quantity: 2,
  sourceType: 'b2b',
  productName: '검증상품 A',
  supplierId: 'sup-1',
  supplierProductOfferId: 'offer-1',
  ...over,
});

beforeEach(() => { createOrderCalls.length = 0; });

describe('빈 장바구니', () => {
  it('주문할 항목이 없으면 EMPTY_CART', async () => {
    const { service } = makeService([], []);
    await expect(service.confirm({ buyerId: 'buyer-1' })).rejects.toBeInstanceOf(PharmacyHubCheckoutError);
  });

  it('buyerId 가 없으면 INVALID_SCOPE', async () => {
    const { service } = makeService([cart()], [offer()]);
    await expect(service.confirm({ buyerId: '' } as any)).rejects.toMatchObject({ code: 'INVALID_SCOPE' });
  });
});

describe('정상 주문', () => {
  it('서비스별 공급가로 금액을 재계산한다 (프론트 단가 미신뢰)', async () => {
    const { service } = makeService([cart({ quantity: 2 })], [offer({ service_unit_price: 9900, price_general: 12000 })]);
    const out = await service.confirm({ buyerId: 'buyer-1' });

    expect(out.orders).toHaveLength(1);
    expect(createOrderCalls[0].items[0].unitPrice).toBe(9900);   // price_general(12000) 아님
    expect(createOrderCalls[0].items[0].subtotal).toBe(19800);
  });

  it('서비스별 공급가가 없으면 기본 공급가로 폴백한다', async () => {
    const { service } = makeService([cart({ quantity: 1 })], [offer({ service_unit_price: null, price_general: 12000 })]);
    await service.confirm({ buyerId: 'buyer-1' });
    expect(createOrderCalls[0].items[0].unitPrice).toBe(12000);
  });

  it('metadata.serviceKey 를 pharmacy-hub 로 고정한다', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm({ buyerId: 'buyer-1' });
    expect(createOrderCalls[0].metadata.serviceKey).toBe('pharmacy-hub');
    expect(createOrderCalls[0].metadata.source).toBe('pharmacy_hub_cart');
  });

  it('주문 시점 snapshot(offerId·masterId·supplierId·단가출처)을 저장한다', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm({ buyerId: 'buyer-1' });
    const md = createOrderCalls[0].items[0].metadata;
    expect(md.supplierProductOfferId).toBe('offer-1');
    expect(md.masterId).toBe('master-1');
    expect(md.supplierId).toBe('sup-1');
    expect(md.unitPriceSource).toBe('offer_service_price');
  });

  it('결제 상태를 임의로 만들지 않는다 (paymentStatus 미전달)', async () => {
    const { service } = makeService([cart()], [offer()]);
    await service.confirm({ buyerId: 'buyer-1' });
    expect(createOrderCalls[0].metadata.paymentStatus).toBeUndefined();
    expect(createOrderCalls[0].metadata.collectionStatus).toBeUndefined();
    // paid 전이는 오직 결제 완료 이벤트 핸들러만 수행한다 — 주문 생성은 관여하지 않는다.
  });

  it('공급자가 여럿이어도 1회 결제로 묶는다 (paymentGroupId)', async () => {
    // Phase 2(WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1) 에서
    // Phase 1 의 `metadata.phase='buyer-order-only'` 마커가 paymentGroupId 로 대체됐다.
    // 공급자 노출·fulfillment 가 실제로 생겼으므로 'buyer-order-only' 는 더 이상 사실이 아니다.
    const { service } = makeService(
      [cart({ id: 'cart-1', supplierId: 'sup-1', supplierProductOfferId: 'offer-1' }),
       cart({ id: 'cart-2', supplierId: 'sup-2', supplierProductOfferId: 'offer-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1' }),
       offer({ id: 'offer-2', supplier_id: 'sup-2' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });

    expect(out.paymentGroupId).toEqual(expect.any(String));
    expect(createOrderCalls).toHaveLength(2);          // 주문은 공급자별로 분리 유지
    expect(createOrderCalls[0].metadata.paymentGroupId).toBe(out.paymentGroupId);
    expect(createOrderCalls[1].metadata.paymentGroupId).toBe(out.paymentGroupId);
    expect(createOrderCalls[0].metadata.phase).toBeUndefined();
  });

  it('주문 성공한 항목은 장바구니에서 제거한다', async () => {
    const { service, deleted } = makeService([cart()], [offer()]);
    await service.confirm({ buyerId: 'buyer-1' });
    expect(deleted).toHaveLength(1);
  });
});

describe('공급자별 분리', () => {
  it('공급자가 다르면 주문도 분리된다', async () => {
    const { service } = makeService(
      [cart({ id: 'c1', supplierProductOfferId: 'offer-1', supplierId: 'sup-1' }),
       cart({ id: 'c2', supplierProductOfferId: 'offer-2', supplierId: 'sup-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1' }),
       offer({ id: 'offer-2', supplier_id: 'sup-2', product_name: '검증상품 B' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });

    expect(out.orders).toHaveLength(2);
    expect(createOrderCalls).toHaveLength(2);
    expect(new Set(createOrderCalls.map((c) => c.supplierId))).toEqual(new Set(['sup-1', 'sup-2']));
    // 한 주문에 두 공급자 상품이 섞이지 않는다
    for (const c of createOrderCalls) expect(c.items).toHaveLength(1);
  });

  it('같은 공급자 상품은 한 주문으로 묶인다', async () => {
    const { service } = makeService(
      [cart({ id: 'c1', supplierProductOfferId: 'offer-1' }),
       cart({ id: 'c2', supplierProductOfferId: 'offer-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1' }),
       offer({ id: 'offer-2', supplier_id: 'sup-1', product_name: '검증상품 B' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.orders).toHaveLength(1);
    expect(createOrderCalls[0].items).toHaveLength(2);
  });

  it('한 공급자 그룹에서 실패가 나면 그 그룹 전체를 주문하지 않는다', async () => {
    const { service } = makeService(
      [cart({ id: 'c1', supplierProductOfferId: 'offer-1' }),
       cart({ id: 'c2', supplierProductOfferId: 'offer-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1' }),
       offer({ id: 'offer-2', supplier_id: 'sup-1', is_active: false, product_name: '비활성' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });

    expect(out.orders).toHaveLength(0);
    expect(createOrderCalls).toHaveLength(0);
    expect(out.failedItems.map((f) => f.code).sort()).toEqual(['PRODUCT_INACTIVE', 'SUPPLIER_GROUP_FAILED']);
  });

  it('다른 공급자 그룹은 영향을 받지 않는다 (그룹 간 best-effort)', async () => {
    const { service } = makeService(
      [cart({ id: 'c1', supplierProductOfferId: 'offer-1', supplierId: 'sup-1' }),
       cart({ id: 'c2', supplierProductOfferId: 'offer-2', supplierId: 'sup-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1', is_active: false }),
       offer({ id: 'offer-2', supplier_id: 'sup-2', product_name: '정상' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.orders).toHaveLength(1);
    expect(out.orders[0].supplierId).toBe('sup-2');
  });
});

describe('게이트 — 주문 시점 재검증', () => {
  const cases: Array<[string, Partial<OfferRow>, string]> = [
    ['비활성 상품', { is_active: false }, 'PRODUCT_INACTIVE'],
    ['비활성 공급자', { supplier_status: 'PENDING' }, 'SUPPLIER_INACTIVE'],
    ['이용 불가 마스터', { master_status: 'ARCHIVED' }, 'MASTER_INACTIVE'],
    ['PRIVATE 유통', { distribution_type: 'PRIVATE' }, 'DISTRIBUTION_DENIED'],
    ['가격 0', { service_unit_price: null, price_general: 0 }, 'INVALID_PRICE'],
  ];

  it.each(cases)('%s 는 거부한다', async (_label, over, code) => {
    const { service } = makeService([cart()], [offer(over)]);
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.orders).toHaveLength(0);
    expect(out.failedItems[0].code).toBe(code);
  });

  it('미제공 상품(service_keys 미포함 → 조회 안 됨)은 NOT_DELIVERED', async () => {
    const { service } = makeService([cart()], []);   // 쿼리가 service_keys 로 이미 필터
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.failedItems[0].code).toBe('NOT_DELIVERED');
  });

  it('재고 추적 상품은 가용 수량을 초과하면 거부한다', async () => {
    const { service } = makeService(
      [cart({ quantity: 5 })],
      [offer({ track_inventory: true, stock_quantity: 10, reserved_quantity: 8 })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.failedItems[0].code).toBe('INSUFFICIENT_STOCK');
  });

  it('상품별 운영자 승인을 요구하지 않는다 (approval_status 무관)', async () => {
    // Pharmacy-Hub 는 상품별 승인이 없다 — approval_status 컬럼을 아예 보지 않는다
    const { service } = makeService([cart()], [offer({ approval_status: 'PENDING' })]);
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.orders).toHaveLength(1);
  });

  it('organizationId 를 요구하지 않는다', async () => {
    const { service } = makeService([cart({ id: 'c1' })], [offer({ distribution_type: 'SERVICE' })]);
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.orders).toHaveLength(1);   // 조직 컨텍스트 없이도 주문 가능
  });

  it('잘못된 수량은 거부한다', async () => {
    for (const q of [0, -1, 1001, 1.5]) {
      const { service } = makeService([cart({ quantity: q })], [offer()]);
      const out = await service.confirm({ buyerId: 'buyer-1' });
      expect(out.failedItems[0].code).toBe('INVALID_QUANTITY');
    }
  });

  it('offer 정보가 없는 cart 항목은 거부한다', async () => {
    const { service } = makeService([cart({ supplierProductOfferId: null })], []);
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.failedItems[0].code).toBe('MISSING_OFFER');
  });

  it('지원하지 않는 sourceType 은 거부한다', async () => {
    const { service } = makeService([cart({ sourceType: 'event_offer' })], []);
    const out = await service.confirm({ buyerId: 'buyer-1' });
    expect(out.failedItems[0].code).toBe('UNSUPPORTED_SOURCE_TYPE');
  });
});

describe('부분 선택 주문', () => {
  it('itemIds 로 지정한 항목만 주문한다', async () => {
    const { service } = makeService(
      [cart({ id: 'c1', supplierProductOfferId: 'offer-1' }),
       cart({ id: 'c2', supplierProductOfferId: 'offer-2' })],
      [offer({ id: 'offer-1', supplier_id: 'sup-1' })],
    );
    const out = await service.confirm({ buyerId: 'buyer-1' }, { itemIds: ['c1'] });
    expect(out.orders).toHaveLength(1);
    expect(createOrderCalls[0].items).toHaveLength(1);
  });
});
