/**
 * WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1 — 회귀 테스트
 *
 * 이 WO 는 권한을 새로 만들지 않는다. 관리자 대시보드의 **운영 주체와 보안 경계**를 확정하고,
 * 그 경계가 코드에서 다시 어긋나지 않도록 고정한다. 고정 대상은 세 가지다.
 *
 * 1. **플랫폼 전역 회원 데이터 화면의 route 경계**
 *    `/api/v1/membership/*` 관리자 subtree 는 `MEMBERSHIP_ADMIN_ROLES =
 *    ['platform:super_admin']` 로 보호된다(서비스 경계가 없는 플랫폼 전역 데이터).
 *    같은 데이터를 다루는 화면은 route 에서도 같은 경계를 선언해야 한다.
 *    `requiredPermissions` 만 선언하면 백엔드가 `user.permissions` 를 공급하지 않으므로
 *    실효 경계가 "관리자급이면 통과"(서비스 접두 `kpa:admin` 포함) 로 넓어진다
 *    (packages/auth-context/src/adminRouteAccess.ts — hasRequiredPermissions fallback).
 *
 * 2. **접두 중복(`/api/v1/api/...`) 의 무증식**
 *    authClient / utils.apiClient 의 baseURL 은 이미 `…/api/v1` 로 끝난다. 이 클라이언트로
 *    `/api/...` 를 호출하면 404 다. 현존 잔여분은 대응 백엔드 자체가 없는 화면들이라
 *    이 WO 에서 경로만 고쳐도 살아나지 않는다(별도 정책 판단 대상). 다만 **더 늘어나면 안 된다.**
 *
 * 3. **canonical 마운트 접두**
 *    `/api/v1/membership` 이 유일한 membership 마운트다.
 *
 * 운영 DB·네트워크를 사용하지 않는다. 소스 파일만 읽는다.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '../../..');

const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

/** 주석은 계약이 아니다 — 판정에서 제외한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const listSources = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs, rel ? `${rel}/${name}` : name);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.|\.spec\./.test(name)) {
        out.push(rel ? `${rel}/${name}` : name);
      }
    }
  };
  walk(SRC, '');
  return out;
};

/** `/api/v1` 로 끝나는 baseURL 을 쓰는 클라이언트를 임포트한 파일인가. */
const usesV1BaseClient = (raw: string): boolean =>
  (/from\s+['"]@o4o\/auth-client['"]/.test(raw) || /utils\/apiClient['"]/.test(raw)) &&
  !/lib\/api-client['"]/.test(raw);

// ---------------------------------------------------------------------------

describe('플랫폼 전역 회원 데이터 화면의 route 경계', () => {
  const routes = stripComments(read('routes/yaksa.routes.tsx'));

  /** `<Route ... path="X" ... element={<AdminProtectedRoute ...>` 한 덩어리를 뽑는다. */
  const routeBlock = (path: string): string => {
    const at = routes.indexOf(`path="${path}"`);
    expect(at, `route 선언을 찾지 못했다: ${path}`).toBeGreaterThan(-1);
    return routes.slice(at, at + 400);
  };

  const MEMBERSHIP_SCREENS = [
    '/admin/membership/dashboard',
    '/admin/membership/members',
    '/admin/membership/members/:id',
    '/admin/membership/verifications',
    '/admin/membership/categories',
    '/admin/membership/audit-logs',
  ];

  it.each(MEMBERSHIP_SCREENS)(
    '%s 는 PLATFORM_ADMIN_ROLES 를 requiredRoles 로 선언한다',
    (path) => {
      expect(routeBlock(path)).toContain('requiredRoles={[...PLATFORM_ADMIN_ROLES]}');
    },
  );

  it('/admin/yaksa/members 도 같은 데이터를 다루므로 같은 경계를 선언한다', () => {
    // MemberApprovalPage 는 `/api/v1/membership/*`(플랫폼 전역) 을 소비한다.
    // 화면 자체의 운영 주체(canonical 콘솔과의 중복 여부)는 별도 정책 판단 대상이지만,
    // 데이터 경계는 canonical 콘솔과 동일해야 한다.
    expect(routeBlock('/admin/yaksa/members')).toContain(
      'requiredRoles={[...PLATFORM_ADMIN_ROLES]}',
    );
  });

  it('PLATFORM_ADMIN_ROLES 는 platform:super_admin 단독으로 유지된다 (임의 확대 금지)', () => {
    const config = stripComments(read('config/rolePermissions.ts'));
    expect(config).toContain(
      "export const PLATFORM_ADMIN_ROLES = ['platform:super_admin'] as const;",
    );
  });
});

describe('접두 중복(/api/v1/api/...) 무증식', () => {
  /**
   * 현재 남아 있는 파일 목록. 모두 **대응 백엔드 마운트가 존재하지 않는** 화면이라
   * 경로만 고쳐도 동작하지 않는다(운영 API 실측: /api/v1/annualfee·/api/v1/presets·
   * /api/v1/partnerops 등 404). 따라서 이 WO 에서는 고치지 않고 목록으로 고정한다.
   * 새 파일이 추가되면 실패한다.
   */
  const KNOWN = [
    'components/ai/FloatingAiButton.tsx',
    'components/organization/OrganizationSelector.tsx',
    'components/organization/PermissionGuard.tsx',
    'components/product/ProductSelector.tsx',
    'features/cpt-acf/components/FormRenderer.tsx',
    'hooks/useNotifications.ts',
    'pages/annualfee/ExemptionManagement.tsx',
    'pages/annualfee/FeeDashboard.tsx',
    'pages/annualfee/InvoiceManagement.tsx',
    'pages/annualfee/PaymentManagement.tsx',
    'pages/annualfee/PolicyManagement.tsx',
    'pages/annualfee/SettlementManagement.tsx',
    'pages/dashboard/unified/cards/OverviewCard.tsx',
    'pages/digital-signage/v2/ChannelEditor.tsx',
    'pages/digital-signage/v2/ChannelList.tsx',
    'services/api/zoneApi.ts',
  ];

  const offenders = (): string[] => {
    const out: string[] = [];
    for (const rel of listSources()) {
      const raw = read(rel);
      if (!usesV1BaseClient(raw)) continue;
      const src = stripComments(raw);
      if (
        /\b(?:authClient\.api|apiClient)\.(?:get|post|put|patch|delete)\(\s*[`'"]\/api\//.test(src)
      ) {
        out.push(rel);
      }
    }
    return out.sort();
  };

  it('알려진 목록 밖에서 새 접두 중복이 생기지 않는다', () => {
    expect(offenders().filter((f) => !KNOWN.includes(f))).toEqual([]);
  });

  it('회원 감사 로그 화면은 접두 중복이 해소된 상태를 유지한다', () => {
    const src = stripComments(read('pages/membership/audit-logs/AuditLogManagement.tsx'));
    expect(src).toContain('authClient.api.get(`/membership/audit-logs?${params}`)');
    expect(src).not.toContain('/api/membership/');
  });
});

describe('canonical 마운트 접두', () => {
  it('membership 은 /api/v1/membership 한 곳에만 마운트된다', () => {
    const register = stripComments(
      readFileSync(join(REPO, 'apps/api-server/src/bootstrap/register-routes.ts'), 'utf8'),
    );
    const mounts = [...register.matchAll(/app\.use\(\s*'(\/api\/[^']*membership[^']*)'/g)].map(
      (m) => m[1],
    );
    expect([...new Set(mounts)]).toEqual(['/api/v1/membership']);
  });
});
