/**
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (§4 · §5 · §30)
 *
 * `OfferExposureStrategy` — B2B confirm 의 **유일한 서비스 분기점**을 고정한다.
 * 여기가 흔들리면 승인 게이트가 조용히 우회되거나 기존 서비스의 공급 노출이 바뀐다.
 */
import {
  resolveOfferExposureStrategy,
  OFFER_EXPOSURE_STRATEGIES,
  type ExposureOfferRow,
} from '../offer-exposure-strategy.js';
import { APPROVAL_ELIGIBLE_SERVICE_KEYS } from '../../../modules/neture/constants/approval-service-keys.js';
import { SUPPLIER_OPTIN_SERVICE_KEYS } from '../../../modules/neture/constants/supplier-optin-services.js';

const row = (over: Partial<ExposureOfferRow> = {}): ExposureOfferRow => ({
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
});

const ctx = (over: Partial<{ buyerId: string; serviceKey: string; organizationId: string | null }> = {}) => ({
  buyerId: 'buyer-1',
  serviceKey: 'glycopharm',
  organizationId: 'org-1' as string | null,
  ...over,
});

describe('공급 축 상호 배타 (§5)', () => {
  it('승인 축과 opt-in 축은 교집합이 없다', () => {
    const optin = new Set<string>(SUPPLIER_OPTIN_SERVICE_KEYS);
    expect(APPROVAL_ELIGIBLE_SERVICE_KEYS.filter((k) => optin.has(k))).toEqual([]);
  });

  it('한 serviceKey 는 정확히 하나의 strategy 로만 해석된다', () => {
    for (const key of APPROVAL_ELIGIBLE_SERVICE_KEYS) {
      expect(resolveOfferExposureStrategy(key)?.key).toBe('approval');
    }
    for (const key of SUPPLIER_OPTIN_SERVICE_KEYS) {
      expect(resolveOfferExposureStrategy(key)?.key).toBe('optin');
    }
    expect(resolveOfferExposureStrategy('neture')?.key).toBe('neture');
  });

  it('등록되지 않은 serviceKey 는 B2B 확정 대상이 아니다', () => {
    expect(resolveOfferExposureStrategy('unknown-service')).toBeNull();
  });
});

describe('approval strategy (§30)', () => {
  const s = OFFER_EXPOSURE_STRATEGIES.approval;

  it('승인 행 조건을 SQL 에서 강제한다 — service_keys opt-in 으로 우회되지 않는다', () => {
    expect(s.offerWhereSql).toContain('offer_service_approvals');
    expect(s.offerWhereSql).toContain("approval_status = 'APPROVED'");
    expect(s.offerWhereSql).not.toContain('service_keys');
  });

  it('승인된 노출은 통과한다', () => {
    expect(s.gate(row(), ctx())).toBeNull();
  });

  it('offer.approval_status 는 이 축의 판정 근거가 아니다 (junction 승인이 권위)', () => {
    expect(s.gate(row({ approval_status: 'PENDING' }), ctx())).toBeNull();
  });

  it('마스터가 비활성이면 거부한다', () => {
    expect(s.gate(row({ master_status: 'ARCHIVED' }), ctx())?.code).toBe('MASTER_INACTIVE');
  });

  it('PRIVATE 유통은 허용된 seller 만 통과한다', () => {
    expect(s.gate(row({ distribution_type: 'PRIVATE' }), ctx())?.code).toBe('DISTRIBUTION_DENIED');
    expect(s.gate(row({ distribution_type: 'PRIVATE', allowed_seller_ids: ['buyer-1'] }), ctx())).toBeNull();
  });

  it('SERVICE 유통은 매장(조직) 컨텍스트를 요구한다', () => {
    expect(s.gate(row({ distribution_type: 'SERVICE' }), ctx({ organizationId: null }))?.code).toBe(
      'DISTRIBUTION_DENIED',
    );
    expect(s.gate(row({ distribution_type: 'SERVICE' }), ctx())).toBeNull();
  });
});

describe('optin strategy (§30)', () => {
  const s = OFFER_EXPOSURE_STRATEGIES.optin;

  it('공급자 opt-in(service_keys) 을 SQL 에서 강제한다', () => {
    expect(s.offerWhereSql).toContain('$2 = ANY(spo.service_keys)');
    expect(s.offerWhereSql).not.toContain('offer_service_approvals');
  });

  it('운영자 승인(approval_status)을 요구하지 않는다', () => {
    expect(s.gate(row({ approval_status: 'PENDING' }), ctx({ serviceKey: 'pharmacy-hub' }))).toBeNull();
  });

  it('조직 컨텍스트를 요구하지 않는다', () => {
    expect(
      s.gate(row({ distribution_type: 'SERVICE' }), ctx({ serviceKey: 'pharmacy-hub', organizationId: null })),
    ).toBeNull();
  });

  it('PRIVATE 유통은 축이 없으므로 거부한다', () => {
    expect(s.gate(row({ distribution_type: 'PRIVATE' }), ctx({ serviceKey: 'pharmacy-hub' }))?.code).toBe(
      'DISTRIBUTION_DENIED',
    );
  });

  it('마스터가 비활성이면 거부한다', () => {
    expect(s.gate(row({ master_status: 'ARCHIVED' }), ctx({ serviceKey: 'pharmacy-hub' }))?.code).toBe(
      'MASTER_INACTIVE',
    );
  });
});

describe('neture strategy — 현행 정책 보존 (§22 · §30)', () => {
  const s = OFFER_EXPOSURE_STRATEGIES.neture;
  const nctx = (over = {}) => ctx({ serviceKey: 'neture', ...over });

  it('서비스 노출 junction 을 쓰지 않는다 (WHERE 절 없음)', () => {
    expect(s.offerWhereSql).toBe('');
  });

  it('approval_status=APPROVED 만 통과한다', () => {
    expect(s.gate(row(), nctx())).toBeNull();
    expect(s.gate(row({ approval_status: 'PENDING' }), nctx())?.code).toBe('PRODUCT_NOT_APPROVED');
    expect(s.gate(row({ approval_status: 'REJECTED' }), nctx())?.code).toBe('PRODUCT_NOT_APPROVED');
  });

  it('allowed_seller_ids 로 PRIVATE 유통을 통제한다', () => {
    expect(s.gate(row({ distribution_type: 'PRIVATE' }), nctx())?.code).toBe('DISTRIBUTION_DENIED');
    expect(s.gate(row({ distribution_type: 'PRIVATE', allowed_seller_ids: ['other'] }), nctx())?.code).toBe(
      'DISTRIBUTION_DENIED',
    );
    expect(s.gate(row({ distribution_type: 'PRIVATE', allowed_seller_ids: ['buyer-1'] }), nctx())).toBeNull();
  });

  it('SERVICE 유통은 매장(조직) 컨텍스트를 요구한다', () => {
    expect(s.gate(row({ distribution_type: 'SERVICE' }), nctx({ organizationId: null }))?.code).toBe(
      'DISTRIBUTION_DENIED',
    );
  });

  it('마스터 상태는 이 축의 판정 근거가 아니다 (현행 보존)', () => {
    expect(s.gate(row({ master_status: 'ARCHIVED' }), nctx())).toBeNull();
  });
});
