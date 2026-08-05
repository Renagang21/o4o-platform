/**
 * WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1
 *
 * 관리자 화면의 접근 조건은 **세 계층**에 각각 선언된다.
 *
 *   메뉴          — 어떤 사용자에게 항목이 보이는가        (`config/rolePermissions.ts`)
 *   프런트 route  — 직접 URL 접근 시 누가 통과하는가       (`routes/*.routes.tsx`)
 *   백엔드        — 실제 요청을 누가 실행할 수 있는가      (api-server guard 상수)
 *
 * 셋이 갈라지면 두 방향으로 고장난다.
 *   - 메뉴만 엄격 → 권한이 있는데 기능을 **찾지 못한다**
 *   - 메뉴만 느슨 → 클릭하면 **403**
 *
 * 메뉴는 보안 경계가 아니라 실제 접근권을 반영하는 **탐색 장치**이므로, 이 테스트는
 * "세 계층이 같은 경계를 말하는가" 를 고정한다. 백엔드 상수는 **api-server 소스에서 직접 읽어**
 * 대조하므로, 백엔드가 경계를 바꾸면 이 테스트가 먼저 깨진다(프런트가 조용히 뒤처지지 않는다).
 *
 * 소스 계약만 검사한다 — 렌더링·API 호출·운영 데이터 write 0.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hasMenuPermission, menuPermissions, PLATFORM_ADMIN_ROLES } from '../config/rolePermissions';
import { hasRequiredRoles, expandRequiredRoles } from '../../../../packages/auth-context/src/adminRouteAccess';

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8');
const stripComments = (s: string) => s.replace(/^\s*\/\/.*$/gm, '');

const API = '../../../../apps/api-server/src';
const USERS_GUARD = read(`${API}/routes/admin/users.routes.ts`);

// WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
//   membership-admin-guard.ts · routes/yaksa.routes.tsx 는 약사회 전용 기능 제거와 함께
//   삭제되어 대조 대상이 없다. 남은 platform 경계 화면은 core-users 뿐이다.
const USERS_ROUTES = stripComments(read('../routes/users.routes.tsx'));

/** 백엔드 소스에서 역할 배열 상수를 읽는다. 표기를 못 읽으면 **실패**한다(통과로 넘기지 않는다). */
const readBackendRoles = (source: string, constName: string): string[] => {
  const m = new RegExp(`${constName}\\s*(?::[^=]*)?=\\s*\\[([^\\]]*)\\]`).exec(source);
  if (!m) throw new Error(`백엔드 상수 ${constName} 을 읽지 못했다 — 표기가 바뀌었는지 확인할 것`);
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/['"]/g, ''))
    .filter(Boolean);
};

/** 플랫폼 전역 경계를 쓰는 화면: 메뉴 id ↔ route 경로 ↔ route 소스. */
const PLATFORM_SCOPED_SCREENS = [
  { menuId: 'core-users', path: '/users', source: USERS_ROUTES },
];

describe('계층 3 — 백엔드 경계가 프런트 상수와 일치한다', () => {
  it('/api/v1/admin/users 의 ADMIN_ROLES 와 PLATFORM_ADMIN_ROLES 가 같다', () => {
    expect(readBackendRoles(USERS_GUARD, 'ADMIN_ROLES')).toEqual([...PLATFORM_ADMIN_ROLES]);
  });
});

describe('계층 1·2 — 메뉴와 route 가 같은 경계를 선언한다', () => {
  it.each(PLATFORM_SCOPED_SCREENS)('$menuId 메뉴 게이트가 백엔드 경계와 같다', ({ menuId }) => {
    const config = menuPermissions.find((m) => m.menuId === menuId);
    expect(config, `${menuId} 메뉴 게이트가 없다 — 무게이트면 모든 관리자에게 보인다`).toBeDefined();
    expect(config?.roles).toEqual([...PLATFORM_ADMIN_ROLES]);
  });

  it.each(PLATFORM_SCOPED_SCREENS)('$path route 가 실제 역할 경계를 선언한다', ({ path, source }) => {
    const idx = source.indexOf(`path="${path}"`);
    expect(idx, `${path} route 선언을 찾지 못했다`).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 400);
    // permission 만으로는 경계가 되지 않는다(백엔드가 user.permissions 를 공급하지 않음).
    expect(block).toContain('requiredRoles={[...PLATFORM_ADMIN_ROLES]}');
  });
});

describe('실제 판정 — 세 계층이 같은 사용자를 통과시킨다', () => {
  const boundary = [...PLATFORM_ADMIN_ROLES];

  it.each([['platform:super_admin']])('%s 는 메뉴도 보이고 route 도 통과한다', (role) => {
    expect(hasMenuPermission([role], [], 'core-users')).toBe(true);
    expect(hasRequiredRoles({ roles: [role] }, boundary)).toBe(true);
  });

  // 백엔드가 403 으로 거부하는 역할은 메뉴에도 보이지 않고 route 도 통과하지 못해야 한다.
  it.each([['admin'], ['super_admin'], ['operator'], ['kpa:admin'], ['neture:operator'], ['user']])(
    '%s 는 메뉴도 안 보이고 route 도 통과하지 못한다',
    (role) => {
      expect(hasMenuPermission([role], [], 'core-users')).toBe(false);
      expect(hasRequiredRoles({ roles: [role] }, boundary)).toBe(false);
    },
  );

  it('platform 한정 선언이 legacy 역할로 되넓혀지지 않는다', () => {
    const expanded = expandRequiredRoles(boundary);
    expect(expanded).not.toContain('super_admin');
    expect(expanded).not.toContain('operator');
    expect(expanded).not.toContain('admin');
  });

  it('기존 admin 선언은 계층 확장과 서비스 접두 역할 수용을 그대로 유지한다 (잠김 회귀 방지)', () => {
    expect(expandRequiredRoles(['admin'])).toEqual(
      expect.arrayContaining(['super_admin', 'operator', 'platform:super_admin']),
    );
    expect(hasRequiredRoles({ roles: ['kpa:admin'] }, ['admin'])).toBe(true);
    expect(hasRequiredRoles({ roles: ['super_admin'] }, ['admin'])).toBe(true);
  });
});

describe('선언 위생 — 역할 문자열과 permission 문자열을 섞지 않는다', () => {
  const ROUTE_FILES = [
    'appearance', 'apps', 'commerce', 'content', 'dashboard', 'lms-marketing',
    'platform', 'public', 'test', 'users',
  ];
  const ALL_ROUTES = ROUTE_FILES.map((f) => {
    try {
      return stripComments(read(`../routes/${f}.routes.tsx`));
    } catch {
      return '';
    }
  }).join('\n');

  it('알려진 역할 문자열이 requiredPermissions 자리에 들어가지 않는다', () => {
    // permission 은 `domain:action` 형태다. 역할을 여기 넣으면 permission 공급이 시작되는 순간
    // 그 화면은 아무도 못 들어간다(역할 이름과 같은 permission 은 존재하지 않는다).
    const ROLE_WORDS = ['admin', 'super_admin', 'operator', 'seller', 'supplier', 'customer', 'user'];
    const declarations = [...ALL_ROUTES.matchAll(/requiredPermissions=\{\[([^\]]*)\]\}/g)].map((m) =>
      m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean),
    );
    expect(declarations.length).toBeGreaterThan(0);

    const offenders = declarations.flat().filter((p) => ROLE_WORDS.includes(p));
    expect(offenders).toEqual([]);
  });

  it('RBAC 카탈로그가 금지한 역할 표기를 쓰지 않는다', () => {
    // `platform_admin`(underscore) 은 어떤 역할과도 일치하지 않아 영구히 죽은 선언이 된다.
    for (const forbidden of ['platform_admin', 'superadmin', 'super-admin', 'administrator']) {
      expect(ALL_ROUTES).not.toContain(`'${forbidden}'`);
    }
  });
});
