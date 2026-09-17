/**
 * WO-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1 — SEO 브랜드 정체성 계약
 *
 * - 대표 홈 `/` · 미등록 공개 경로 = O4O 대표 title / 확정 description
 * - Supplier / Operator 미등록 경로 = Neture 서비스 surface (O4O 대표 title 로 덮지 않는다)
 * - Admin 미등록 경로 = O4O 플랫폼 관리
 * - 옛 정체성 "유통·협업 플랫폼" · "공급자·파트너 협업 플랫폼" 은 어디에도 없다
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { describe, expect, it } from 'vitest';
import {
  NETURE_SEO_DEFAULTS,
  NETURE_SUPPLIER_SEO_DEFAULTS,
  NETURE_OPERATOR_SEO_DEFAULTS,
  O4O_ADMIN_SEO_DEFAULTS,
  O4O_BRAND_DESCRIPTION,
  O4O_BRAND_TITLE,
  netureSeoRegistry,
  resolveNetureSeoDefaults,
} from '../seoRegistry';

const LEGACY = /유통·협업 플랫폼|유통 · 협업 플랫폼|파트너 협업 플랫폼|공급자·파트너/;

describe('seoRegistry — O4O / Neture 브랜드 정체성', () => {
  it('대표 홈 `/` 와 기본값은 O4O 대표 문구 (index.html 정적 값과 동일)', () => {
    expect(O4O_BRAND_TITLE).toBe('O4O — 소규모 사업자를 위한 통합 업무 공간');
    expect(O4O_BRAND_DESCRIPTION).toBe('소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.');
    expect(netureSeoRegistry['/']).toMatchObject({ title: O4O_BRAND_TITLE, description: O4O_BRAND_DESCRIPTION });
    expect(NETURE_SEO_DEFAULTS).toMatchObject({ title: O4O_BRAND_TITLE, description: O4O_BRAND_DESCRIPTION });
  });

  it('미등록 경로 fallback 은 surface 별 — Supplier / Operator = Neture, Admin = O4O 플랫폼 관리, 나머지 = O4O 대표', () => {
    expect(resolveNetureSeoDefaults('/supplier/dashboard')).toBe(NETURE_SUPPLIER_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/supplier/products/123')).toBe(NETURE_SUPPLIER_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/operator')).toBe(NETURE_OPERATOR_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/operator/contents')).toBe(NETURE_OPERATOR_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/admin/users')).toBe(O4O_ADMIN_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/mypage')).toBe(NETURE_SEO_DEFAULTS);
    expect(resolveNetureSeoDefaults('/unknown')).toBe(NETURE_SEO_DEFAULTS);
    // prefix 오탐 없음 (`/suppliers-xyz` 같은 경로는 Supplier surface 가 아니다)
    expect(resolveNetureSeoDefaults('/supplierx')).toBe(NETURE_SEO_DEFAULTS);
  });

  it('Neture 업무 공간 title 은 O4O 대표 title 이 아니고 Neture 를 명시한다', () => {
    expect(NETURE_SUPPLIER_SEO_DEFAULTS.title).toBe('공급자 업무 공간 — Neture');
    expect(NETURE_OPERATOR_SEO_DEFAULTS.title).toBe('서비스 운영 — Neture');
    expect(O4O_ADMIN_SEO_DEFAULTS.title).toBe('플랫폼 관리 — O4O');
    expect([NETURE_SUPPLIER_SEO_DEFAULTS, NETURE_OPERATOR_SEO_DEFAULTS, O4O_ADMIN_SEO_DEFAULTS].some((c) => c.title === O4O_BRAND_TITLE)).toBe(false);
  });

  it('옛 정체성 문구는 registry · 기본값 어디에도 없다', () => {
    const all = [
      NETURE_SEO_DEFAULTS, NETURE_SUPPLIER_SEO_DEFAULTS, NETURE_OPERATOR_SEO_DEFAULTS, O4O_ADMIN_SEO_DEFAULTS,
      ...Object.values(netureSeoRegistry),
    ].flatMap((c) => [c.title, c.description ?? '']);
    expect(all.filter((t) => LEGACY.test(t))).toEqual([]);
  });
});
