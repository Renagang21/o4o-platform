/**
 * 기존 서비스 매장 경로 → 통합 Store Workspace returnPath 매핑 계약
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4
 */
import { describe, it, expect } from 'vitest';
import { isUnifiedStoreHandoffEnabled, mapLegacyStorePathToUnified } from '../workspace/unifiedStoreHandoff';

describe('isUnifiedStoreHandoffEnabled — 기본 OFF', () => {
  it("'true' | '1' 만 ON", () => {
    expect(isUnifiedStoreHandoffEnabled('true')).toBe(true);
    expect(isUnifiedStoreHandoffEnabled('1')).toBe(true);
    expect(isUnifiedStoreHandoffEnabled(undefined)).toBe(false);
    expect(isUnifiedStoreHandoffEnabled('')).toBe(false);
    expect(isUnifiedStoreHandoffEnabled('false')).toBe(false);
    expect(isUnifiedStoreHandoffEnabled('yes')).toBe(false);
  });
});

describe('mapLegacyStorePathToUnified — KPA', () => {
  const m = (p: string, s = '') => mapLegacyStorePathToUnified('kpa-society', p, s);
  it('공통 기능은 /store 그대로, 서비스 종속은 /work/kpa-society', () => {
    expect(m('/store')).toBe('/store');
    expect(m('/store/marketing/qr')).toBe('/store/marketing/qr');
    expect(m('/store/my-products')).toBe('/store/my-products');
    expect(m('/store/commerce/tablet-displays')).toBe('/store/commerce/tablet-displays');
    expect(m('/store/commerce/products')).toBe('/work/kpa-society/commerce/products');
    expect(m('/store/commerce/products/abc/pop')).toBe('/work/kpa-society/commerce/products/abc/pop');
    expect(m('/store/commerce/order-worktable')).toBe('/work/kpa-society/commerce/order-worktable');
    expect(m('/store/online-sales/products')).toBe('/work/kpa-society/online-sales/products');
    expect(m('/store/sales-channels/foreign-visitor/partners')).toBe('/work/kpa-society/sales-channels/foreign-visitor/partners');
  });
  it('workspace/services/store-hub 는 상위 구조로', () => {
    expect(m('/store/workspace')).toBe('/');
    expect(m('/store/services')).toBe('/services');
    expect(m('/store-hub')).toBe('/hub');
    expect(m('/store-hub/event-offers', '?x=1')).toBe('/hub/event-offers?x=1');
  });
});

describe('mapLegacyStorePathToUnified — KCos', () => {
  const m = (p: string) => mapLegacyStorePathToUnified('k-cosmetics', p);
  it('서비스 종속 4종 + legacy 단축 경로', () => {
    expect(m('/store/commerce/products')).toBe('/work/k-cosmetics/commerce/products');
    expect(m('/store/commerce/billing')).toBe('/work/k-cosmetics/commerce/billing');
    expect(m('/store/interest-requests')).toBe('/work/k-cosmetics/interest-requests');
    expect(m('/store/orders')).toBe('/work/k-cosmetics/commerce/orders');
    expect(m('/store/channels')).toBe('/work/k-cosmetics');
    expect(m('/store/local-products')).toBe('/store/commerce/local-products');
    expect(m('/store/signage/playlist')).toBe('/store/marketing/signage/playlist');
    expect(m('/store/library/product-descriptions')).toBe('/store/marketing/product-descriptions');
    expect(m('/store/marketing/pop-v2')).toBe('/store/marketing/pop-v2');
    expect(m('/store')).toBe('/store');
  });
});

describe('mapLegacyStorePathToUnified — PharmacyHub', () => {
  const m = (p: string) => mapLegacyStorePathToUnified('pharmacy-hub', p);
  it('공급 상품·장바구니·주문·결제는 /work/pharmacy-hub, 나머지는 공통', () => {
    expect(m('/store-owner')).toBe('/store');
    expect(m('/store-owner/products')).toBe('/work/pharmacy-hub/products');
    expect(m('/store-owner/products/offer-1')).toBe('/work/pharmacy-hub/products/offer-1');
    expect(m('/store-owner/cart')).toBe('/work/pharmacy-hub/cart');
    expect(m('/store-owner/orders/o-1')).toBe('/work/pharmacy-hub/orders/o-1');
    expect(m('/store-owner/payment/success')).toBe('/work/pharmacy-hub/payment/success');
    expect(m('/store-owner/products/multilingual/listing/x')).toBe('/store/products/multilingual/listing/x');
    expect(m('/store-owner/handled-products')).toBe('/store/handled-products');
    expect(m('/store-owner/library')).toBe('/store/library/contents');
    expect(m('/store-owner/blog/new')).toBe('/store/content/blog');
    expect(m('/store-owner/signage/media')).toBe('/store/marketing/signage/videos');
    expect(m('/store-owner/tablets')).toBe('/store/commerce/tablet-displays');
    expect(m('/store-owner/account')).toBe('/settings');
    expect(m('/store-owner/workspace')).toBe('/');
    expect(m('/store-hub')).toBe('/hub');
    expect(m('/store-owner/manuals/x')).toBe('/store'); // 통합 미제공 → 공통 홈 안전 착지
  });
});
