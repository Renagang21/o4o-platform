/**
 * 분회 개설 신청 심사 — 권한 거부 경계 (WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 심사 경로(`/admin/branch-requests*`)는 `requireKpaBranchScope('kpa-branch:admin')` 이다.
 * 배선은 branch-lifecycle.test 가 소스로 고정한다. 여기서는 **실제 guard 판정**을 태운다:
 *
 *   kpa-branch:admin + active 가입       → 통과
 *   kpa-branch:operator (개별 분회 운영자) → 403  (전역 역할이라 A 분회 운영자가 B 개설을 승인하게 된다)
 *   kpa-branch:member                     → 403
 *   kpa-branch:admin 이지만 가입이 정지    → 403  (무효 membership 상태)
 *   다른 서비스 admin(kpa:admin 등)        → 403
 *   비로그인                               → 401
 */
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));

import { requireKpaBranchScope } from '../../../middleware/kpa-branch-scope.middleware.js';

function makeRes() {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
}

const guard = requireKpaBranchScope('kpa-branch:admin');

function run(user: unknown): { passed: boolean; status: number } {
  const res = makeRes();
  let passed = false;
  guard({ user } as any, res, () => {
    passed = true;
  });
  return { passed, status: res.statusCode };
}

const member = (roles: string[], status = 'active') => ({
  id: 'u1',
  roles,
  memberships: [{ serviceKey: 'kpa-branch', status }],
});

describe('분회 개설 신청 심사 — kpa-branch:admin 만 통과한다', () => {
  it('kpa-branch:admin + active 가입 → 통과', () => {
    expect(run(member(['kpa-branch:admin'])).passed).toBe(true);
  });

  it.each([
    ['개별 분회 운영자(kpa-branch:operator)', ['kpa-branch:operator']],
    ['분회 회원(kpa-branch:member)', ['kpa-branch:member']],
    ['다른 서비스 관리자(kpa:admin)', ['kpa:admin']],
    ['역할 없음', []],
  ])('%s → 403', (_label, roles) => {
    const out = run(member(roles as string[]));
    expect(out.passed).toBe(false);
    expect(out.status).toBe(403);
  });

  it.each(['pending', 'suspended', 'rejected', 'withdrawn'])(
    'kpa-branch:admin 이라도 서비스 가입이 %s 면 403',
    (status) => {
      const out = run(member(['kpa-branch:admin'], status));
      expect(out.passed).toBe(false);
      expect(out.status).toBe(403);
    },
  );

  it('비로그인 → 401', () => {
    const out = run(undefined);
    expect(out.passed).toBe(false);
    expect(out.status).toBe(401);
  });
});
