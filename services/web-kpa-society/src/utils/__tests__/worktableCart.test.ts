/**
 * 관심상품 작업대 → canonical B2B cart 계약 테스트
 *
 * WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1 §19–§22
 *
 * 고정하는 계약:
 *   · canonical resolve — offerId 동등 비교만. 이름/SKU heuristic 0.
 *   · approval/공급 게이트 — 서버 orderable 목록에 없으면 담기 불가.
 *   · 축 분리 — event_offer / seller_recruitment 는 B2B 담기 대상이 아니다.
 *   · price — 표시용 스냅샷이며 확정 권위가 아니다.
 */
import { describe, expect, it } from 'vitest';
import type { OrderableProduct } from '../../api/pharmacyProducts';
import {
  ORDERABILITY_LABEL,
  WORKTABLE_CART_SOURCE_TYPES,
  buildOrderableIndex,
  buildWorktableCartPayload,
  isValidCartQuantity,
  resolveOrderability,
} from '../worktableCart';

const OFFER_B2B = '11111111-1111-4111-8111-111111111111';
const OFFER_OPERATOR = '22222222-2222-4222-8222-222222222222';
const OFFER_EVENT = '33333333-3333-4333-8333-333333333333';
const OFFER_RECRUIT = '44444444-4444-4444-8444-444444444444';
const OFFER_UNKNOWN = '55555555-5555-4555-8555-555555555555';
const SUPPLIER = '99999999-9999-4999-8999-999999999999';

function orderableRow(offerId: string | null, sourceType: OrderableProduct['sourceType']): OrderableProduct {
  return {
    listingId: `listing-${offerId ?? 'null'}-${sourceType}`,
    offerId,
    masterId: 'master-1',
    sourceType,
    serviceKey: 'kpa-society',
    productName: '테스트 상품',
    category: null,
    supplierId: SUPPLIER,
    supplierName: '테스트 공급사',
    supplierLogoUrl: null,
    unitPrice: 1000,
    eventPrice: null,
    consumerReferencePrice: null,
    startAt: null,
    endAt: null,
    totalQuantity: null,
    perOrderLimit: null,
    perStoreLimit: null,
    createdAt: null,
  };
}

const INDEX = buildOrderableIndex([
  orderableRow(OFFER_B2B, 'b2b'),
  orderableRow(OFFER_OPERATOR, 'operator'),
  orderableRow(OFFER_EVENT, 'event_offer'),
  orderableRow(OFFER_RECRUIT, 'seller_recruitment'),
]);

describe('canonical resolve (§19)', () => {
  it('직접 offer relation 이 있으면 주문 가능으로 판정한다', () => {
    expect(resolveOrderability(OFFER_B2B, INDEX)).toBe('ORDERABLE');
    expect(resolveOrderability(OFFER_OPERATOR, INDEX)).toBe('ORDERABLE');
  });

  it('서버 주문가능 목록에 없는 관심상품은 차단한다 (승인/공급 게이트 미통과 포함)', () => {
    expect(resolveOrderability(OFFER_UNKNOWN, INDEX)).toBe('NOT_ORDERABLE');
  });

  it('offerId 가 없는 legacy-only 진열 행은 색인에 들어가지 않는다 (이름 보정 금지)', () => {
    const index = buildOrderableIndex([orderableRow(null, 'b2b')]);
    expect(index.size).toBe(0);
  });

  it('상품명이 같아도 offerId 가 다르면 대응시키지 않는다', () => {
    // 두 행 모두 productName='테스트 상품' 이지만 offerId 기준으로만 매칭된다.
    expect(resolveOrderability(OFFER_UNKNOWN, INDEX)).toBe('NOT_ORDERABLE');
    expect(INDEX.has(OFFER_UNKNOWN)).toBe(false);
  });
});

describe('approval / 공급 축 분리 (§20 · §14)', () => {
  it('B2B 담기 대상 공급유형은 b2b · operator 뿐이다', () => {
    expect([...WORKTABLE_CART_SOURCE_TYPES]).toEqual(['b2b', 'operator']);
  });

  it('event_offer 는 B2B 축으로 승격하지 않는다', () => {
    expect(resolveOrderability(OFFER_EVENT, INDEX)).toBe('EVENT_OFFER_AXIS');
  });

  it('seller_recruitment 는 주문 경로가 아니다', () => {
    expect(resolveOrderability(OFFER_RECRUIT, INDEX)).toBe('RECRUITMENT_AXIS');
  });

  it('같은 offer 가 여러 진열로 오면 주문 가능 축을 우선 채택한다', () => {
    const index = buildOrderableIndex([
      orderableRow(OFFER_B2B, 'b2b'),
      orderableRow(OFFER_B2B, 'seller_recruitment'),
    ]);
    expect(resolveOrderability(OFFER_B2B, index)).toBe('ORDERABLE');
  });

  it('모든 판정 코드에 표시 문구가 있다', () => {
    (['ORDERABLE', 'NOT_ORDERABLE', 'EVENT_OFFER_AXIS', 'RECRUITMENT_AXIS'] as const).forEach(code => {
      expect(ORDERABILITY_LABEL[code]).toBeTruthy();
    });
  });
});

describe('cart producer payload (§21)', () => {
  const product = {
    id: OFFER_B2B,
    productName: '관심상품 A',
    supplierId: SUPPLIER,
    basePrice: 12000,
  };

  it('canonical offer id 를 supplierProductOfferId 로 보낸다', () => {
    const payload = buildWorktableCartPayload(product, 3);
    expect(payload).toEqual({
      sourceType: 'b2b',
      supplierProductOfferId: OFFER_B2B,
      supplierId: SUPPLIER,
      productName: '관심상품 A',
      quantity: 3,
      pricingSource: 'regular',
      priceSnapshot: 12000,
    });
  });

  it('organizationId 를 payload 에 넣지 않는다 (매장 확정 권위 = 서버)', () => {
    expect(buildWorktableCartPayload(product, 1)).not.toHaveProperty('organizationId');
  });

  it('공급자 미연결이면 supplierId 는 null 로 보낸다 (표시명 주입 금지)', () => {
    const payload = buildWorktableCartPayload({ ...product, supplierId: null }, 1);
    expect(payload.supplierId).toBeNull();
  });

  it('잘못된 수량은 payload 를 만들지 않는다', () => {
    expect(() => buildWorktableCartPayload(product, 0)).toThrow();
    expect(() => buildWorktableCartPayload(product, -1)).toThrow();
    expect(() => buildWorktableCartPayload(product, 1.5)).toThrow();
    expect(isValidCartQuantity(0)).toBe(false);
    expect(isValidCartQuantity(2)).toBe(true);
  });
});

describe('price (§22)', () => {
  it('기준가가 없어도 담기는 가능하며 스냅샷은 0 이다 (확정 가격은 서버)', () => {
    const payload = buildWorktableCartPayload(
      { id: OFFER_B2B, productName: '가격 미설정', supplierId: SUPPLIER, basePrice: null },
      2,
    );
    expect(payload.priceSnapshot).toBe(0);
    expect(payload.pricingSource).toBe('regular');
  });
});
