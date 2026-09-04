/**
 * 매장 slug ↔ listing service_key canonical alias 해석 계약
 *
 * WO-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1
 *
 * 결함 (프로덕션 E2E 에서 발견):
 *   `resolveServiceKeys` 가 `kpa` alias 만 하드코딩하고 있었다.
 *
 *     if (serviceKey === 'kpa') return ['kpa', 'kpa-society'];
 *     return [serviceKey];
 *
 *   그런데 canonical SSOT 는 **두 쌍**이다:
 *     ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY = { kpa: 'kpa-society', cosmetics: 'k-cosmetics' }
 *
 *   프로덕션 실측:
 *     platform_store_slugs.service_key         = 'cosmetics'
 *     organization_product_listings.service_key = 'k-cosmetics'
 *   → `service_ok = false` → `service_scope_mismatch`
 *   → **K-Cosmetics 매장의 자기 상품이 태블릿·화면세트·공개 storefront 전 경로에서 영구 비노출**.
 *     게다가 매장 운영자에게는 "다른 서비스 상품" 이라는 **틀린 사유**가 표시됐다.
 *
 *   소비 경로(전부 이 함수를 통과한다):
 *     store-public-tablet.handler / store-public-screen-set-resolve(×2)
 *     store-public-tablet-idle-resolve / store-public-product.handler
 *     store-tablet-product-visibility(annotateTabletVisibility)
 *
 * 수정: SSOT 에서 파생한다. 새 로컬 맵을 만들지 않는다(CLAUDE.md 공통 계약 원칙).
 *
 * 이 spec 이 지키는 두 방향:
 *   A. alias 쌍이 빠지면(다시 kpa 만 하드코딩되면) 깨진다.
 *   B. **게이트가 넓어져도** 깨진다 — 다른 축의 파생 키(`kpa-groupbuy`,
 *      `k-cosmetics-event-offer`)를 끌어들이면 안 된다.
 */

import { resolveServiceKeys } from '../routes/platform/store-public/store-public-utils';
import { ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY } from '@o4o/security-core';

describe('A. canonical alias 쌍이 모두 해석된다', () => {
  it("slug 'kpa' 는 listing 'kpa-society' 를 포함한다 (기존 동작 불변)", () => {
    expect(resolveServiceKeys('kpa').sort()).toEqual(['kpa', 'kpa-society']);
  });

  it("slug 'cosmetics' 는 listing 'k-cosmetics' 를 포함한다 (이번 결함)", () => {
    expect(resolveServiceKeys('cosmetics').sort()).toEqual(['cosmetics', 'k-cosmetics']);
  });

  it('SSOT 의 모든 alias 쌍이 해석된다 (새 쌍이 추가돼도 자동 반영)', () => {
    for (const [prefix, canonical] of Object.entries(ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY)) {
      const keys = resolveServiceKeys(prefix);
      expect(keys).toContain(prefix);
      expect(keys).toContain(canonical);
    }
  });

  it('로컬 하드코딩 맵을 다시 만들지 않는다 (SSOT 파생 유지)', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../routes/platform/store-public/store-public-utils.ts'),
      'utf-8',
    );
    // 구현부가 SSOT helper 를 쓰는지 확인한다.
    expect(src).toContain('resolveCanonicalServiceKey');
    // 이전 형태의 단일 하드코딩 분기가 되살아나지 않는다.
    expect(src).not.toMatch(/if\s*\(\s*serviceKey\s*===\s*'kpa'\s*\)/);
  });
});

describe('B. self-map 서비스는 동작이 바뀌지 않는다', () => {
  it.each([['neture'], ['glycopharm'], ['pharmacy-hub'], ['cafe24-b2b']])(
    "'%s' 는 자기 키 하나만 반환한다",
    (key) => {
      expect(resolveServiceKeys(key)).toEqual([key]);
    },
  );
});

describe('C. 게이트를 넓히지 않는다 — 다른 축의 파생 키는 포함하지 않는다', () => {
  // event-offer / groupbuy 는 별도 사업 축이다. 태블릿 노출 게이트가
  // 이 키들을 끌어들이면 의도치 않은 상품이 매장 화면에 노출된다.
  const OTHER_AXIS_KEYS = ['kpa-groupbuy', 'k-cosmetics-event-offer', 'glycopharm-event-offer'];

  it.each([['kpa'], ['cosmetics'], ['glycopharm']])(
    "'%s' 해석 결과에 다른 축 파생 키가 섞이지 않는다",
    (slugKey) => {
      const keys = resolveServiceKeys(slugKey);
      for (const other of OTHER_AXIS_KEYS) {
        expect(keys).not.toContain(other);
      }
    },
  );

  it('반환 집합은 최대 2개다 (slug 표기 + canonical 표기)', () => {
    for (const key of ['kpa', 'cosmetics', 'neture', 'glycopharm', 'pharmacy-hub']) {
      expect(resolveServiceKeys(key).length).toBeLessThanOrEqual(2);
    }
  });

  it('중복을 만들지 않는다', () => {
    for (const key of ['kpa', 'cosmetics', 'neture', 'glycopharm', 'pharmacy-hub']) {
      const keys = resolveServiceKeys(key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
