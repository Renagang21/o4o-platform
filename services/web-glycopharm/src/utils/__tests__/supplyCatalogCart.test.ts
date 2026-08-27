/**
 * buildSupplyCatalogCartPayload — 승인 공급 카탈로그 → canonical store_cart_items 계약
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1 (§12 · §13 · §14 · §38)
 *
 * 여기서 고정하는 것은 "무엇을 주문 축으로 넘기는가" 다.
 *   · offer id 축   — 카탈로그 행 id 는 supplier_product_offers.id 다. master/legacy id 아님.
 *   · supplier 축    — neture_suppliers.id. 표시명(supplierName)·manufacturer 문자열 아님.
 *   · 가격 권위      — priceSnapshot 은 표시용. 서버가 확정 시 재확정한다.
 *   · 조직 권위      — organizationId 를 클라이언트가 정하지 않는다.
 */
import { describe, it, expect } from 'vitest';
import { buildSupplyCatalogCartPayload } from '../supplyCatalogCart';
import type { CatalogProduct } from '../../api/pharmacyProducts';

const product = (over: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    id: 'offer-1',
    name: '상품 A',
    category: null,
    description: null,
    purpose: null,
    distributionType: 'SERVICE',
    priceGeneral: 10000,
    priceGold: 9000,
    consumerReferencePrice: 12000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    supplierId: 'sup-1',
    supplierName: '공급자 A',
    supplierLogoUrl: null,
    supplierCategory: null,
    isAdded: false,
    ...over,
  }) as CatalogProduct;

describe('canonical B2B cart payload (§12)', () => {
  it('카탈로그 행 id 를 supplierProductOfferId 로 넘긴다', () => {
    const p = buildSupplyCatalogCartPayload(product());
    expect(p.supplierProductOfferId).toBe('offer-1');
    expect(p.sourceType).toBe('b2b');
    expect(p.pricingSource).toBe('regular');
    expect(p.quantity).toBe(1);
  });

  it('supplier 축은 supplierId 이며 표시명을 식별자로 쓰지 않는다', () => {
    const p = buildSupplyCatalogCartPayload(product({ supplierName: '공급자 A' }));
    expect(p.supplierId).toBe('sup-1');
    expect(JSON.stringify(p)).not.toContain('공급자 A');
  });

  it('event_offer / 매장 진열 축을 침범하지 않는다', () => {
    const p = buildSupplyCatalogCartPayload(product());
    expect(p.eventOfferId ?? null).toBeNull();
    expect(p.organizationProductListingId ?? null).toBeNull();
  });

  it('organizationId 를 클라이언트가 정하지 않는다 — 매장 판정 권위는 서버 (§14)', () => {
    const p = buildSupplyCatalogCartPayload(product()) as unknown as Record<string, unknown>;
    expect('organizationId' in p).toBe(false);
  });
});

describe('가격은 표시용 스냅샷일 뿐이다 (§13)', () => {
  it('서비스 공급가가 있으면 그것을 표시 스냅샷으로 쓴다', () => {
    expect(buildSupplyCatalogCartPayload(product()).priceSnapshot).toBe(9000);
  });

  it('서비스 공급가가 없으면 일반가로 떨어진다', () => {
    expect(buildSupplyCatalogCartPayload(product({ priceGold: null })).priceSnapshot).toBe(10000);
  });

  it('가격이 전혀 없어도 담기를 막지 않는다 — 확정 시 서버가 재확정한다', () => {
    const p = buildSupplyCatalogCartPayload(product({ priceGold: null, priceGeneral: null }));
    expect(p.priceSnapshot).toBe(0);
  });
});

describe('수량 (§24)', () => {
  it('기본 수량은 1이며, 수량 변경은 장바구니에서 한다', () => {
    expect(buildSupplyCatalogCartPayload(product()).quantity).toBe(1);
    expect(buildSupplyCatalogCartPayload(product(), 5).quantity).toBe(5);
  });
});
