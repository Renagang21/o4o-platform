/**
 * WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1
 *
 * admin-dashboard 를 "실제로 존재하는 운영 기능만 남는 canonical admin surface" 로 고정한다.
 *
 *   1. canonical admin home      — `CANONICAL_ADMIN_HOME = /admin`, `/home` · `/dashboard` 는 redirect
 *   2. 메뉴 ↔ route 정합          — 정적 메뉴(SSOT) 의 모든 path 에 route 가 있다 (데드링크 0)
 *   3. 중복 dashboard 0           — AdminHome · unified · phase2.4 · /admin/dashboard/operations 부재
 *   4. fake data 0                — canonical home 에 하드코딩 통계·가짜 뉴스·`href="#"` 없음
 *   5. DynamicRouteLoader 판정    — components/routing · lib/widgets · backend navigation/routes stub 부재
 *   6. stub navigation 의존 0     — useAdminMenu 가 `/v1/navigation/admin` 을 호출하지 않는다
 *   7. API prefix 정합            — 연결 수정한 호출이 backend 계약 경로를 가리킨다
 *   8. REMOVE_BROKEN_UI 부재      — backend 없는 화면 디렉터리·route 가 되살아나지 않는다
 *
 * 소스 계약만 검사한다 — 렌더링·API 호출·운영 데이터 write 0.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { adminMenuStatic } from '../admin/menu/admin-menu.static';
import { CANONICAL_ADMIN_HOME } from '../routes/dashboard.routes';

const SRC = join(__dirname, '..');
const API = join(__dirname, '../../../../apps/api-server/src');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const readApi = (rel: string) => readFileSync(join(API, rel), 'utf8');

/** 제거 근거 주석에 남은 식별자가 오탐되지 않도록 주석을 제거한다. */
const stripAllComments = (s: string) =>
  s
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\*\*[\s\S]*?\*\//gm, '');

const ROUTE_FILES = [
  'appearance', 'apps', 'content', 'dashboard', 'lms-marketing',
  'o4o-product-db', 'platform', 'public', 'test', 'users',
];
const ALL_ROUTES = ROUTE_FILES.map((f) => stripAllComments(read(`routes/${f}.routes.tsx`))).join('\n');

/**
 * route path 목록. 절대 path(`path="/…"`) 에 더해, 부모 `<Route path="/x">` 아래
 * 상대 child(`path="y"`) 는 `/x/y` 로 펼친다 (o4o-product-db.routes 가 이 형태).
 */
const ROUTE_PATHS: string[] = [];
for (const file of ROUTE_FILES) {
  const src = stripAllComments(read(`routes/${file}.routes.tsx`));
  const parents: string[] = [];
  const tag = /<Route\b([^>]*?)(\/?)>|<\/Route>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(src))) {
    if (m[0] === '</Route>') { parents.pop(); continue; }
    const pathMatch = /\bpath=["']([^"']+)["']/.exec(m[1]);
    const p = pathMatch?.[1];
    const parent = parents[parents.length - 1] ?? '';
    const abs = p === undefined ? undefined : p.startsWith('/') ? p : `${parent}/${p}`;
    if (abs) ROUTE_PATHS.push(abs);
    if (m[2] !== '/') parents.push(abs ?? parent);
  }
}

/** route 패턴이 링크를 덮는가 (`:param` · `/*` 지원). */
const routeCovers = (route: string, link: string): boolean => {
  const re = new RegExp(
    '^' +
      route
        .replace(/\/\*$/, '(/.*)?')
        .replace(/:[A-Za-z0-9_]+\??/g, '[^/]+')
        .replace(/\*/g, '.*') +
      '/?$',
  );
  return re.test(link);
};
const hasRoute = (link: string) => ROUTE_PATHS.some((r) => routeCovers(r, link));

type Node = { id?: string; path?: string; separator?: boolean; children?: Node[] };
const flatten = (items: Node[], out: Node[] = []): Node[] => {
  for (const item of items) {
    if (item.separator || item.id === 'collapse') continue;
    out.push(item);
    if (item.children) flatten(item.children, out);
  }
  return out;
};
const MENU_PATHS = flatten(adminMenuStatic as unknown as Node[])
  .map((n) => n.path)
  .filter((p): p is string => typeof p === 'string' && p.length > 0);

// ===========================================================================
// 1. canonical admin home
// ===========================================================================

describe('§4 · canonical admin entry', () => {
  const DASHBOARD = stripAllComments(read('routes/dashboard.routes.tsx'));

  it('CANONICAL_ADMIN_HOME 은 /admin 이고 메뉴 dashboard 항목도 같은 경로다', () => {
    expect(CANONICAL_ADMIN_HOME).toBe('/admin');
    const dashboard = (adminMenuStatic as unknown as Node[]).find((n) => n.id === 'dashboard');
    expect(dashboard?.path).toBe(CANONICAL_ADMIN_HOME);
  });

  it('/home · /dashboard 는 canonical home 으로 Navigate 한다 (별도 화면 없음)', () => {
    for (const legacy of ['/home', '/dashboard']) {
      const m = new RegExp(`<Route[^>]*path="${legacy}"[^>]*element=\\{<Navigate to=\\{CANONICAL_ADMIN_HOME\\} replace />\\}`).exec(DASHBOARD);
      expect(m, `${legacy} 는 Navigate(CANONICAL_ADMIN_HOME) 이어야 한다`).not.toBeNull();
    }
  });

  it('/admin 은 AdminDashboard 를 렌더한다', () => {
    expect(/<Route[^>]*path="\/admin"[^>]*>[\s\S]*?<AdminDashboard \/>/.test(DASHBOARD)).toBe(true);
  });

  it('로그인 후 기본 이동 경로가 canonical home 이다 (/home 잔재 0)', () => {
    const login = stripAllComments(read('pages/auth/Login.tsx'));
    expect(login).toContain("|| '/admin'");
    expect(login).not.toContain("'/home'");
  });
});

// ===========================================================================
// 2. 메뉴 ↔ route
// ===========================================================================

describe('§5 · 정적 메뉴의 모든 path 에 route 가 있다 (데드링크 0)', () => {
  it('메뉴 path 가 비어 있지 않다', () => {
    expect(MENU_PATHS.length).toBeGreaterThan(10);
  });

  it.each(MENU_PATHS)('%s', (path) => {
    expect(hasRoute(path), `${path} 에 대응하는 route 가 없다`).toBe(true);
  });
});

// ===========================================================================
// 3. 중복 dashboard 0
// ===========================================================================

describe('§11 · 중복 dashboard 0', () => {
  it.each([
    'pages/AdminHome.tsx',
    'pages/dashboard',
    'hooks/api/useDashboard.ts',
  ])('%s 가 존재하지 않는다', (rel) => {
    expect(existsSync(join(SRC, rel))).toBe(false);
  });

  it('/admin/dashboard/operations · /home 화면 route 선언이 0건이다', () => {
    expect(ALL_ROUTES).not.toContain('/admin/dashboard/operations');
    expect(ALL_ROUTES).not.toContain('OperationsDashboard');
    expect(ALL_ROUTES).not.toContain('AdminHome');
  });
});

// ===========================================================================
// 4. fake data 0
// ===========================================================================

describe('§10 · canonical home 에 fake data 가 없다', () => {
  const HOME = stripAllComments(read('pages/AdminDashboard.tsx'));

  it('메뉴 SSOT(useAdminMenu) 로 렌더하고 하드코딩 링크가 없다', () => {
    expect(HOME).toContain("from '@/hooks/useAdminMenu'");
    expect(HOME).not.toContain('href="#"');
    expect(HOME).not.toMatch(/to=["']\//);
  });

  it('하드코딩 통계 숫자 · 뉴스 · 활동 피드가 없다', () => {
    // 1,234 · 8,765 같은 자릿수 구분 숫자와 stats/news/activity 식별자
    expect(HOME).not.toMatch(/\b\d{1,3}(,\d{3})+\b/);
    for (const word of ['stats', 'news', 'activity', 'recentPosts', 'Quick Draft']) {
      expect(HOME.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

// ===========================================================================
// 5. DynamicRouteLoader 판정 = DEAD_ABSTRACTION
// ===========================================================================

describe('§6 · DynamicRouteLoader 는 DEAD_ABSTRACTION 으로 제거됐다', () => {
  it.each(['components/routing', 'lib/widgets'])('%s 가 존재하지 않는다', (rel) => {
    expect(existsSync(join(SRC, rel))).toBe(false);
  });

  it('App.tsx 가 routing 배럴을 재수출하지 않고 widget registry 를 호출하지 않는다', () => {
    const app = stripAllComments(read('App.tsx'));
    expect(app).not.toContain('@/components/routing');
    expect(app).not.toContain('registerAllWidgets');
    expect(app).not.toContain('DynamicRouteLoader');
  });

  it('backend navigation · routes stub 이 존재하지 않고 마운트되지 않는다', () => {
    expect(existsSync(join(API, 'routes/navigation.routes.ts'))).toBe(false);
    expect(existsSync(join(API, 'routes/routes.routes.ts'))).toBe(false);
    const register = stripAllComments(readApi('bootstrap/register-routes.ts'));
    expect(register).not.toContain("'/api/v1/navigation'");
    expect(register).not.toContain("'/api/v1/routes'");
    expect(register).not.toContain('navigation.routes');
    expect(register).not.toContain('routes.routes');
  });
});

// ===========================================================================
// 6. stub navigation 의존 0
// ===========================================================================

describe('§6 · useAdminMenu 는 정적 메뉴 SSOT 만 쓴다', () => {
  const HOOK = stripAllComments(read('hooks/useAdminMenu.ts'));

  it('/v1/navigation/admin 을 호출하지 않는다', () => {
    expect(HOOK).not.toContain('/navigation');
    expect(HOOK).not.toContain('transformApiMenuItems');
    expect(HOOK).not.toContain('isUsingFallback');
  });

  it('권한 조회(/v1/userRole/:id/permissions) 와 정적 메뉴는 유지한다', () => {
    expect(HOOK).toContain('/v1/userRole/${user.id}/permissions');
    expect(HOOK).toContain('adminMenuStatic');
  });
});

// ===========================================================================
// 7. API prefix 정합 (CONNECT_TO_EXISTING_BACKEND / FIX_TO_EXISTING_BACKEND)
// ===========================================================================

describe('§7-§8 · 연결 수정 호출이 backend 계약 경로를 가리킨다', () => {
  it('userApi approve/reject → /v1/users/:id/approve|reject (backend users.routes)', () => {
    const src = stripAllComments(read('api/userApi.ts'));
    expect(src).toContain('/v1/users/${userId}/approve');
    expect(src).toContain('/v1/users/${userId}/reject');
    expect(src).not.toContain('/admin/users/');
    expect(src).not.toContain('migrateUserRoles');
    const backend = readApi('routes/users.routes.ts');
    expect(backend).toContain("'/:id/approve'");
    expect(backend).toContain("'/:id/reject'");
  });

  it('AI policy · generate → /api/ai (unifiedApi.raw, base /api)', () => {
    const settings = stripAllComments(read('pages/settings/AiQuerySettings.tsx'));
    expect(settings).toContain("unifiedApi.raw.get('/ai/policy')");
    expect(settings).toContain("unifiedApi.raw.put('/ai/policy'");
    expect(settings).not.toContain('authClient.api');
    const gen = stripAllComments(read('services/ai/SimpleAIGenerator.ts'));
    expect(gen).toContain("unifiedApi.raw.post('/ai/generate'");
    expect(gen).not.toContain('authClient.api');
    const register = stripAllComments(readApi('bootstrap/register-routes.ts'));
    expect(register).toContain("app.use('/api/ai', aiQueryRoutes)");
    expect(register).toContain("app.use('/api/ai', aiProxyRoutes)");
  });

  it('CMS 첨부 업로드 → /platform/media-library/upload (uploadImageForEditor)', () => {
    const modal = stripAllComments(read('pages/cms/contents/ContentFormModal.tsx'));
    expect(modal).toContain("from '@/api/media-library.api'");
    expect(modal).toContain("uploadImageForEditor(file, 'cms')");
    expect(modal).not.toContain('mediaApi');
    expect(modal).not.toContain('.zip');
  });

  it('CPT 도구 field group 목록 → /cpt/field-groups (fieldGroupApi)', () => {
    const toolset = stripAllComments(read('pages/cpt-engine/CPTDashboardToolset.tsx'));
    expect(toolset).toContain('fieldGroupApi.getAll()');
    expect(toolset).not.toContain('acfGroupApi');
    const acf = stripAllComments(read('features/cpt-acf/services/acf.api.ts'));
    expect(acf).toContain("'/cpt/types'");
    expect(acf).toContain("'/cpt/taxonomies'");
    expect(acf).not.toContain('/cpt/custom-post-types');
    expect(acf).not.toContain("get('/taxonomies')");
  });

  it('내부 링크 오타 수정 — /apps/store · /settings/app-services', () => {
    const guard = stripAllComments(read('components/common/AppGuard.tsx'));
    expect(guard).not.toContain('/admin/appstore');
    expect(guard).toContain('to="/apps/store"');
    const modal = stripAllComments(read('components/ai/SimpleAIModal.tsx'));
    expect(modal).not.toContain('/admin/settings/app-services');
    expect(hasRoute('/apps/store')).toBe(true);
  });

  it('backend 없는 dead helper 가 제거됐다', () => {
    expect(stripAllComments(read('api/store-content.api.ts'))).not.toContain('content-analytics/track');
    expect(stripAllComments(read('api/settings.ts'))).not.toContain('/settings/cache/clear');
    expect(stripAllComments(read('config/rolePermissions.ts'))).not.toContain("get('/roles')");
    expect(stripAllComments(read('types/user.ts'))).not.toContain('/api/v1/roles');
    expect(stripAllComments(read('pages/settings/OAuthSettings.tsx'))).not.toContain('/settings/oauth/test');
    const partners = stripAllComments(read('pages/neture/PartnerListPage.tsx'));
    expect(partners).not.toContain('/status');
    expect(partners).not.toContain('useMutation');
  });
});

// ===========================================================================
// 8. REMOVE_BROKEN_UI 부재
// ===========================================================================

describe('§8-§9 · backend 없는 화면이 되살아나지 않는다', () => {
  it.each([
    'pages/admin/orders',
    'pages/menus',
    'api/menuApi.ts',
    'pages/appearance/TemplateParts.tsx',
    'pages/ToolsPage.tsx',
    'pages/tools',
    'api/presets.ts',
    'utils/seedPresets.ts',
    'components/presets',
    'pages/cpt-engine/presets',
    'pages/test/SeedPresets.tsx',
    'pages/test/PresetIntegrationTest.tsx',
    'pages/enrollments',
    'pages/RoleApplicationsAdminPage.tsx',
    'components/widgets/PendingApplicationsWidget.tsx',
    'hooks/useRoleApplicationsCount.ts',
    'hooks/useKeyboardShortcuts.ts',
    'pages/storefront',
    'pages/media',
    'pages/mail',
    'pages/users/components/BusinessInfoSection.tsx',
    'components/guards/GlucosecareParticipationNotice.tsx',
    'routes/commerce.routes.tsx',
  ])('%s 가 존재하지 않는다', (rel) => {
    expect(existsSync(join(SRC, rel))).toBe(false);
  });

  it('제거 route 선언이 0건이다', () => {
    for (const path of [
      '/admin/orders', '/enrollments', '/admin/enrollments', '/admin/role-applications',
      '/cpt-engine/presets', '/appearance/menus', '/appearance/template-parts',
      '/tools', '/reusable-blocks', '/storefront', '/admin/test/seed-presets',
      '/admin/test/preset-integration',
    ]) {
      expect(ALL_ROUTES, `${path} route 가 남아 있다`).not.toMatch(new RegExp(`path="${path.replace(/\//g, '\\/')}(/\\*)?"`));
    }
  });

  it('레거시 /media/* · /mail/* 는 실존 화면으로 redirect 한다', () => {
    const content = stripAllComments(read('routes/content.routes.tsx'));
    expect(content).toContain("LEGACY_MEDIA_REDIRECT = '/content-resource/media-assets'");
    expect(/<Route[^>]*path="\/media\/\*"[^>]*element=\{<Navigate to=\{LEGACY_MEDIA_REDIRECT\} replace \/>\}/.test(content)).toBe(true);
    const appearance = stripAllComments(read('routes/appearance.routes.tsx'));
    expect(appearance).toContain("LEGACY_MAIL_REDIRECT = '/settings/email'");
    expect(/<Route[^>]*path="\/mail\/\*"[^>]*element=\{<Navigate to=\{LEGACY_MAIL_REDIRECT\} replace \/>\}/.test(appearance)).toBe(true);
    expect(hasRoute('/content-resource/media-assets')).toBe(true);
    expect(hasRoute('/settings/email')).toBe(true);
  });

  it('활성 소스 어디에도 제거 모듈 import 가 없다', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name === 'node_modules' || name === 'dist' || name === 'tests') continue;
          walk(full, out);
        } else if (/\.(ts|tsx)$/.test(name)) out.push(full);
      }
      return out;
    };
    const BANNED = [
      '@/components/routing', '@/lib/widgets', '@/pages/dashboard', '@/pages/AdminHome',
      '@/hooks/api/useDashboard', '@/api/menuApi', '@/api/presets', '@/utils/seedPresets',
      '@/components/presets', '@/pages/storefront', '@/pages/media', '@/pages/mail',
      '@/hooks/useKeyboardShortcuts', '@/hooks/useRoleApplicationsCount',
      'PendingApplicationsWidget', 'GlucosecareParticipationNotice', 'BusinessInfoSection',
      '@/routes/commerce.routes',
    ];
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const src = stripAllComments(readFileSync(f, 'utf8'));
      for (const b of BANNED) if (src.includes(b)) offenders.push(`${f.slice(SRC.length + 1)} :: ${b}`);
    }
    expect(offenders).toEqual([]);
  });
});
