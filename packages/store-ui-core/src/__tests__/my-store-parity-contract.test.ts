/**
 * My Store cross-service parity 정적 계약 테스트
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7·§8·§12
 *
 * 목적 2가지
 *   1. 공통 View 를 serviceKey 분기 없이 generic 하게 확장했는지 고정한다.
 *   2. 새 optional prop 의 **기본값이 기존 3서비스(KPA·GP·KCos) 동작을 그대로 재현**하는지 고정한다.
 *      (기존 서비스 회귀 0 — §5)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  COSMETICS_STORE_CONFIG,
  GLYCOPHARM_STORE_CONFIG,
  KPA_SOCIETY_STORE_CONFIG,
  PHARMACY_HUB_STORE_CONFIG,
  type StoreDashboardConfig,
} from '../config/storeMenuConfig';

const SRC = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf-8');
/** 주석(설계 근거 서술)에는 서비스 이름이 나올 수 있다 — 분기 검사는 **코드**만 본다. */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PLAYER_VIEW = 'components/signage/SignagePlayerSelectView.tsx';
const DESCRIPTIONS_VIEW = 'components/product-descriptions/StoreProductDescriptionsView.tsx';
const ANALYTICS_VIEW = 'components/analytics/StoreMarketingAnalyticsView.tsx';

const allItems = (c: StoreDashboardConfig) => (c.menuSections ?? []).flatMap((s) => s.items);
const keys = (c: StoreDashboardConfig) => allItems(c).map((i) => i.key);
const pathOf = (c: StoreDashboardConfig, key: string) => {
  const item = allItems(c).find((i) => i.key === key);
  return item ? `${c.basePath}${item.subPath}` : null;
};

describe('공통 My Store View — serviceKey 분기 금지', () => {
  for (const file of [PLAYER_VIEW, DESCRIPTIONS_VIEW, ANALYTICS_VIEW]) {
    it(`${file} 는 서비스 식별자로 분기하지 않는다`, () => {
      const src = readCode(file);
      for (const token of ['pharmacy-hub', 'kpa-society', 'k-cosmetics', 'glycopharm', 'serviceKey']) {
        expect(src).not.toContain(token);
      }
    });
  }
});

describe('SignagePlayerSelectView — playPathPrefix 기본값 = 기존 동작', () => {
  const src = read(PLAYER_VIEW);

  it('기존 하드코딩 경로가 기본값으로 보존된다', () => {
    expect(src).toContain("const DEFAULT_PLAY_PATH_PREFIX = '/store/marketing/signage/play'");
    expect(src).toContain('playPathPrefix = DEFAULT_PLAY_PATH_PREFIX');
  });

  it('재생 경로 문자열이 더 이상 하드코딩되지 않는다', () => {
    expect(src).toContain('window.open(`${playPathPrefix}/${playlistId}`');
    expect(src).not.toContain('window.open(`/store/marketing/signage/play/');
  });
});

describe('StoreProductDescriptionsView — links 기본값 = 기존 동작', () => {
  const src = read(DESCRIPTIONS_VIEW);

  it('기존 두 링크 경로가 기본값으로 보존된다', () => {
    expect(src).toContain("links?.localProducts ?? '/store/commerce/local-products'");
    expect(src).toContain("links?.library ?? '/store/library/contents'");
  });

  it('Link 는 주입값을 쓴다', () => {
    expect(src).toContain('<Link to={localProductsHref}');
    expect(src).toContain('<Link to={libraryHref}');
  });
});

describe('기존 3서비스 메뉴 회귀 0', () => {
  const cases: Array<[string, StoreDashboardConfig]> = [
    ['KPA', KPA_SOCIETY_STORE_CONFIG],
    ['GlycoPharm', GLYCOPHARM_STORE_CONFIG],
    ['K-Cosmetics', COSMETICS_STORE_CONFIG],
  ];

  for (const [name, config] of cases) {
    it(`${name} 는 4단계 사이니지 메뉴를 그대로 유지한다`, () => {
      expect(keys(config)).toEqual(
        expect.arrayContaining([
          'signage-playlist',
          'signage-videos',
          'signage-schedules',
          'signage-player',
        ]),
      );
      expect(pathOf(config, 'signage-player')).toBe('/store/marketing/signage/player');
    });

    it(`${name} 는 상품 설명 · 신청현황 · 마케팅 분석 메뉴를 그대로 유지한다`, () => {
      expect(keys(config)).toEqual(
        expect.arrayContaining([
          'product-descriptions',
          'recruitment-applications',
          'analytics-marketing',
        ]),
      );
      expect(pathOf(config, 'analytics-marketing')).toBe('/store/analytics/marketing');
    });
  }

  it('판매자 모집 탐색은 KPA 에만 있다 (backend proxy 가 kpa-society 고정)', () => {
    expect(keys(KPA_SOCIETY_STORE_CONFIG)).toContain('seller-recruitments');
    for (const c of [GLYCOPHARM_STORE_CONFIG, COSMETICS_STORE_CONFIG, PHARMACY_HUB_STORE_CONFIG]) {
      expect(keys(c)).not.toContain('seller-recruitments');
    }
  });
});

describe('PharmacyHub 채택 결과 (§7·§8)', () => {
  it('채택 4축이 /store-owner basePath 로 등록된다', () => {
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'product-descriptions')).toBe(
      '/store-owner/product-descriptions',
    );
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'recruitment-applications')).toBe(
      '/store-owner/recruitment-applications',
    );
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'analytics-marketing')).toBe(
      '/store-owner/analytics/marketing',
    );
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'signage-player')).toBe('/store-owner/signage/player');
  });

  it('사이니지 4축(재생 목록·동영상·편성·TV 재생)이 모두 등록된다 (#69·#70)', () => {
    // 앞선 "미채택" 판정은 §8 에서 해소됐다 — 매장이 자기 동영상(`signage_media`)을 등록하고
    // 발행한 재생 목록을 `signage_schedules` 로 편성하는 경로가 열렸다.
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'signage')).toBe('/store-owner/signage');
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'signage-media')).toBe('/store-owner/signage/media');
    expect(pathOf(PHARMACY_HUB_STORE_CONFIG, 'signage-schedules')).toBe('/store-owner/signage/schedules');
  });

  it('KPA 전용 HQ 미디어 축(signage-videos)은 그대로 만들지 않는다', () => {
    // '동영상' 은 매장 소유 미디어이지 HQ 방송 카탈로그가 아니다 — 두 축을 섞지 않는다.
    expect(keys(PHARMACY_HUB_STORE_CONFIG)).not.toContain('signage-videos');
  });

  it('메뉴 key 는 서비스 안에서 유일하다', () => {
    const k = keys(PHARMACY_HUB_STORE_CONFIG);
    expect(new Set(k).size).toBe(k.length);
  });
});
