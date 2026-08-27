/**
 * WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1
 *   — shortcode 등록을 **실행해서** 확인한다
 *
 * source grep 은 "등록될 것 같다" 까지만 말한다. 이 테스트는 실제 bootstrap
 * 모듈을 import 해서 `globalRegistry` 의 **최종 상태**를 검사한다.
 * audit(`scripts/audit/check-shortcode-registry.ts`) 의 `runtimeRegistered` 는
 * 이 집합과 같아야 하며, api-server 쪽 계약 spec 이 그 일치를 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { getRegisteredShortcodes } from '@o4o/shortcodes';

/** bootstrap 이 등록하는 canonical key 전체. */
const EXPECTED = ['acf_field', 'cpt_field', 'cpt_list', 'meta_field', 'preset'];

async function waitForRegistration(count: number, timeoutMs = 3000): Promise<string[]> {
  // dynamic 축은 `import('./x.js').then(...)` 라 microtask 이후에 등록된다.
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const names = getRegisteredShortcodes();
    if (names.length >= count) return names;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  return getRegisteredShortcodes();
}

describe('shortcode runtime registration', () => {
  it('패키지 import 만으로는 아무것도 등록되지 않는다', () => {
    // 등록은 side-effect 가 아니라 bootstrap 의 명시적 호출로만 일어난다.
    expect(getRegisteredShortcodes()).toEqual([]);
  });

  it('bootstrap 모듈을 import 하면 정확히 EXPECTED 집합이 등록된다', async () => {
    // App.tsx 가 하는 것과 같은 side-effect import.
    await import('@/utils/register-dynamic-shortcodes');

    const registered = await waitForRegistration(EXPECTED.length);
    expect([...registered].sort()).toEqual(EXPECTED);
  });

  it('DEAD_INITIALIZER 의 shortcode 는 등록되지 않는다', () => {
    // `registerAuthShortcodes()` 는 호출자가 0 이다 — 되살아나면 계약 위반이다.
    const registered = getRegisteredShortcodes();
    for (const token of ['social_login', 'login_form', 'oauth_login']) {
      expect(registered).not.toContain(token);
    }
  });

  it('번들되지 않은 product 정의도 등록되지 않는다', () => {
    // `productShortcodes.tsx` 는 loader glob 밖이고 importer 도 0 이다.
    const registered = getRegisteredShortcodes();
    for (const token of ['product', 'product_grid', 'add_to_cart']) {
      expect(registered).not.toContain(token);
    }
  });
});
