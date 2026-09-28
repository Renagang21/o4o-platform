/**
 * 서브도메인 운영자 화면이 Neture 전용 가드 밖에 있는지 — 구조 검사
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4
 *
 * `SubdomainOperatorRoute` 자체의 판정은 SubdomainOperatorRoute.test.ts 가 본다.
 * 여기서 보는 것은 **그 가드가 실제로 그 경로에 붙어 있는지**다. 가드를 만들어 두고
 * 라우트를 옮기지 않으면 판정 테스트는 전부 통과하는데 화면은 그대로 막힌다.
 *
 * 정규식을 쓰지 않는다 — 대괄호 이스케이프가 한 겹 벗겨지면 문자 클래스로 읽혀
 * 조용히 통과한다. parent 는 「경로 선언 앞쪽에서 가장 가까운 `<Route element={`」로
 * 찾는다(App.tsx 의 layout parent 는 모두 이 형태이고, 자식 그룹은 `<Route path=` 다).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const APP = readFileSync(join(__dirname, '..', '..', '..', 'App.tsx'), 'utf-8');

const PARENT_MARK = '<Route element={';
const CHILD_MARK = '<Route path=';

/** `path="…"` 선언 위치. 없으면 -1. */
function pathAt(routePath: string): number {
  return APP.indexOf(`path="${routePath}"`);
}

/**
 * 그 경로를 감싸는 parent 의 **헤더**(가드 태그 + layout wrapper) 문자열.
 * parent 여는 지점부터 첫 자식 `<Route path=` 직전까지 — 가드 속성이 모두 이 안에 있다.
 */
function parentHeaderOf(routePath: string): string {
  const at = pathAt(routePath);
  expect(at, routePath).toBeGreaterThan(0);
  const parentAt = APP.lastIndexOf(PARENT_MARK, at);
  expect(parentAt, routePath).toBeGreaterThan(0);
  const firstChild = APP.indexOf(CHILD_MARK, parentAt);
  expect(firstChild, routePath).toBeGreaterThan(parentAt);
  return APP.slice(parentAt, firstChild);
}

function occurrences(needle: string): number {
  return APP.split(needle).length - 1;
}

const SUPPLIER_SCREENS = [
  '/admin/supplier-governance',
  '/admin/admin-suppliers',
  '/admin/supplier-quality',
  '/operator/suppliers',
  '/operator/supplier-quality',
];

const FUNDING_SCREENS = [
  '/operator/market-trial',
  '/operator/market-trial/:id',
  '/admin/market-trial',
];

describe('서브도메인 운영자 화면은 SubdomainOperatorRoute 아래에 있다', () => {
  it('검사 전제: App.tsx 를 읽었고 parent 4개가 새로 생겼다', () => {
    expect(APP.length).toBeGreaterThan(1000);
    expect(occurrences('<SubdomainOperatorRoute')).toBe(4);
    // 종전 Neture parent 는 그대로 남아 있다 (다른 화면들의 경계는 변하지 않았다).
    expect(occurrences('<AdminRoute>')).toBeGreaterThan(0);
    expect(occurrences('<OperatorRoute>')).toBeGreaterThan(0);
  });

  for (const p of [...SUPPLIER_SCREENS, ...FUNDING_SCREENS]) {
    it(`${p} 의 parent 가드는 SubdomainOperatorRoute 다`, () => {
      const header = parentHeaderOf(p);
      expect(header, p).toContain('<SubdomainOperatorRoute');
      // Neture 전용 가드가 **직접** 감싸고 있지 않다.
      expect(header.includes('<AdminRoute>'), p).toBe(false);
      expect(header.includes('<OperatorRoute>'), p).toBe(false);
    });
  }

  it('supplier 화면의 parent 는 serviceKey="supplier" 다', () => {
    for (const p of SUPPLIER_SCREENS) {
      expect(parentHeaderOf(p), p).toContain('serviceKey="supplier"');
    }
  });

  it('funding 화면의 parent 는 serviceKey="funding" 다', () => {
    for (const p of FUNDING_SCREENS) {
      expect(parentHeaderOf(p), p).toContain('serviceKey="funding"');
    }
  });

  it('경로를 복제하지 않았다 — 각 경로는 App.tsx 에 1번만 선언된다', () => {
    for (const p of [...SUPPLIER_SCREENS, ...FUNDING_SCREENS]) {
      expect(occurrences(`path="${p}"`), p).toBe(1);
    }
  });

  it('fallbackGuard 로 종전 Neture 가드를 그대로 위임한다 (현재 접근 축소 없음)', () => {
    for (const p of SUPPLIER_SCREENS.concat(FUNDING_SCREENS)) {
      const header = parentHeaderOf(p);
      const delegates =
        header.includes('fallbackGuard={AdminRoute}') ||
        header.includes('fallbackGuard={OperatorRoute}');
      expect(delegates, p).toBe(true);
    }
    expect(occurrences('fallbackGuard={AdminRoute}')).toBe(2);
    expect(occurrences('fallbackGuard={OperatorRoute}')).toBe(2);
  });

  it('레이아웃 껍데기는 종전과 같다 — admin 화면은 AdminLayoutWrapper, operator 화면은 OperatorLayoutWrapper', () => {
    for (const p of [...SUPPLIER_SCREENS, ...FUNDING_SCREENS]) {
      const header = parentHeaderOf(p);
      const expected = p.startsWith('/admin/') ? '<AdminLayoutWrapper' : '<OperatorLayoutWrapper';
      expect(header, p).toContain(expected);
    }
  });
});
