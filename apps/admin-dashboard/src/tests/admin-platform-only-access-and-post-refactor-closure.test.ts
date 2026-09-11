/**
 * WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1 — 회귀 가드
 *
 * 두 축을 고정한다.
 *   A축 ADMIN_PLATFORM_ONLY_ACCESS — `admin.neture.co.kr` 진입 floor = `platform:super_admin` 단독
 *   B축 POST_REFACTOR_RESIDUALS    — `/partnerops/*` 잔재 0 · 활성 소스의 GlycoPharm 서비스 맵 0
 *
 * 검증 기록: docs/checks/WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1-CHECK.md
 *
 * 선행 WO(`...-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1`)의 22 메뉴 계약은
 * `admin-information-architecture.test.ts` 가 이미 고정하므로 여기서 중복 단언하지 않는다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';

import {
  expandRequiredRoles,
  matchesRequiredRole,
  hasRequiredRoles,
  isServicePrefixedAdminRole,
} from '@o4o/auth-context';
import { PLATFORM_ADMIN_ROLES } from '../config/rolePermissions';

const SRC = join(__dirname, '..');
const API = join(__dirname, '../../../../apps/api-server/src');
const PKG = join(__dirname, '../../../../packages');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
// 제거 근거 주석에 남은 식별자가 오탐되지 않도록 주석을 제거한다.
//
// 블록 주석은 **JSX 주석 형태와 JSDoc 형태만** 지운다. 일반 블록 주석 패턴으로 지우면
// 라우트 선언의 `path="/*"` 를 주석 시작으로 오인해 파일 뒷부분을 통째로 삼킨다.
const stripAllComments = (s: string) =>
  s
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\*\*[\s\S]*?\*\//gm, '');

/** 소스 트리를 재귀 순회하며 .ts/.tsx 파일 경로를 모은다. */
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
};

// ===========================================================================
// A축 — 진입 floor
// ===========================================================================

describe('A축 · admin 진입 floor 는 platform:super_admin 단독이다', () => {
  const APP = stripAllComments(read('App.tsx'));

  it('App.tsx 최상위 AdminProtectedRoute 가 platform:super_admin 을 요구한다', () => {
    expect(APP).toContain("requiredRoles={['platform:super_admin']}");
  });

  it('최상위 floor 선언에 legacy 역할 문자열이 남아 있지 않다', () => {
    const floor = APP.slice(APP.indexOf('<Route path="/*"'));
    const decl = floor.slice(0, floor.indexOf('>') + 1);
    for (const legacy of ['admin', 'super_admin', 'platform_admin', 'administrator', 'operator']) {
      expect(decl).not.toContain(`'${legacy}'`);
    }
  });

  it('floor 는 정확히 1개다 (우회 진입점 무증식)', () => {
    expect(APP.match(/<Route path="\/\*"/g) ?? []).toHaveLength(1);
  });

  it('PLATFORM_ADMIN_ROLES 와 floor 가 같은 역할을 말한다', () => {
    expect([...PLATFORM_ADMIN_ROLES]).toEqual(['platform:super_admin']);
  });
});

describe('A축 · §5.2 접근 계약', () => {
  const FLOOR = ['platform:super_admin'];
  const user = (...roles: string[]) => ({ roles });

  it('platform:super_admin → 허용', () => {
    expect(hasRequiredRoles(user('platform:super_admin'), FLOOR)).toBe(true);
  });

  it.each([
    'kpa:admin', 'kpa:operator',
    'k-cosmetics:admin', 'cosmetics:admin', 'cosmetics:operator',
    'pharmacy-hub:admin', 'pharmacy-hub:operator',
    'neture:admin', 'neture:operator',
    'kpa:store_owner', 'kpa-branch:operator',
  ])('서비스 접두 역할만 보유 → 차단: %s', (role) => {
    expect(hasRequiredRoles(user(role), FLOOR)).toBe(false);
  });

  it.each(['admin', 'super_admin', 'administrator', 'operator', 'platform_admin'])(
    'legacy/비표준 역할만 보유 → 차단: %s',
    (role) => {
      expect(hasRequiredRoles(user(role), FLOOR)).toBe(false);
    },
  );

  it('서비스 역할을 여러 개 가져도 platform 역할이 없으면 차단된다', () => {
    const serviceOnly = user(
      'kpa:admin', 'kpa:operator', 'kpa:store_owner', 'kpa-branch:operator',
      'cosmetics:admin', 'cosmetics:operator',
      'neture:admin', 'neture:operator',
      'pharmacy-hub:admin', 'pharmacy-hub:operator',
    );
    expect(hasRequiredRoles(serviceOnly, FLOOR)).toBe(false);
  });

  it('서비스 역할 + platform:super_admin 동시 보유는 허용된다 (additive 부여 보존)', () => {
    expect(hasRequiredRoles(user('kpa:admin', 'platform:super_admin'), FLOOR)).toBe(true);
  });

  it('platform:super_admin 은 확장 트리거가 아니다 (요구 집합이 넓어지지 않는다)', () => {
    expect(expandRequiredRoles(FLOOR)).toEqual(FLOOR);
  });

  it('platform:super_admin 요구는 서비스 접두 역할을 받아주지 않는다', () => {
    expect(isServicePrefixedAdminRole('kpa:admin')).toBe(true);
    expect(matchesRequiredRole('kpa:admin', FLOOR)).toBe(false);
  });

  it('legacy admin 요구는 여전히 platform:super_admin 을 받아준다 (하위 라우트 회귀 방지)', () => {
    // floor 안쪽 라우트는 아직 `['admin']` 을 쓴다. 그 의미가 바뀌면
    // 이미 floor 를 통과한 platform 관리자가 하위 화면에서 막힌다.
    expect(matchesRequiredRole('platform:super_admin', ['admin'])).toBe(true);
  });

  it('미인증 사용자는 역할 판정에서 차단된다', () => {
    expect(hasRequiredRoles(null, FLOOR)).toBe(false);
    expect(hasRequiredRoles({}, FLOOR)).toBe(false);
    expect(hasRequiredRoles(user(), FLOOR)).toBe(false);
  });
});

describe('A축 · 거부는 redirect 가 아니라 안내 화면이다 (login loop 금지)', () => {
  const GUARD = readFileSync(join(PKG, 'auth-context/src/AdminProtectedRoute.tsx'), 'utf8');

  it('역할 불충족 분기가 AccessDenied 를 렌더한다', () => {
    const denied = GUARD.slice(GUARD.indexOf('requiredRoles.length > 0'));
    const branch = denied.slice(0, 600);
    expect(branch).toContain('AccessDenied');
    expect(branch).not.toContain('<Navigate');
  });

  it('미인증일 때만 /login 으로 보낸다', () => {
    expect(GUARD).toContain("'/login'");
  });
});

describe('A축 · 메뉴는 "설정 없음 = 허용" 에 기대지 않는다', () => {
  const CFG = read('config/rolePermissions.ts');

  it('platform 전용 백엔드를 소비하는 메뉴는 명시적으로 역할을 선언한다', () => {
    for (const menuId of [
      'core-users', 'core-operators', 'core-points',
      'platform-hub', 'ops-metrics', 'appstore-browse',
    ]) {
      expect(CFG).toContain(`menuId: '${menuId}'`);
    }
  });

  it('선언된 역할은 전부 PLATFORM_ADMIN_ROLES 참조다 (legacy 하드코딩 금지)', () => {
    const roleDecls = [...CFG.matchAll(/roles:\s*(\[[^\]]*\])/g)].map((m) => m[1]);
    expect(roleDecls.length).toBeGreaterThan(0);
    for (const decl of roleDecls) {
      expect(decl).toContain('PLATFORM_ADMIN_ROLES');
    }
  });

  it('백엔드 /api/v1/admin/users guard 와 프런트 경계가 같은 값이다', () => {
    const backend = readFileSync(join(API, 'routes/admin/users.routes.ts'), 'utf8');
    const m = backend.match(/ADMIN_ROLES\s*=\s*\[([^\]]*)\]/);
    expect(m, 'api-server users.routes.ts 의 ADMIN_ROLES 를 찾지 못했다').toBeTruthy();
    const backendRoles = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(backendRoles).toEqual([...PLATFORM_ADMIN_ROLES]);
  });
});

// ===========================================================================
// B축 — PartnerOps 잔재
// ===========================================================================

describe('B축 · /partnerops/* 프런트 잔재 0', () => {
  const ROUTE_FILES = [
    'appearance', 'apps', 'content', 'dashboard',
    'lms-marketing', 'platform', 'public', 'test', 'users',
  ];
  const ALL_ROUTES = ROUTE_FILES
    .map((f) => stripAllComments(read(`routes/${f}.routes.tsx`)))
    .join('\n');

  it('라우트 선언이 0건이다', () => {
    expect(ALL_ROUTES).not.toContain('/partnerops');
    expect(ALL_ROUTES).not.toContain('PartnerOps');
  });

  it('전용 페이지 디렉터리가 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'pages/partnerops'))).toBe(false);
  });

  // WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1: ViewComponentRegistry 는 디렉터리째 제거됐다.
  it('components/routing (ViewComponentRegistry) 이 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'components/routing'))).toBe(false);
  });

  it('활성 소스 어디에도 pages/partnerops import 가 없다', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.includes(`${sep}tests${sep}`))
      .filter((f) => stripAllComments(readFileSync(f, 'utf8')).includes('pages/partnerops'))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('serviceGroup id 는 유지한다 — partner-core 카탈로그 항목이 소비한다', () => {
    // 잔재 제거가 살아 있는 공용 계약까지 지우지 않았음을 고정한다 (WO §6.3).
    expect(read('api/admin-apps.ts')).toContain("'partnerops'");
    const catalog = readFileSync(join(API, 'app-manifests/appsCatalog.ts'), 'utf8');
    expect(catalog).toContain("id: 'partnerops'");
  });
});

// ===========================================================================
// B축 — GlycoPharm 잔재
// ===========================================================================

describe('B축 · 활성 소스의 GlycoPharm 서비스 계약 0', () => {
  const TYPES = readFileSync(join(PKG, 'ai-core/src/orchestration/types.ts'), 'utf8');
  const RULES = readFileSync(join(API, 'copilot/insight-rules.ts'), 'utf8');
  const unionMatch = TYPES.match(/export type AIServiceId\s*=\s*([^;]+);/);

  it('AIServiceId union 에 glycopharm 이 없다', () => {
    expect(unionMatch, 'AIServiceId 선언을 찾지 못했다').toBeTruthy();
    expect(unionMatch![1]).not.toContain('glycopharm');
  });

  it('insight-rules 에 glycopharm 참조가 없다', () => {
    expect(RULES.toLowerCase()).not.toContain('glycopharm');
  });

  it('SERVICE_LINKS 맵이 AIServiceId union 과 정확히 같은 키를 갖는다', () => {
    // 키가 어긋나면 tsc 도 잡지만, 회귀 시 원인을 즉시 지목하려고 함께 고정한다.
    const union = [...unionMatch![1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
    const body = RULES.slice(RULES.indexOf('SERVICE_LINKS'));
    const keys = [...body.slice(0, body.indexOf('\n};')).matchAll(/^ {2}([a-z0-9-]+):\s*\{/gm)]
      .map((x) => x[1]).sort();
    expect(keys).toEqual(union);
  });
});
