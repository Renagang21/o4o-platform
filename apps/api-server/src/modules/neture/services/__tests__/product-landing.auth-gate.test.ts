/**
 * ProductLandingService.getPublicLanding — Auth Gate + Supplier Credit Unit Tests
 *
 * WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1 (auth gate)
 * WO-O4O-SUPPLIER-PRODUCT-DESCRIPTION-AUTO-CREDIT-V1 (supplier credit)
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT · ADR-0002
 *
 * 검증:
 *  (auth) 비로그인엔 본문/summary 미응답 + authRequired, 로그인에만 본문.
 *  (credit) 공급자 제작(source_type='supplier')에만 제작원(조직명+공개연락처), O4O/매장/깨진체인/비활성조직은 null.
 * DB 비의존 — dataSource.query 를 SQL 분기로 목킹.
 */

import type { DataSource } from 'typeorm';
import { ProductLandingService } from '../product-landing.service.js';

const LANDING = {
  id: 'landing-1', product_master_id: 'master-1', public_key: 'abcd2345wxyz',
  status: 'active', exposure_state: 'ok', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
};
const BODY = '<div class="sd-card">비밀 설명서 본문</div>';

/** SQL 분기 목 DataSource. */
function fakeDataSource(opts: { landing?: any; spd?: any; credit?: any } = {}): DataSource {
  const landing = 'landing' in opts ? opts.landing : LANDING;
  const spd = 'spd' in opts ? opts.spd
    : { content: BODY, summary: '요약', description_type: 'STORE', source_type: 'operator', source_ref_id: null };
  const credit = 'credit' in opts ? opts.credit : null; // row from offer→supplier→org join
  return {
    query: async (sql: string, _params?: any[]) => {
      if (sql.includes('FROM product_landings')) return landing ? [landing] : [];
      if (sql.includes('FROM supplier_product_offers')) return credit ? [credit] : [];
      if (sql.includes('manufacturer_name')) return [{ name: '테스트 비타민C', manufacturer_name: '테스트제약', barcode: '8800000000001', regulatory_type: 'GENERAL', specification: '60정' }];
      if (sql.includes('FROM product_masters')) return [{ name: '테스트 비타민C' }];
      if (sql.includes('DISTINCT COALESCE(language')) return [{ lang: 'ko' }];
      if (sql.includes('SELECT content, summary')) return spd ? [spd] : [];
      return [];
    },
  } as unknown as DataSource;
}

const supplierSpd = { content: BODY, summary: '요약', description_type: 'STORE', source_type: 'supplier', source_ref_id: 'offer-1' };

describe('getPublicLanding — auth gate', () => {
  it('비로그인: authRequired=true, 본문/summary 미포함, 제품명만', async () => {
    const data = await new ProductLandingService(fakeDataSource()).getPublicLanding(LANDING.public_key, undefined, false);
    expect(data!.authRequired).toBe(true);
    expect(data!.description.content).toBeNull();
    expect(data!.description.summary).toBeNull();
    expect(data!.supplierCredit).toBeNull();
    expect(data!.product?.name).toBe('테스트 비타민C');
    expect(data!.product?.manufacturerName).toBeNull();
  });

  it('로그인: authRequired=false, 본문 응답', async () => {
    const data = await new ProductLandingService(fakeDataSource()).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.authRequired).toBe(false);
    expect(data!.description.content).toBe(BODY);
  });

  it('기본값 = 비로그인(본문 미포함)', async () => {
    const data = await new ProductLandingService(fakeDataSource()).getPublicLanding(LANDING.public_key);
    expect(data!.authRequired).toBe(true);
    expect(data!.description.content).toBeNull();
  });

  it('미존재 key: null', async () => {
    expect(await new ProductLandingService(fakeDataSource({ landing: null })).getPublicLanding('nope', undefined, false)).toBeNull();
  });

  it('로그인 + exposure 차단: blocked, 본문 미포함', async () => {
    const data = await new ProductLandingService(fakeDataSource({ landing: { ...LANDING, exposure_state: 'blocked' } })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.blocked).toBe(true);
    expect(data!.description.content).toBeNull();
    expect(data!.supplierCredit).toBeNull();
  });
});

describe('getPublicLanding — supplier credit (WO-...-AUTO-CREDIT-V1)', () => {
  const orgRow = (over: any = {}) => ({ org_name: '주식회사 예시공급자', org_active: true, phone: '02-123-4567', email: 'sales@ex.com', phone_vis: 'private', email_vis: 'public', ...over });

  it('공급자 설명서 + 공개 이메일 → credit(조직명 + 이메일)', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow() })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toEqual({ organizationName: '주식회사 예시공급자', contact: 'sales@ex.com' });
  });

  it('전화 공개면 전화 우선', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow({ phone_vis: 'public' }) })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toEqual({ organizationName: '주식회사 예시공급자', contact: '02-123-4567' });
  });

  it('공개 연락처 없음 → contact null(제작 행만)', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow({ phone_vis: 'private', email_vis: 'private' }) })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toEqual({ organizationName: '주식회사 예시공급자', contact: null });
  });

  it('O4O 설명서(operator) → credit 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ credit: orgRow() })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toBeNull();
  });

  it('매장 자체 콘텐츠(store_contribution) → credit 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: { ...supplierSpd, source_type: 'store_contribution' } })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toBeNull();
  });

  it('깨진 체인(offer/supplier/org 부재) → 본문 정상 + credit 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: null })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.description.content).toBe(BODY);
    expect(data!.supplierCredit).toBeNull();
  });

  it('비활성 조직 → credit 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow({ org_active: false }) })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toBeNull();
  });

  it('조직명 없음 → credit 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow({ org_name: '  ' }) })).getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.supplierCredit).toBeNull();
  });

  it('비로그인 공급자 설명서 → 본문·credit 모두 없음', async () => {
    const data = await new ProductLandingService(fakeDataSource({ spd: supplierSpd, credit: orgRow() })).getPublicLanding(LANDING.public_key, undefined, false);
    expect(data!.description.content).toBeNull();
    expect(data!.supplierCredit).toBeNull();
  });
});
