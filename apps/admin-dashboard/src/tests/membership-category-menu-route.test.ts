/**
 * WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-MENU-ROUTE-AND-EMPTY-STATE-V1
 *
 * 회원 분류 관리 화면(CategoryManagement)은 route 는 이미 존재했지만
 * 메뉴 진입점이 없어 어디에서도 들어갈 수 없었다.
 * 이 테스트는 다음 3가지를 고정한다.
 *   1) Core 그룹 Membership 묶음에 메뉴가 연결되고, 기존 route 를 재사용한다(중복 route 0).
 *   2) 메뉴 노출은 platform 관리자 역할로 한정된다(kpa:admin·일반 사용자 미노출).
 *   3) 분류 0건일 때 빈 상태가 안내 + '분류 만들기' 진입 버튼을 제공하고,
 *      그 버튼이 기존 생성 흐름(handleStartCreate)을 재사용한다.
 *
 * JSX/아이콘·API 의존 없이 소스 계약만 검사한다(운영 데이터 write 0).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hasMenuPermission, menuPermissions } from '../config/rolePermissions';

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8');
const stripComments = (s: string) => s.replace(/^\s*\/\/.*$/gm, '');

const MENU = stripComments(read('../admin/menu/admin-menu.static.tsx'));
const ROUTES = stripComments(read('../routes/yaksa.routes.tsx'));
const PAGE = read('../pages/membership/categories/CategoryManagement.tsx');

const CATEGORY_PATH = '/admin/membership/categories';
const MENU_ID = 'core-membership-categories';

describe('메뉴 연결', () => {
  it('회원 분류 관리 메뉴가 정확히 1건 존재하고 기존 route 를 가리킨다', () => {
    const hits = [...MENU.matchAll(/path:\s*'([^']+)'/g)].filter(
      (m) => m[1] === CATEGORY_PATH,
    );
    expect(hits).toHaveLength(1);
  });

  it('메뉴 id 가 1건이며 Core 그룹의 Membership 묶음 안에 위치한다', () => {
    expect([...MENU.matchAll(new RegExp(`id:\\s*'${MENU_ID}'`, 'g'))]).toHaveLength(1);

    const coreBlock = MENU.slice(
      MENU.indexOf("id: 'core'"),
      MENU.indexOf("id: 'o4o-product-db'"),
    );
    expect(coreBlock).toContain(`path: '${CATEGORY_PATH}'`);
    // Membership 3건 뒤, 포인트 운영 앞 — 회원 관리 항목이 연속되도록 배치한다.
    expect(coreBlock.indexOf("id: 'core-membership-verifications'")).toBeLessThan(
      coreBlock.indexOf(`id: '${MENU_ID}'`),
    );
    expect(coreBlock.indexOf(`id: '${MENU_ID}'`)).toBeLessThan(
      coreBlock.indexOf("id: 'core-points'"),
    );
  });

  it('기존 Membership 메뉴 3건이 그대로 유지된다(회귀 없음)', () => {
    for (const p of [
      '/admin/membership/dashboard',
      '/admin/membership/members',
      '/admin/membership/verifications',
    ]) {
      expect(MENU).toContain(`path: '${p}'`);
    }
  });
});

describe('route 재사용', () => {
  it('기존 route 가 그대로 1건이며 신규 중복 route 를 만들지 않았다', () => {
    const hits = [...ROUTES.matchAll(/path="([^"]+)"/g)].filter(
      (m) => m[1] === CATEGORY_PATH,
    );
    expect(hits).toHaveLength(1);
  });

  it('route guard 를 변경하지 않았다', () => {
    const idx = ROUTES.indexOf(`path="${CATEGORY_PATH}"`);
    const block = ROUTES.slice(idx, idx + 400);
    expect(block).toContain("requiredPermissions={['membership:manage']}");
    expect(block).toContain('<CategoryManagement />');
  });
});

describe('역할별 메뉴 노출 정책', () => {
  it.each([
    ['platform:admin'],
    ['platform:super_admin'],
    ['admin'],
    ['super_admin'],
  ])('%s 는 메뉴를 본다', (role) => {
    expect(hasMenuPermission([role], [], MENU_ID)).toBe(true);
  });

  it.each([['kpa:admin'], ['kpa:operator'], ['user'], ['customer']])(
    '%s 는 메뉴를 보지 못한다',
    (role) => {
      expect(hasMenuPermission([role], [], MENU_ID)).toBe(false);
    },
  );

  it('역할이 없는 사용자도 메뉴를 보지 못한다', () => {
    expect(hasMenuPermission([], [], MENU_ID)).toBe(false);
  });

  it('메뉴 게이트 설정이 1건만 추가되었고 기존 설정은 유지된다', () => {
    expect(menuPermissions.filter((m) => m.menuId === MENU_ID)).toHaveLength(1);
    // 기존 2건(dashboard / core-users)의 정책은 이번 WO 에서 변경하지 않는다.
    expect(menuPermissions.find((m) => m.menuId === 'core-users')?.roles).toEqual([
      'super_admin',
      'platform:super_admin',
    ]);
    expect(menuPermissions.find((m) => m.menuId === 'dashboard')?.roles).toBeUndefined();
    // 회원 관리 전체 메뉴 개편은 범위 제외 — 기존 Membership 메뉴는 게이트를 추가하지 않는다.
    for (const id of [
      'core-membership',
      'core-membership-members',
      'core-membership-verifications',
    ]) {
      expect(menuPermissions.some((m) => m.menuId === id)).toBe(false);
    }
  });
});

describe('0건 빈 상태', () => {
  it('오류가 아니라 안내 문구를 표시한다', () => {
    expect(PAGE).toContain('categories.length === 0 && !isCreating');
    expect(PAGE).toContain('등록된 회원 분류가 없습니다.');
  });

  it("빈 상태에 '분류 만들기' 진입 버튼이 있고 기존 생성 흐름을 재사용한다", () => {
    const idx = PAGE.indexOf('등록된 회원 분류가 없습니다.');
    const block = PAGE.slice(idx, idx + 800);
    expect(block).toContain('분류 만들기');
    expect(block).toContain('onClick={handleStartCreate}');
  });

  it('생성 진입은 로컬 상태만 바꾸고 저장 API 를 호출하지 않는다', () => {
    const start = PAGE.indexOf('const handleStartCreate');
    const body = PAGE.slice(start, PAGE.indexOf('};', start));
    expect(body).toContain('setIsCreating(true)');
    expect(body).not.toMatch(/authClient\.api\.(post|put|patch|delete)/);
  });

  it('API URL·payload 계약을 변경하지 않았다', () => {
    expect(PAGE).toContain("authClient.api.get('/membership/categories')");
    expect(PAGE).toContain("authClient.api.post('/membership/categories'");
  });
});
