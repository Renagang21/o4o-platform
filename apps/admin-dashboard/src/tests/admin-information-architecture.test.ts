/**
 * WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 회귀 가드
 *
 * `admin.neture.co.kr` = **O4O 플랫폼 전체 관리자 사이트** 라는 확정(2026-09-09)을 고정한다.
 *
 * 조사 정본: docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md
 * 검증 기록: docs/checks/WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1-CHECK.md
 *
 * 이 spec 이 막으려는 회귀 3가지:
 *   1. 서비스 전용 업무(KPA·서비스 포럼·단일 서비스 매장 집계)가 플랫폼 관리자 메뉴로 되돌아옴
 *   2. 백엔드가 없는 화면(CMS V2 4항목 등)이 메뉴·라우트로 되살아남
 *   3. 진단·test 라우트가 프로덕션에 재등록됨 (CLAUDE.md §8 규칙 3)
 *
 * JSX·아이콘 의존을 피하려고 메뉴·라우트를 **소스 텍스트로** 파싱한다
 * (기존 `admin-menu-batch2.test.ts` 와 동일한 방식).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { menuPermissions, PLATFORM_ADMIN_ROLES } from '../config/rolePermissions';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
/** 설명 주석의 경로 언급이 오탐되지 않도록 한 줄 주석을 제거한다. */
const stripLineComments = (s: string) => s.replace(/^\s*\/\/.*$/gm, '');
/** 블록 주석까지 제거한다(라우트 파일의 제거 근거 주석이 길다). */
const stripAllComments = (s: string) =>
  stripLineComments(s).replace(/\/\*[\s\S]*?\*\//g, '');

const MENU_CODE = stripLineComments(read('admin/menu/admin-menu.static.tsx'));

const menuPaths = [...MENU_CODE.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const menuIds = [...MENU_CODE.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

const ROUTE_FILES = [
  'appearance', 'apps', 'content', 'dashboard',
  'lms-marketing', 'platform', 'public', 'test', 'users',
];
const ALL_ROUTES = ROUTE_FILES.map((f) => stripAllComments(read(`routes/${f}.routes.tsx`))).join('\n');

// ---------------------------------------------------------------------------

describe('메뉴 트리 — 플랫폼 관리자 사이트 canonical 구조', () => {
  /** 사이드바에 보여야 하는 경로 전체. 프로덕션 브라우저 smoke 로 22건 실측 확인(CHECK §5-1). */
  const EXPECTED_PATHS = [
    '/admin',
    '/admin/platform/hub',
    // Core
    '/users',
    '/operators',
    '/admin/kpa-branch/service-members', // WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1
    '/operator/points',
    '/settings',
    // O4O 상품 DB — ProductDbLayout 의 탭과 1:1
    '/admin/o4o-product-db/overview',
    '/admin/o4o-product-db/candidates',
    '/admin/o4o-product-db/store-requests',
    '/admin/o4o-product-db/masters',
    '/admin/o4o-product-db/supplier-store-descriptions',
    '/admin/o4o-product-db/image-quality',
    '/admin/o4o-product-db/maintenance',
    // Content
    '/content',
    '/content/assets',
    '/content/policies',
    '/content/analytics',
    // CMS
    '/admin/cms/contents',
    '/admin/cms/slots',
    '/admin/ops/metrics',
    // AppStore
    '/apps/store',
    // Signage
    '/admin/digital-signage/content',
    // 자동화 (WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1)
    '/automation/video-jobs',
  ];

  it('메뉴 경로 집합이 canonical 구조와 정확히 일치한다', () => {
    expect([...menuPaths].sort()).toEqual([...EXPECTED_PATHS].sort());
  });

  it('메뉴 경로·id 에 중복이 없다', () => {
    expect(new Set(menuPaths).size).toBe(menuPaths.length);
    expect(new Set(menuIds).size).toBe(menuIds.length);
  });

  it('O4O 상품 DB 사이드바가 화면 내 탭과 1:1 이다', () => {
    // 사이드바 5 vs 탭 7 로 어긋나 `설명서 검수`(프로덕션 쓰기 실사용)·`이미지 상태` 가
    // 진입점 없이 숨어 있던 상태를 되돌리지 않는다.
    const layout = read('pages/o4o-product-db/ProductDbLayout.tsx');
    const tabs = [...layout.matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1]);
    const sidebar = menuPaths
      .filter((p) => p.startsWith('/admin/o4o-product-db/'))
      .map((p) => p.replace('/admin/o4o-product-db/', ''));
    expect(tabs.length).toBeGreaterThan(0);
    expect(sidebar.sort()).toEqual([...tabs].sort());
  });
});

describe('서비스 전용 업무는 플랫폼 관리자 메뉴로 돌아오지 않는다', () => {
  it('Yaksa (KPA) 그룹이 없다', () => {
    // KPA_SCOPE_CONFIG.platformBypass=false + blockedServicePrefixes:['platform',…] 이라
    // 플랫폼 관리자는 이 화면들의 백엔드에서 구조적으로 403 이다.
    expect(menuIds).not.toContain('yaksa');
    expect(menuPaths.filter((p) => p.startsWith('/operator/kpa/'))).toHaveLength(0);
    expect(menuPaths).not.toContain('/operator/hub-contents');
    expect(menuPaths).not.toContain('/operator/approvals');
  });

  it('Forum 관리자 메뉴·라우트가 없다', () => {
    // 서비스 커뮤니티 일상 운영은 각 서비스 operator 콘솔이 정본이다
    // (KPA Society: 포럼 운영/신청/목록/삭제요청/분석 5개 메뉴).
    expect(menuIds).not.toContain('forum');
    expect(menuPaths.filter((p) => p.startsWith('/forum'))).toHaveLength(0);
    expect(ALL_ROUTES).not.toContain('path="/forum"');
    expect(ALL_ROUTES).not.toContain('path="/forum/boards"');
    expect(ALL_ROUTES).not.toContain('path="/forum/categories"');
    expect(existsSync(join(SRC, 'pages', 'forum'))).toBe(false);
  });

  it('단일 서비스(Cosmetics) 매장 집계 화면이 없다', () => {
    for (const p of ['/admin/store-network', '/admin/physical-stores']) {
      expect(menuPaths).not.toContain(p);
      expect(ALL_ROUTES).not.toContain(`path="${p}"`);
    }
    expect(existsSync(join(SRC, 'pages', 'platform', 'StoreNetworkPage.tsx'))).toBe(false);
    expect(existsSync(join(SRC, 'pages', 'platform', 'PhysicalStoresPage.tsx'))).toBe(false);
  });

  it('플랫폼 전역 집계 화면(플랫폼 HUB)은 보존된다', () => {
    // 제거의 반대 방향 가드 — KPA + Neture 를 함께 집계하는 유일한 플랫폼 화면이다.
    expect(menuPaths).toContain('/admin/platform/hub');
    expect(existsSync(join(SRC, 'pages', 'platform', 'PlatformHubPage.tsx'))).toBe(true);
  });
});

describe('백엔드 없는 화면이 되살아나지 않는다', () => {
  it('CMS V2 4항목(cpts/fields/views/pages)이 메뉴·라우트에 없다', () => {
    // `apps/api-server/src/modules/cms/` 는 entity 만 있고 라우트·컨트롤러 0건이며
    // register-routes.ts 에 등록된 적이 없다 → 프로덕션 404 실측(2026-08-10).
    for (const seg of ['cpts', 'fields', 'views', 'pages']) {
      expect(menuPaths).not.toContain(`/admin/cms/${seg}`);
      expect(ALL_ROUTES).not.toContain(`path="/admin/cms/${seg}"`);
      expect(existsSync(join(SRC, 'pages', 'cms', seg))).toBe(false);
    }
    expect(existsSync(join(SRC, 'pages', 'cms', 'designer'))).toBe(false);
  });

  it('CMS 실동작 축(contents/slots)은 보존된다', () => {
    expect(menuPaths).toContain('/admin/cms/contents');
    expect(menuPaths).toContain('/admin/cms/slots');
    expect(existsSync(join(SRC, 'pages', 'cms', 'contents'))).toBe(true);
    expect(existsSync(join(SRC, 'pages', 'cms', 'slots'))).toBe(true);
  });

  it('lib/cms.ts 가 백엔드 없는 endpoint 를 더 이상 호출하지 않는다', () => {
    const lib = stripAllComments(read('lib/cms.ts'));
    for (const ep of ['/cms/cpts', '/cms/fields', '/cms/views', '/cms/pages', '/cms/public']) {
      expect(lib).not.toContain(ep);
    }
    // 실동작 축은 남아 있어야 한다.
    expect(lib).toContain('/cms/contents');
    expect(lib).toContain('/cms/slots');
  });

  // WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
  //   ViewComponentRegistry(components/routing) 는 DEAD_ABSTRACTION 으로 디렉터리째 제거됐다.
  it('components/routing (ViewComponentRegistry) 이 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'components', 'routing'))).toBe(false);
  });

  it('dead 화면 디렉터리·라우트가 제거된 상태다', () => {
    const DEAD = [
      // [경로 조각, 디렉터리]
      ['path="/analytics/*"', 'pages/analytics'],
      ['path="/acf/*"', 'pages/custom-fields'],
      ['path="/admin/cpt-acf/*"', 'pages/cpt-acf'],
      ['path="/monitoring"', 'pages/monitoring'],
      ['path="/admin/service-content-manager"', 'pages/service-content-manager'],
      ['path="/content/collections"', 'pages/content/collections'],
    ] as const;
    for (const [routeFrag, dir] of DEAD) {
      expect(ALL_ROUTES, `${routeFrag} 가 되살아났다`).not.toContain(routeFrag);
      expect(existsSync(join(SRC, ...dir.split('/'))), `${dir} 가 되살아났다`).toBe(false);
    }
  });

  it('/cpt-engine/* 는 보존된다 (백엔드 41 endpoint 실재 · 별도 판정 대상)', () => {
    expect(ALL_ROUTES).toContain('path="/cpt-engine/*"');
    expect(existsSync(join(SRC, 'pages', 'cpt-engine'))).toBe(true);
  });
});

describe('진단·test 라우트는 프로덕션에 등록되지 않는다 (CLAUDE.md §8 규칙 3)', () => {
  it('public 진단 라우트 4건이 프로덕션 게이트 안에 있다', () => {
    const pub = read('routes/public.routes.tsx');
    // 게이트가 존재하고, 4개 경로가 모두 그 뒤(비프로덕션 분기)에 있다.
    const gate = pub.indexOf('import.meta.env.PROD');
    expect(gate, 'public.routes.tsx 에 프로덕션 게이트가 없다').toBeGreaterThan(-1);
    for (const p of ['/__debug__/auth-bootstrap', '/debug/auth', '/auth-inspector', '/__debug__/login']) {
      const at = pub.indexOf(`path="${p}"`);
      expect(at, `${p} route 선언을 찾지 못했다`).toBeGreaterThan(-1);
      expect(at, `${p} 가 프로덕션 게이트 밖에 있다`).toBeGreaterThan(gate);
    }
  });

  it('test 라우트는 프로덕션에서 빈 배열을 반환한다', () => {
    const t = read('routes/test.routes.tsx');
    expect(t).toMatch(/if \(import\.meta\.env\.PROD\)\s*\{\s*return \[\];/);
  });
});

describe('권한 경계 — 백엔드가 platform 전용인 메뉴는 같은 경계를 선언한다', () => {
  // 무게이트로 두면 "설정 없음 = 허용" + App.tsx floor 의 서비스 접두 역할 수용 때문에
  // 서비스 운영자에게도 보이지만, 백엔드(requireAdmin / requirePlatformAdmin)는 403 이다.
  const PLATFORM_ONLY_MENUS = [
    'core-users',
    'core-operators',
    // WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1
    'core-kpa-branch-service-members',
    'core-points',
    'platform-hub',
    'ops-metrics',
    'appstore-browse',
  ];

  it.each(PLATFORM_ONLY_MENUS)('%s 메뉴가 platform 경계로 게이트된다', (menuId) => {
    const cfg = menuPermissions.find((m) => m.menuId === menuId);
    expect(cfg, `${menuId} 게이트가 없다 — 무게이트면 서비스 운영자에게도 보인다`).toBeDefined();
    expect(cfg?.roles).toEqual([...PLATFORM_ADMIN_ROLES]);
  });

  it.each(PLATFORM_ONLY_MENUS)('%s 는 실제 메뉴 트리에 존재한다 (고아 설정 방지)', (menuId) => {
    expect(menuIds).toContain(menuId);
  });

  it('platform 전용 route 가 legacy 역할을 통과시키지 않는다', () => {
    // adminRouteAccess.expandRequiredRoles 는 `admin`·`super_admin` 이 있을 때만 확장하고,
    // `matchesRequiredRole` 은 그때 서비스 접두 역할까지 받아준다. 백엔드가 platform 전용인
    // 화면에서는 그 확장이 일어나지 않아야 한다.
    for (const p of ['/admin/platform/hub', '/admin/ops/metrics', '/operator/points', '/apps/store']) {
      const at = ALL_ROUTES.indexOf(`path="${p}"`);
      expect(at, `${p} route 선언을 찾지 못했다`).toBeGreaterThan(-1);
      const block = ALL_ROUTES.slice(at, at + 300);
      expect(block, `${p} 가 legacy 역할을 통과시킨다`).not.toMatch(/requiredRoles=\{\['admin'/);
      expect(block).toContain('platform:super_admin');
    }
  });
});
