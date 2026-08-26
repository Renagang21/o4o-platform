/**
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §15
 *
 * production smoke 결함: PH operator 콘솔의 `승인 (공개)` CTA 가 403
 * `SERVICE_SCOPE_VIOLATION` 으로 실패했다 (dead CTA).
 *
 * 원인: `isCourseAccessibleByOperator` 가 역할 목록에서 **첫 서비스 역할 하나만** 보고
 *      즉시 판정했다. 다중 서비스 운영자(`kpa:store_owner` 가 앞, `pharmacy-hub:operator`
 *      가 뒤)는 자기 서비스 강의에도 접근하지 못했다.
 *
 * 계약: 역할 목록 전체를 확인한다. 단, 매칭 대상은 운영 역할(admin·operator)로 제한해
 *      store_owner 같은 비운영 역할이 다른 서비스 권한을 만들지 않게 한다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROUTES = readFileSync(
  join(__dirname, '../modules/lms/routes/lms.routes.ts'),
  'utf-8',
);
const FN = ROUTES.slice(
  ROUTES.indexOf('function isCourseAccessibleByOperator'),
  ROUTES.indexOf('const router: Router = Router();'),
);

describe('LMS operator service scope — 다중 서비스 운영자 (§15)', () => {
  it('역할 목록 전체를 확인한다 (첫 역할만 보고 단정하지 않는다)', () => {
    expect(FN).toContain('roles.some(');
    expect(FN).not.toMatch(/for \(const role of roles\)/);
  });

  it('매칭 대상을 운영 역할(admin·operator)로 제한한다', () => {
    expect(FN).toContain("suffix !== 'admin' && suffix !== 'operator'");
  });

  it('platform admin bypass 와 legacy(unscoped) 강의 허용은 유지한다', () => {
    expect(FN).toContain('PLATFORM_ADMIN_ROLES.has(r)');
    expect(FN).toContain('if (!courseServiceKey) return true;');
  });

  it('canonical serviceKey 해석은 security-core SSOT 를 계속 사용한다', () => {
    expect(FN).toContain('resolveCanonicalServiceKey(prefix) === courseServiceKey');
  });

  it('시뮬레이션: kpa:store_owner 가 앞선 pharmacy-hub 운영자도 PH 강의에 접근한다', () => {
    const resolve = (p: string) => (p === 'kpa' ? 'kpa-society' : p);
    const accessible = (roles: string[], courseServiceKey: string | null) => {
      if (roles.some((r) => ['admin', 'super_admin', 'platform:super_admin'].includes(r))) return true;
      if (!courseServiceKey) return true;
      return roles.some((role) => {
        const colon = role.indexOf(':');
        if (colon <= 0) return false;
        const prefix = role.slice(0, colon);
        const suffix = role.slice(colon + 1);
        if (prefix === 'lms' || prefix === 'platform') return false;
        if (suffix !== 'admin' && suffix !== 'operator') return false;
        return resolve(prefix) === courseServiceKey;
      });
    };
    const roles = ['kpa:store_owner', 'pharmacy-hub:operator', 'pharmacy-hub:admin'];
    expect(accessible(roles, 'pharmacy-hub')).toBe(true);
    // 비운영 역할만 가진 서비스의 강의에는 접근하지 못한다
    expect(accessible(['kpa:store_owner', 'pharmacy-hub:operator'], 'kpa-society')).toBe(false);
  });
});
