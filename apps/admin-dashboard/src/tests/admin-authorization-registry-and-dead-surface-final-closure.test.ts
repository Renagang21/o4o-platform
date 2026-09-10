/**
 * WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 — 회귀 가드
 *
 * §9 의 12개 최소 계약을 고정한다.
 *
 *   1  진입 floor = platform:super_admin 단독
 *   2  서비스 접두 역할은 진입하지 못한다
 *   3  legacy admin/operator 계열은 진입하지 못한다
 *   4  정적 메뉴 전 노드가 명시적 권한 설정을 갖는다
 *   5  미등록 menuId = DENY
 *   6  플랫폼 관리자는 22 메뉴 전부에 접근한다
 *   7  플랫폼 전용 API 는 platform:super_admin 만 통과한다
 *   8  /dashboard/business 최종 처리 고정
 *   9  PartnerOps 관리자 런타임 0
 *   10 PartnerOps catalog 최종 상태 고정
 *   11 partner-core 등 살아 있는 공용 계약 보존
 *   12 GlycoPharm 활성 계약 0
 *
 * §9 원칙: raw-source 검사는 **구조 부재 확인용**으로만 쓰고, 권한 동작은
 * 실제 함수(`hasMenuPermission` · `hasRequiredRoles`)를 호출해 검증한다.
 *
 * 검증 기록: docs/checks/WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1-CHECK.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';

import { hasRequiredRoles } from '@o4o/auth-context';
import {
  hasMenuPermission,
  menuPermissions,
  DYNAMIC_MENU_ID_PREFIXES,
  PLATFORM_ADMIN_ROLES,
} from '../config/rolePermissions';
import { adminMenuStatic } from '../admin/menu/admin-menu.static';

const SRC = join(__dirname, '..');
const API = join(__dirname, '../../../../apps/api-server/src');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const readApi = (rel: string) => readFileSync(join(API, rel), 'utf8');

/**
 * 제거 근거 주석에 남은 식별자가 오탐되지 않도록 주석을 제거한다.
 * 블록 주석은 JSX 주석·JSDoc 형태만 지운다 (라우트의 `path="/*"` 오인 방지).
 */
const stripAllComments = (s: string) =>
  s
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\*\*[\s\S]*?\*\//gm, '');

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

/** 정적 메뉴 트리를 평탄화한다 (separator / collapse 는 권한 평가 대상이 아니다). */
type Node = { id?: string; path?: string; separator?: boolean; children?: Node[] };
const flatten = (items: Node[], out: Node[] = []): Node[] => {
  for (const item of items) {
    if (item.separator || item.id === 'collapse') continue;
    out.push(item);
    if (item.children?.length) flatten(item.children, out);
  }
  return out;
};

const ALL_NODES = flatten(adminMenuStatic as unknown as Node[]);
const CLICKABLE = ALL_NODES.filter((n) => typeof n.path === 'string' && n.path.length > 0);

const asUser = (...roles: string[]) => ({ roles });
const PLATFORM_ADMIN = ['platform:super_admin'];
const SERVICE_ROLES = [
  'kpa:admin',
  'kpa:operator',
  'neture:admin',
  'neture:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'pharmacy-hub:operator',
  'kpa:store_owner',
];
const LEGACY_ROLES = ['admin', 'administrator', 'super_admin', 'operator'];

// ===========================================================================
// 계약 1~3 — 진입 floor
// ===========================================================================

describe('§9-1~3 · 관리자 SPA 진입 floor', () => {
  it('1. floor 는 platform:super_admin 단독이다', () => {
    expect([...PLATFORM_ADMIN_ROLES]).toEqual(['platform:super_admin']);
    const APP = stripAllComments(read('App.tsx'));
    expect(APP).toContain("requiredRoles={['platform:super_admin']}");
    expect(APP.match(/<Route path="\/\*"/g) ?? []).toHaveLength(1);
  });

  it('2. 서비스 접두 역할은 floor 를 통과하지 못한다 (실제 함수 호출)', () => {
    for (const role of SERVICE_ROLES) {
      expect(hasRequiredRoles(asUser(role), [...PLATFORM_ADMIN_ROLES])).toBe(false);
    }
  });

  it('3. legacy admin/operator 계열은 floor 를 통과하지 못한다 (실제 함수 호출)', () => {
    for (const role of LEGACY_ROLES) {
      expect(hasRequiredRoles(asUser(role), [...PLATFORM_ADMIN_ROLES])).toBe(false);
    }
  });

  it('platform:super_admin 은 floor 를 통과한다 (관리자 잠금 방지)', () => {
    expect(hasRequiredRoles(asUser(...PLATFORM_ADMIN), [...PLATFORM_ADMIN_ROLES])).toBe(true);
  });
});

// ===========================================================================
// 계약 4~6 — 메뉴 권한 deny-by-default
// ===========================================================================

describe('§9-4~6 · 메뉴 권한 정책', () => {
  it('클릭 가능한 정적 메뉴는 22개다', () => {
    expect(CLICKABLE).toHaveLength(22);
  });

  it('4. 정적 메뉴 전 노드(클릭 22 + 그룹 헤더 5)가 명시적 권한 설정을 갖는다', () => {
    const configured = new Set(menuPermissions.map((m) => m.menuId));
    const missing = ALL_NODES.map((n) => n.id).filter((id) => !!id && !configured.has(id));
    expect(missing).toEqual([]);
    expect(ALL_NODES).toHaveLength(27);
  });

  it('4-b. 모든 설정 항목이 명시적 역할을 갖는다 (무게이트 항목 0)', () => {
    const empty = menuPermissions
      .filter((m) => !m.roles?.length && !m.permissions?.length)
      .map((m) => m.menuId);
    expect(empty).toEqual([]);
  });

  it('5. 미등록 menuId 는 거부된다 (DENY_BY_DEFAULT)', () => {
    for (const unknown of ['no-such-menu', 'seller-management', 'finance', '']) {
      expect(hasMenuPermission(PLATFORM_ADMIN, [], unknown)).toBe(false);
    }
  });

  it('5-b. "설정 없음 = 허용" fallback 이 소스에 남아 있지 않다', () => {
    const src = read('config/rolePermissions.ts');
    expect(src).toMatch(/if \(!menuConfig\) \{\s*\n\s*return false;/);
    expect(src).not.toContain('ALLOW BY DEFAULT');
  });

  it('6. platform:super_admin 은 정적 메뉴 전 노드에 접근한다', () => {
    const denied = ALL_NODES.filter((n) => !hasMenuPermission(PLATFORM_ADMIN, [], n.id as string))
      .map((n) => n.id);
    expect(denied).toEqual([]);
  });

  it('6-b. 동적 CPT 메뉴 계열도 명시 선언으로 노출된다 (누락 소실 방지)', () => {
    expect(DYNAMIC_MENU_ID_PREFIXES.map((e) => e.prefix)).toContain('cpt-');
    for (const id of [
      'custom-posts',
      'cpt-notice',
      'cpt-notice-all',
      'cpt-notice-new',
      'cpt-notice-categories',
    ]) {
      expect(hasMenuPermission(PLATFORM_ADMIN, [], id)).toBe(true);
    }
  });

  it('6-c. 메뉴 설정에 platform 이외 역할이 없다 (§4.2)', () => {
    const roles = new Set([
      ...menuPermissions.flatMap((m) => m.roles ?? []),
      ...DYNAMIC_MENU_ID_PREFIXES.flatMap((e) => e.roles),
    ]);
    expect([...roles].sort()).toEqual(['platform:super_admin']);
  });
});

// ===========================================================================
// 계약 7 — 백엔드 플랫폼 전용 API 경계
// ===========================================================================

describe('§9-7 · 플랫폼 전용 API 는 platform:super_admin 만 통과한다', () => {
  it('requireAdmin 은 platform:super_admin 만 허용한다', () => {
    const mw = stripAllComments(readApi('common/middleware/auth/authorization.middleware.ts'));
    const idx = mw.indexOf('export const requireAdmin');
    expect(idx).toBeGreaterThan(-1);
    const body = mw.slice(idx, idx + 900);
    expect(body).toContain("'platform:super_admin'");
    for (const legacy of LEGACY_ROLES) {
      expect(body).not.toContain(`'${legacy}'`);
    }
  });

  it('플랫폼 전용 admin 라우터의 ADMIN_ROLES 상수가 platform:super_admin 단독이다', () => {
    const users = stripAllComments(readApi('routes/admin/users.routes.ts'));
    expect(users).toContain("const ADMIN_ROLES = ['platform:super_admin']");
  });
});

// ===========================================================================
// 계약 8 — /dashboard/business
// ===========================================================================

describe('§9-8 · /dashboard/business 는 제거되었다', () => {
  it('라우트 선언이 0건이다', () => {
    const routes = stripAllComments(read('routes/dashboard.routes.tsx'));
    expect(routes).not.toContain('/dashboard/business');
    expect(routes).not.toContain('BusinessDashboard');
  });

  it('전용 화면 컴포넌트가 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'pages/dashboard/business'))).toBe(false);
  });

  it('활성 소스 어디에도 dashboard/business 참조가 없다', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.includes(`${sep}tests${sep}`))
      .filter((f) => stripAllComments(readFileSync(f, 'utf8')).includes('dashboard/business'))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('도달 불가능한 역할 조합(partner/affiliate)을 요구하는 라우트가 0건이다', () => {
    const offenders = walk(join(SRC, 'routes'))
      .filter((f) =>
        /requiredRoles=\{\[[^\]]*'(partner|affiliate)'/.test(
          stripAllComments(readFileSync(f, 'utf8'))
        )
      )
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });
});

// ===========================================================================
// 계약 9~11 — PartnerOps
// ===========================================================================

describe('§9-9~11 · PartnerOps 계층별 최종 상태', () => {
  it('9. 관리자 메뉴·라우트·화면이 0건이다', () => {
    expect(ALL_NODES.filter((n) => (n.path ?? '').includes('partnerops'))).toEqual([]);
    expect(existsSync(join(SRC, 'pages/partnerops'))).toBe(false);
    const offenders = walk(join(SRC, 'routes'))
      .filter((f) => stripAllComments(readFileSync(f, 'utf8')).includes('partnerops'))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('10. appsCatalog 에 partnerops **appId** 항목이 없다', () => {
    const catalog = stripAllComments(readApi('app-manifests/appsCatalog.ts'));
    expect(catalog).not.toContain("appId: 'partnerops'");
  });

  it('11. partnerops **serviceGroup** 과 partner-core 는 보존된다', () => {
    const catalog = stripAllComments(readApi('app-manifests/appsCatalog.ts'));
    expect(catalog).toContain("id: 'partnerops'");
    expect(catalog).toContain("appId: 'partner-core'");
    expect(catalog).toContain("serviceGroups: ['platform-core', 'partnerops']");
    // 프런트 ServiceGroup union 도 같은 공용 계약을 공유한다.
    expect(read('api/admin-apps.ts')).toContain("'partnerops'");
  });
});

// ===========================================================================
// 계약 12 — GlycoPharm
// ===========================================================================

describe('§9-12 · GlycoPharm 활성 계약 0', () => {
  it('활성 관리자 소스에 glycopharm 서비스 계약이 없다', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.includes(`${sep}tests${sep}`))
      .filter((f) => /glycopharm/i.test(stripAllComments(readFileSync(f, 'utf8'))))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });
});
