/**
 * 개별 분회 운영자 지정·해제 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * 고정하는 것
 *   - 대상 분회의 active 소속자만 지정·해제한다(다른 분회 소속자 → 409 NOT_BRANCH_MEMBER)
 *   - 서비스 membership 이 active 가 아니면 지정하지 않는다(pending · suspended · 없음 → 409), 되살리지 않는다
 *   - 역할 쓰기는 canonical 경로(roleAssignmentService)만 — 멱등
 *   - 라우트 가드는 kpa-branch:admin(서비스 관리자) — Admin 카탈로그에는 kpa-branch:operator 가 없다
 */
import * as fs from 'fs';
import * as path from 'path';

const BRANCH_A = '11111111-1111-4111-8111-111111111111';
const BRANCH_B = '22222222-2222-4222-8222-222222222222';
const U1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const roles = new Set<string>();
const hasRole = jest.fn(async (u: string, r: string) => roles.has(`${u}|${r}`));
const assignRole = jest.fn(async ({ userId, role }: { userId: string; role: string }) => roles.add(`${userId}|${role}`));
const removeRole = jest.fn(async (u: string, r: string) => roles.delete(`${u}|${r}`));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasRole: (...a: [string, string]) => hasRole(...a),
    assignRole: (...a: [any]) => assignRole(...a),
    removeRole: (...a: [string, string]) => removeRole(...a),
  },
}));

import {
  BranchOperatorDesignationError,
  BranchOperatorDesignationService,
} from '../branch-operator-designation.service.js';

let state: { branches: string[]; memberships: Array<[string, string]>; service: Record<string, string> };
const db = {
  query: jest.fn(async (sql: string, params: any[] = []) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM kpa_organizations')) return state.branches.includes(params[0]) ? [{ id: params[0], name: 'A' }] : [];
    if (s.startsWith('SELECT 1 FROM branch_memberships')) {
      return state.memberships.some(([b, u]) => b === params[0] && u === params[1]) ? [{ '?column?': 1 }] : [];
    }
    if (s.includes('FROM service_memberships WHERE')) return state.service[params[0]] ? [{ status: state.service[params[0]] }] : [];
    if (s.includes('FROM branch_memberships bm')) return [];
    throw new Error(`unexpected SQL: ${s}`);
  }),
};
const svc = () => new BranchOperatorDesignationService(db);

beforeEach(() => {
  roles.clear();
  jest.clearAllMocks();
  state = { branches: [BRANCH_A, BRANCH_B], memberships: [[BRANCH_A, U1]], service: { [U1]: 'active' } };
});

async function code(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(BranchOperatorDesignationError);
    return (e as BranchOperatorDesignationError).code;
  }
  return 'OK';
}

describe('지정', () => {
  it('이 분회 active 소속 + 서비스 active → canonical 경로로 kpa-branch:operator 부여', async () => {
    await expect(svc().designate(BRANCH_A, U1, 'admin')).resolves.toEqual({ assigned: true });
    expect(assignRole).toHaveBeenCalledWith({ userId: U1, role: 'kpa-branch:operator', assignedBy: 'admin' });
  });
  it('멱등 — 이미 운영자면 다시 쓰지 않는다', async () => {
    roles.add(`${U1}|kpa-branch:operator`);
    await expect(svc().designate(BRANCH_A, U1, 'admin')).resolves.toEqual({ assigned: false });
    expect(assignRole).not.toHaveBeenCalled();
  });
  it('다른 분회 소속자를 이 분회 id 로 지정할 수 없다', async () => {
    expect(await code(svc().designate(BRANCH_B, U1, 'admin'))).toBe('NOT_BRANCH_MEMBER');
    expect(assignRole).not.toHaveBeenCalled();
  });
  it.each(['pending', 'suspended', undefined])('서비스 membership %s → 409, 되살리지 않는다', async (status) => {
    if (status) state.service[U1] = status;
    else delete state.service[U1];
    expect(await code(svc().designate(BRANCH_A, U1, 'admin'))).toBe('SERVICE_MEMBERSHIP_NOT_ACTIVE');
    expect(assignRole).not.toHaveBeenCalled();
    expect(db.query.mock.calls.some(([sql]) => /UPDATE|INSERT/i.test(sql))).toBe(false);
  });
  it('존재하지 않는 분회 · 형식이 틀린 id → 404', async () => {
    expect(await code(svc().designate('33333333-3333-4333-8333-333333333333', U1, 'a'))).toBe('BRANCH_NOT_FOUND');
    expect(await code(svc().designate('not-a-uuid', U1, 'a'))).toBe('BRANCH_NOT_FOUND');
  });
});

describe('해제', () => {
  it('이 분회 소속 운영자 → 역할 해제', async () => {
    roles.add(`${U1}|kpa-branch:operator`);
    await expect(svc().release(BRANCH_A, U1)).resolves.toEqual({ removed: true });
    expect(removeRole).toHaveBeenCalledWith(U1, 'kpa-branch:operator');
  });
  it('다른 분회 id 로는 해제할 수 없다', async () => {
    roles.add(`${U1}|kpa-branch:operator`);
    expect(await code(svc().release(BRANCH_B, U1))).toBe('NOT_BRANCH_MEMBER');
    expect(removeRole).not.toHaveBeenCalled();
  });
  it('운영자가 아니면 404 NOT_OPERATOR', async () => {
    expect(await code(svc().release(BRANCH_A, U1))).toBe('NOT_OPERATOR');
  });
});

describe('라우트 가드 — 서비스 관리자(kpa-branch:admin)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../routes/kpa-branch/kpa-branch.routes.ts'), 'utf8');
  it.each([
    ["router.get(\n    '/admin/branches/:branchId/operators',"],
    ["router.post(\n    '/admin/branches/:branchId/operators',"],
    ["router.delete(\n    '/admin/branches/:branchId/operators/:userId',"],
  ])('%s 는 branchServiceAdminGuards 뒤에 있다', (head) => {
    const i = src.replace(/\r\n/g, '\n').indexOf(head);
    expect(i).toBeGreaterThan(-1);
    expect(src.replace(/\r\n/g, '\n').slice(i, i + 200)).toContain('...branchServiceAdminGuards');
  });
  it('branchServiceAdminGuards 는 kpa-branch:admin 이다', () => {
    expect(src).toMatch(/branchServiceAdminGuards = \[[^\]]*requireKpaBranchScope\(`\$\{SERVICE_KEY\}:admin`\)/);
  });
});
