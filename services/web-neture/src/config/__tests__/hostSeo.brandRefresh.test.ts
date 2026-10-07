/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — host-aware 메타 계약
 *
 * 한 번들이 neture · supplier · funding · community 네 host 를 서빙한다.
 *   - 하위 host `/` = 서비스 Hero 문구 (O4O 대표 title 이 아니다)
 *   - og:url = 현재 host origin + path · canonical 은 registry 공개 경로에만
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  O4O_BRAND_TITLE,
  SUBHOST_HOME_SEO,
  applyNetureUrlMeta,
  netureSeoRegistry,
  netureSeoRegistryForHost,
  originForHost,
} from '../seoRegistry';
import { COMMUNITY_HERO, FUNDING_HERO, SUPPLIER_HERO } from '../publicHero';

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
const ogUrl = () => document.head.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null;

afterEach(() => {
  document.head.innerHTML = '';
});

describe('host 별 `/` 메타', () => {
  it('대표 host 는 O4O 대표 문구 그대로', () => {
    expect(netureSeoRegistryForHost('main')).toBe(netureSeoRegistry);
    expect(netureSeoRegistryForHost('main')['/'].title).toBe(O4O_BRAND_TITLE);
  });

  it.each([
    ['supplier', '공급자 — 제품과 콘텐츠를 매장과 연결합니다 | O4O'],
    ['funding', '유통참여형 펀딩 — 제품의 가능성을 유통 참여로 연결합니다 | O4O'],
    ['community', 'O4O 커뮤니티 — 현장의 경험과 정보를 함께 나눕니다'],
  ] as const)('%s host `/` title = 서비스 Hero 문구', (host, title) => {
    const reg = netureSeoRegistryForHost(host);
    expect(reg['/']).toBe(SUBHOST_HOME_SEO[host]);
    expect(reg['/'].title).toBe(title);
    expect(reg['/'].title).not.toBe(O4O_BRAND_TITLE);
    // 다른 공개 경로는 공용 registry 와 같다
    expect(reg['/market-trial']).toBe(netureSeoRegistry['/market-trial']);
    // 같은 host 에서는 같은 객체 (usePageSeo deps 안정성)
    expect(netureSeoRegistryForHost(host)).toBe(reg);
  });

  it('하위 host 메타 description 은 Hero 설명 문구와 같다', () => {
    expect(SUBHOST_HOME_SEO.supplier.description).toBe(SUPPLIER_HERO.description.join(' '));
    expect(SUBHOST_HOME_SEO.funding.description).toBe(FUNDING_HERO.description.join(' '));
    expect(SUBHOST_HOME_SEO.community.description).toBe(COMMUNITY_HERO.description.join(' '));
  });
});

describe('og:url · canonical', () => {
  it('origin 은 host 별', () => {
    expect(originForHost('main')).toBe('https://neture.co.kr');
    expect(originForHost('supplier')).toBe('https://supplier.neture.co.kr');
    expect(originForHost('funding')).toBe('https://funding.neture.co.kr');
    expect(originForHost('community')).toBe('https://community.neture.co.kr');
  });

  it('공개 경로는 og:url · canonical 모두 현재 host 기준', () => {
    expect(applyNetureUrlMeta('funding', '/')).toBe('https://funding.neture.co.kr/');
    expect(ogUrl()).toBe('https://funding.neture.co.kr/');
    // shared-space-ui setCanonical 은 끝 슬래시를 정규화한다 (origin 루트 = 같은 URL)
    expect(canonical()).toBe('https://funding.neture.co.kr');
  });

  it('미등록(업무 공간) 경로는 canonical 을 지우고 og:url 만 둔다', () => {
    applyNetureUrlMeta('supplier', '/');
    expect(canonical()).toBe('https://supplier.neture.co.kr');
    applyNetureUrlMeta('supplier', '/supplier/dashboard');
    expect(ogUrl()).toBe('https://supplier.neture.co.kr/supplier/dashboard');
    expect(canonical()).toBeNull();
  });
});
