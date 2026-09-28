/**
 * 분회 · 커뮤니티 상위 권한 분리 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10 (V5 · V6)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V5 가 막는 것
 *
 *   분회 개설 승인을 `kpa-branch:operator` 로 열면 안 된다.
 *   이 역할은 **서비스 전역 역할**이고(개별 분회 한정은 `branch_memberships` +
 *   `requireBranchScope` 가 따로 만든다), **개별 분회 운영자도 이 역할을 갖는다.**
 *   그대로 열면 A 분회 운영자가 B 분회 개설을 승인할 수 있다.
 *
 *   그래서 승인 주체는 `kpa-branch:admin`(서브도메인 전체 운영자)이다.
 *   그 역할은 이미 roles seed 에 있으나 **지정 카탈로그에 없어** 화면에서 줄 수 없었다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ASSIGNABLE_OPERATOR_ROLES, resolveOperatorRole } from '../operator-role-catalog.js';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

describe('V5 — 분회 상위 권한이 지정 가능하다', () => {
  it('kpa-branch:admin 이 지정 카탈로그에 있다', () => {
    expect(ASSIGNABLE_OPERATOR_ROLES).toContain('kpa-branch:admin');
  });

  it('kpa-branch:admin 은 kpa-branch 서비스로 해석된다', () => {
    expect(resolveOperatorRole('kpa-branch:admin', 'kpa-branch')).toEqual({
      serviceKey: 'kpa-branch',
      role: 'kpa-branch:admin',
    });
  });

  it('개별 분회 운영자 역할도 그대로 남아 있다 (둘은 다른 권한이다)', () => {
    expect(ASSIGNABLE_OPERATOR_ROLES).toContain('kpa-branch:operator');
  });

  it('roles seed 가 kpa-branch:admin 을 서비스 전체 관리로 정의한다', () => {
    const seed = read('database/migrations/20270305000000-SeedKpaBranchServiceAndRoles.ts');
    expect(seed).toMatch(/kpa-branch:admin/);
    expect(seed).toMatch(/분회 서비스 전체 관리자/);
  });
});

describe('V6 — 기존 분회 경계가 그대로다', () => {
  const scope = codeOnly(read('middleware/kpa-branch-scope.middleware.ts'));

  it('requireBranchScope 가 소속 분회 id 를 비교한다', () => {
    expect(scope).toMatch(/membership\.organization_id !== req\.branch\.id/);
    expect(scope).toMatch(/BRANCH_SCOPE_MISMATCH/);
  });

  it('서비스 전체 관리자만 그 비교를 건너뛴다 (operator 는 못 건너뛴다)', () => {
    expect(scope).toMatch(/isBranchServiceAdmin\(req\)/);
    // operator 를 bypass 목록에 넣지 않았다.
    expect(scope).not.toMatch(/roles\?\.includes\('kpa-branch:operator'\)/);
  });
});

describe('커뮤니티 — 전체 관리자만 만들고 전역 operator 는 만들지 않는다', () => {
  it('community:admin 은 지정 가능하다', () => {
    expect(ASSIGNABLE_OPERATOR_ROLES).toContain('community:admin');
  });

  it('community:operator 는 **만들지 않았다** (개별 운영은 개체 역할로만)', () => {
    expect(ASSIGNABLE_OPERATOR_ROLES).not.toContain('community:operator');
  });

  it('platform:* 은 여전히 부여 대상이 아니다', () => {
    expect(ASSIGNABLE_OPERATOR_ROLES.some((r) => r.startsWith('platform:'))).toBe(false);
  });
});
