/**
 * WO-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1
 *
 * OPL(organization_product_listings).service_key = canonical membership key 축임을 고정한다.
 * 종전 로컬 맵('kpa-society'→'kpa', 'k-cosmetics'→'cosmetics') 회귀 방지가 핵심이다.
 */
import {
  deriveListingServiceKeyFromMemberships,
  LISTING_SERVICE_KEYS,
} from '../listing-service-key.js';

const active = (serviceKey: string) => ({ serviceKey, status: 'active' });

describe('deriveListingServiceKeyFromMemberships', () => {
  it('KPA membership 은 canonical key 를 그대로 쓴다 (role-prefix 로 되돌리지 않는다)', () => {
    expect(deriveListingServiceKeyFromMemberships([active('kpa-society')])).toBe('kpa-society');
  });

  it('K-Cosmetics membership 도 canonical key 를 그대로 쓴다', () => {
    expect(deriveListingServiceKeyFromMemberships([active('k-cosmetics')])).toBe('k-cosmetics');
  });

  it('GlycoPharm / Neture 는 종전과 동일한 값 (회귀 없음)', () => {
    expect(deriveListingServiceKeyFromMemberships([active('glycopharm')])).toBe('glycopharm');
    expect(deriveListingServiceKeyFromMemberships([active('neture')])).toBe('neture');
  });

  it('role-prefix 키는 진열 축이 아니므로 도출되지 않는다', () => {
    expect(deriveListingServiceKeyFromMemberships([active('kpa')])).toBeNull();
    expect(deriveListingServiceKeyFromMemberships([active('cosmetics')])).toBeNull();
  });

  it('활성 membership 이 없으면 null (호출자가 거부)', () => {
    expect(deriveListingServiceKeyFromMemberships([])).toBeNull();
    expect(deriveListingServiceKeyFromMemberships(undefined)).toBeNull();
    expect(
      deriveListingServiceKeyFromMemberships([{ serviceKey: 'kpa-society', status: 'pending' }]),
    ).toBeNull();
  });

  it('multi-membership 은 결정적 우선순위 (neture 우선 — 종전 동작 보존)', () => {
    expect(
      deriveListingServiceKeyFromMemberships([active('kpa-society'), active('neture')]),
    ).toBe('neture');
    expect(
      deriveListingServiceKeyFromMemberships([active('glycopharm'), active('kpa-society')]),
    ).toBe('kpa-society');
  });

  it('진열 대상 키 집합은 canonical 4개로 고정', () => {
    expect([...LISTING_SERVICE_KEYS].sort()).toEqual(
      ['glycopharm', 'k-cosmetics', 'kpa-society', 'neture'],
    );
  });
});
