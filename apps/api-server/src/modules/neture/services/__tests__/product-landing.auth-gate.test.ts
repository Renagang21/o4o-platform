/**
 * ProductLandingService.getPublicLanding — Auth Gate Unit Tests
 *
 * WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT (#8 서버 인증 / #9 로그인 열람) · ADR-0002
 *
 * 검증(보안 핵심): 비로그인(isAuthed=false)에는 설명서 본문/summary 가 절대 응답되지 않고
 *   authRequired=true + 최소 상품 식별정보(제품명)만 반환한다. 로그인(isAuthed=true)에만 본문을 응답한다.
 *   DB 비의존 — dataSource.query 를 SQL 분기로 목킹한다.
 */

import type { DataSource } from 'typeorm';
import { ProductLandingService } from '../product-landing.service.js';

const LANDING = {
  id: 'landing-1',
  product_master_id: 'master-1',
  public_key: 'abcd2345wxyz',
  status: 'active',
  exposure_state: 'ok',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};
const BODY = '<div class="sd-card">비밀 설명서 본문</div>';

/** SQL 분기 목 DataSource. landing 존재/노출상태를 옵션으로 조절. */
function fakeDataSource(opts: { landing?: any } = {}): DataSource {
  const landing = 'landing' in opts ? opts.landing : LANDING;
  return {
    query: async (sql: string, _params?: any[]) => {
      if (sql.includes('FROM product_landings')) return landing ? [landing] : [];
      if (sql.includes('manufacturer_name')) {
        return [{ name: '테스트 비타민C', manufacturer_name: '테스트제약', barcode: '8800000000001', regulatory_type: 'GENERAL', specification: '60정' }];
      }
      if (sql.includes('FROM product_masters')) return [{ name: '테스트 비타민C' }]; // 최소 식별(제품명)
      if (sql.includes('DISTINCT COALESCE(language')) return [{ lang: 'ko' }];
      if (sql.includes('SELECT content, summary')) return [{ content: BODY, summary: '요약 텍스트', description_type: 'STORE' }];
      return [];
    },
  } as unknown as DataSource;
}

describe('ProductLandingService.getPublicLanding — auth gate', () => {
  it('비로그인: authRequired=true, 본문/summary 미포함, 제품명만 노출', async () => {
    const svc = new ProductLandingService(fakeDataSource());
    const data = await svc.getPublicLanding(LANDING.public_key, undefined, false);
    expect(data).not.toBeNull();
    expect(data!.authRequired).toBe(true);
    expect(data!.description.content).toBeNull();
    expect(data!.description.summary).toBeNull();
    expect(data!.description.hasCanonical).toBe(false);
    expect(data!.product?.name).toBe('테스트 비타민C');
    // 최소 식별만 — 제조사/바코드/규격 등은 비로그인에 노출하지 않는다
    expect(data!.product?.manufacturerName).toBeNull();
    expect(data!.product?.barcode).toBeNull();
    expect(data!.languages).toEqual([]);
  });

  it('로그인: authRequired=false, 설명서 본문 응답', async () => {
    const svc = new ProductLandingService(fakeDataSource());
    const data = await svc.getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.authRequired).toBe(false);
    expect(data!.blocked).toBe(false);
    expect(data!.description.hasCanonical).toBe(true);
    expect(data!.description.content).toBe(BODY);
    expect(data!.description.summary).toBe('요약 텍스트');
    expect(data!.product?.manufacturerName).toBe('테스트제약');
  });

  it('기본값(isAuthed 미지정) = 비로그인 처리(본문 미포함)', async () => {
    const svc = new ProductLandingService(fakeDataSource());
    const data = await svc.getPublicLanding(LANDING.public_key);
    expect(data!.authRequired).toBe(true);
    expect(data!.description.content).toBeNull();
  });

  it('존재하지 않는 key: null (404 대상 — 인증필요와 구분)', async () => {
    const svc = new ProductLandingService(fakeDataSource({ landing: null }));
    const data = await svc.getPublicLanding('nope', undefined, false);
    expect(data).toBeNull();
  });

  it('로그인 + 노출 게이트 차단(exposure): blocked=true, 본문 미포함', async () => {
    const svc = new ProductLandingService(fakeDataSource({ landing: { ...LANDING, exposure_state: 'blocked' } }));
    const data = await svc.getPublicLanding(LANDING.public_key, undefined, true);
    expect(data!.blocked).toBe(true);
    expect(data!.authRequired).toBe(false);
    expect(data!.description.content).toBeNull();
  });
});
