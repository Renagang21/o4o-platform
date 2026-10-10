/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — pharmacy.neture.co.kr 표시 브랜드 계약
 *
 * - 사용자 화면 표시 이름 = O4O 약국 (serviceKey `kpa-society` 등 내부 식별자는 불변)
 * - 공개 홈 Hero = WO 확정 문구 · 메타 = 같은 문구
 * - og:url · canonical = pharmacy.neture.co.kr 기준
 * - 사용자 제작 brand asset 은 자리만 — 투입 전에는 참조하지 않는다
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-society/vitest.config.mjs`
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  PHARMACY_BRAND_ASSETS_READY,
  PHARMACY_BRAND_ASSET_SLOTS,
  PHARMACY_DISPLAY_NAME,
  PHARMACY_HEADER_BRAND,
  PHARMACY_HERO,
  PHARMACY_ORIGIN,
} from '../brand';
import {
  KPA_SEO_DEFAULTS,
  PHARMACY_HOME_DESCRIPTION,
  PHARMACY_HOME_TITLE,
  applyPharmacyUrlMeta,
  kpaSeoRegistry,
} from '../seoRegistry';
import { KPA_FOOTER_SECTIONS } from '../navigation';

afterEach(() => {
  document.head.innerHTML = '';
});

describe('O4O 약국 표시 브랜드', () => {
  it('표시 이름 · 헤더 브랜드', () => {
    expect(PHARMACY_DISPLAY_NAME).toBe('O4O 약국');
    expect(PHARMACY_HEADER_BRAND.name).toBe('O4O 약국');
    expect(PHARMACY_ORIGIN).toBe('https://pharmacy.neture.co.kr');
  });

  it('Hero 확정 문구', () => {
    expect(PHARMACY_HERO.title).toEqual(['약국의 정보와 업무를', '하나로 연결합니다']);
    expect(PHARMACY_HERO.description).toEqual([
      '제품 정보와 콘텐츠를 활용하고,',
      '매장 운영과 고객 서비스를 더 편리하게 시작하세요.',
    ]);
  });

  it('홈 메타 = O4O 약국 + Hero 문구, KPA-Society 문구 없음', () => {
    expect(PHARMACY_HOME_TITLE).toBe('O4O 약국 — 약국의 정보와 업무를 하나로 연결합니다');
    expect(PHARMACY_HOME_DESCRIPTION).toBe(PHARMACY_HERO.description.join(' '));
    expect(kpaSeoRegistry['/']).toMatchObject({ title: PHARMACY_HOME_TITLE, description: PHARMACY_HOME_DESCRIPTION });
    expect(KPA_SEO_DEFAULTS.title).toBe(PHARMACY_HOME_TITLE);
    expect(`${KPA_SEO_DEFAULTS.title} ${kpaSeoRegistry['/'].title}`).not.toMatch(/KPA-Society|KPA Society/);
  });
});

describe('og:url · canonical', () => {
  const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  const ogUrl = () => document.head.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null;

  it('공개 경로 — pharmacy host 기준 og:url · canonical', () => {
    expect(applyPharmacyUrlMeta('/forum')).toBe('https://pharmacy.neture.co.kr/forum');
    expect(ogUrl()).toBe('https://pharmacy.neture.co.kr/forum');
    expect(canonical()).toBe('https://pharmacy.neture.co.kr/forum');
  });

  it('미등록(업무) 경로 — canonical 제거', () => {
    applyPharmacyUrlMeta('/forum');
    applyPharmacyUrlMeta('/store/some-internal-page');
    expect(ogUrl()).toBe('https://pharmacy.neture.co.kr/store/some-internal-page');
    expect(canonical()).toBeNull();
  });
});

describe('공개 footer · /about 메타 — legacy "약사회" 브랜드 없음 (WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-FINAL-POLISH-V1)', () => {
  it('footer 는 업무 메뉴와 약관만 제공하고 서비스 소개를 노출하지 않는다', () => {
    const text = KPA_FOOTER_SECTIONS.flatMap((s) => [s.title, ...s.links.map((l) => l.label)]).join(' ');
    expect(text).not.toMatch(/약사회/);
    const about = KPA_FOOTER_SECTIONS.flatMap((s) => s.links).find((l) => l.href === '/about');
    expect(about).toBeUndefined();
    expect(KPA_FOOTER_SECTIONS.flatMap(s => s.links).some(l => l.href === '/businesses/pharmacy/forum')).toBe(true);
  });

  it('/about 메타 description 에 대한약사회 없음', () => {
    expect(kpaSeoRegistry['/about'].description).not.toMatch(/약사회/);
  });
});

describe('brand asset 자리', () => {
  it('사용자 제작 asset 투입 전 — 자리만 있고 참조 플래그는 false', () => {
    expect(PHARMACY_BRAND_ASSETS_READY).toBe(false);
    expect(Object.values(PHARMACY_BRAND_ASSET_SLOTS).every((p) => p.startsWith('/brand/'))).toBe(true);
  });
});
