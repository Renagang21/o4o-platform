/**
 * CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 D1 — 이벤트 장바구니 확정의 구매 약국 판정
 *
 * 세미프랜차이즈 서비스(kpa-society → pharmacy)의 이벤트 공급은 **서버가 확정한 구매 약국 조직**의
 * pharmacy 가입이 active 일 때만 주문한다. 같은 사용자가 가진 다른 약국의 가입으로 대신 인정하지 않는다.
 *
 *   사례: 사용자 1명이 A · B 약국(둘 다 내 매장(약국) 신청 active)을 운영하고, A 만 pharmacy 가입 승인.
 *     - A 약국 주문 → 허용
 *     - B 약국 주문 → 차단(SEMI_FRANCHISE_MEMBERSHIP_REQUIRED) · 재고 차감 · 주문 생성 없음
 *     - 약국 선택 없음 → 임의의 약국을 고르지 않는다(400 AMBIGUOUS) — B2B confirm 과 같은 계약
 *     - 남의 약국 지정 → 403
 *   이벤트 운영 조직(ctx.organizationId)은 구매 약국 판정에 쓰지 않는다. k-cosmetics 는 판정 대상이 아니다.
 */
import { EventOfferCartCheckoutService } from '../event-offer-cart-checkout.service.js';
import { B2BConfirmError } from '../b2b-checkout-confirm.core.js';

const createOrderCalls: any[] = [];
jest.mock('../../checkout.service.js', () => ({
  checkoutService: {
    createOrder: jest.fn(async (dto: any) => {
      createOrderCalls.push(dto);
      const subtotal = dto.items.reduce((s: number, i: any) => s + i.subtotal, 0);
      return { id: `order-${createOrderCalls.length}`, orderNumber: `ORD-${createOrderCalls.length}`, subtotal, shippingFee: 0, totalAmount: subtotal };
    }),
  },
}));

/** 서버가 인정하는 구매 약국 후보 — kpa 축은 내 매장(약국) 신청 active 약국 조직 */
const candidates: Array<{ organizationId: string; memberRole: string }> = [];
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  findStoreOrganizationCandidates: jest.fn(async () => candidates),
  findAnyServiceStoreOrganizationCandidates: jest.fn(async () => candidates),
}));

const reserveCalls: any[] = [];
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({
  EventOfferService: jest.fn().mockImplementation(() => ({
    loadEventOfferContext: jest.fn(async (listingId: string) => ({
      listingId,
      offerId: 'offer-1',
      masterId: 'master-1',
      productName: '이벤트 상품',
      unitPrice: 10000,
      supplierId: 'sup-1',
      organizationId: 'event-operator-org', // 이벤트 운영 조직 — 구매 약국이 아니다
      shippingPolicy: null,
    })),
    reserveEventOfferListing: jest.fn(async (_qr: any, args: any) => {
      reserveCalls.push(args);
      return { decrementedQty: args.quantity };
    }),
    tryLinkStoreProduct: jest.fn(async () => undefined),
    incrementListingQuantity: jest.fn(async () => undefined),
  })),
}));

/** 약국 조직별 active 세미프랜차이즈 가입 — semi_franchise_memberships 의 대역 */
const SF_BY_ORG: Record<string, string[]> = { 'org-A': ['pharmacy'], 'org-B': [] };
const sfQueries: any[] = [];

function makeService(cartItems: Array<Record<string, any>>) {
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: false,
  };
  const dataSource = {
    getRepository: () => ({
      find: jest.fn(async () => cartItems),
      delete: jest.fn(async () => ({ affected: cartItems.length })),
    }),
    createQueryRunner: () => queryRunner,
    query: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('semi_franchise_memberships')) {
        sfQueries.push(params);
        return (SF_BY_ORG[params[0]] ?? []).map((key) => ({ key }));
      }
      throw new Error(`unexpected query: ${sql}`);
    }),
  } as any;
  return new EventOfferCartCheckoutService(dataSource);
}

const eventItem = (over: Record<string, any> = {}) => ({
  id: 'cart-1',
  buyerId: 'user-1',
  serviceKey: 'kpa-society',
  sourceType: 'event_offer',
  eventOfferId: 'listing-1',
  organizationId: null,
  quantity: 2,
  ...over,
});

const KPA = { buyerId: 'user-1', serviceKey: 'kpa-society' };

beforeEach(() => {
  createOrderCalls.length = 0;
  reserveCalls.length = 0;
  sfQueries.length = 0;
  candidates.length = 0;
  // 같은 사용자 · A · B 두 약국(둘 다 내 매장(약국) 신청 active), pharmacy 가입은 A 만 active
  candidates.push({ organizationId: 'org-A', memberRole: 'owner' }, { organizationId: 'org-B', memberRole: 'owner' });
});

describe('이벤트 장바구니 확정 — 구매 약국 조직 기준 pharmacy 가입 판정', () => {
  it('A 약국(pharmacy 가입 active)으로 주문 → 허용', async () => {
    const r = await makeService([eventItem()]).confirm(KPA, { organizationId: 'org-A' });
    expect(r.failedItems).toEqual([]);
    expect(r.createdOrders).toHaveLength(1);
    expect(createOrderCalls).toHaveLength(1);
    expect(sfQueries).toEqual([['org-A']]);
  });

  it('B 약국(pharmacy 가입 없음)으로 주문 → 차단 · 재고 차감 · 주문 생성 없음 (A 의 가입으로 대신 인정하지 않는다)', async () => {
    const r = await makeService([eventItem()]).confirm(KPA, { organizationId: 'org-B' });
    expect(r.createdOrders).toEqual([]);
    expect(r.failedItems).toEqual([expect.objectContaining({ itemId: 'cart-1', reason: 'SEMI_FRANCHISE_MEMBERSHIP_REQUIRED' })]);
    expect(reserveCalls).toEqual([]);
    expect(createOrderCalls).toEqual([]);
    expect(sfQueries).toEqual([['org-B']]);
  });

  it('장바구니에 담긴 약국이 B 면 B 기준으로 판정한다 (요청 선택값이 없을 때)', async () => {
    const r = await makeService([eventItem({ organizationId: 'org-B' })]).confirm(KPA, {});
    expect(r.failedItems[0]?.reason).toBe('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
    expect(createOrderCalls).toEqual([]);
  });

  it('약국 선택이 없고 후보가 둘이면 임의로 고르지 않는다 → 400 AMBIGUOUS', async () => {
    const err = await makeService([eventItem()]).confirm(KPA, {}).catch((e) => e);
    expect(err).toBeInstanceOf(B2BConfirmError);
    expect(err.code).toBe('AMBIGUOUS_STORE_ORGANIZATION');
    expect(err.status).toBe(400);
    expect(sfQueries).toEqual([]);
    expect(createOrderCalls).toEqual([]);
  });

  it('장바구니에 서로 다른 약국이 섞여 있고 선택이 없으면 400 AMBIGUOUS', async () => {
    const err = await makeService([
      eventItem({ id: 'cart-1', organizationId: 'org-A' }),
      eventItem({ id: 'cart-2', organizationId: 'org-B' }),
    ]).confirm(KPA, {}).catch((e) => e);
    expect(err.code).toBe('AMBIGUOUS_STORE_ORGANIZATION');
    expect(createOrderCalls).toEqual([]);
  });

  it('후보가 A 하나뿐이면 서버가 A 로 확정한다', async () => {
    candidates.splice(1);
    const r = await makeService([eventItem()]).confirm(KPA, {});
    expect(r.createdOrders).toHaveLength(1);
    expect(sfQueries).toEqual([['org-A']]);
  });

  it('남의 약국을 지정하면 403 FOREIGN_STORE_ORGANIZATION', async () => {
    const err = await makeService([eventItem()]).confirm(KPA, { organizationId: 'org-X' }).catch((e) => e);
    expect(err.code).toBe('FOREIGN_STORE_ORGANIZATION');
    expect(err.status).toBe(403);
    expect(createOrderCalls).toEqual([]);
  });

  it('주문할 수 있는 약국이 없으면 403 STORE_ORGANIZATION_NOT_FOUND', async () => {
    candidates.length = 0;
    const err = await makeService([eventItem()]).confirm(KPA, {}).catch((e) => e);
    expect(err.code).toBe('STORE_ORGANIZATION_NOT_FOUND');
    expect(createOrderCalls).toEqual([]);
  });

  describe('화면이 고른 매장 헤더(X-Store-Organization-Id) — 공용 장바구니 화면은 body 에 조직을 싣지 않는다', () => {
    it('헤더 = A → 다중 약국이어도 A 로 확정 · 허용', async () => {
      const r = await makeService([eventItem()]).confirm(KPA, { preferredOrganizationId: 'org-A' });
      expect(r.createdOrders).toHaveLength(1);
      expect(sfQueries).toEqual([['org-A']]);
    });

    it('헤더 = B → B 로 확정 · 차단', async () => {
      const r = await makeService([eventItem()]).confirm(KPA, { preferredOrganizationId: 'org-B' });
      expect(r.failedItems[0]?.reason).toBe('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
      expect(createOrderCalls).toEqual([]);
    });

    it('헤더가 후보 밖이면 없는 것과 같다 (403 아님 → 다중 약국은 400)', async () => {
      const err = await makeService([eventItem()]).confirm(KPA, { preferredOrganizationId: 'org-X' }).catch((e) => e);
      expect(err.code).toBe('AMBIGUOUS_STORE_ORGANIZATION');
    });

    it('명시 선택(body)이 헤더보다 우선한다', async () => {
      const r = await makeService([eventItem()]).confirm(KPA, { organizationId: 'org-B', preferredOrganizationId: 'org-A' });
      expect(r.failedItems[0]?.reason).toBe('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
      expect(sfQueries).toEqual([['org-B']]);
    });
  });

  it('이벤트 운영 조직(ctx.organizationId)은 판정에 쓰지 않는다', async () => {
    await makeService([eventItem()]).confirm(KPA, { organizationId: 'org-A' });
    expect(sfQueries.flat()).not.toContain('event-operator-org');
  });

  it('k-cosmetics 이벤트는 세미프랜차이즈 판정 대상이 아니다 (조직 확정 · 가입 조회 없음)', async () => {
    const r = await makeService([eventItem({ serviceKey: 'k-cosmetics' })]).confirm(
      { buyerId: 'user-1', serviceKey: 'k-cosmetics' },
      {},
    );
    expect(r.createdOrders).toHaveLength(1);
    expect(sfQueries).toEqual([]);
  });
});
