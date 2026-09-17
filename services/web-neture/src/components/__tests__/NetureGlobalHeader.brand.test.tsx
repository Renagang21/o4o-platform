/**
 * WO-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1 — 헤더 브랜드 계약
 *
 * NetureGlobalHeader 는 Neture chrome(커뮤니티 · 마이페이지 · Supplier / Operator / Admin) 공통.
 * 브랜드 이름 = Neture(서비스 Identity) · 부제 = "O4O 통합 업무 공간" · Legacy Partner 문구 0.
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() }, API_BASE_URL: 'https://api.neture.co.kr' }));

import { NETURE_HEADER_BRAND } from '../NetureGlobalHeader';

describe('NetureGlobalHeader — 브랜드', () => {
  it('이름 Neture · 부제 "O4O 통합 업무 공간" · 파트너 / 협업 플랫폼 문구 없음', () => {
    expect(NETURE_HEADER_BRAND.name).toBe('Neture');
    expect(NETURE_HEADER_BRAND.subtitle).toBe('O4O 통합 업무 공간');
    expect(/파트너|협업 플랫폼/.test(NETURE_HEADER_BRAND.subtitle)).toBe(false);
  });
});
