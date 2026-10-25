/** Legacy direct assignment now rejects without writes.
 * Keep suspended/status/password/membership cases as no-write guards.
 * Actual acceptance preserves membership status/role in service-operator-invitation.integration.test.ts.
 */
import 'reflect-metadata';

const hashPasswordMock = jest.fn(async (p: string) => `hashed:${p}`);
const assignRoleMock = jest.fn(async () => ({}));
const transactionMock = jest.fn();
const getRepositoryMock = jest.fn();

// Demo 판정은 "Demo 아님" 으로 고정 (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 근거는 support 헬퍼).
jest.mock('../../../services/auth/demo-account.service.js', () =>
  jest.requireActual('../../../__tests__/support/not-demo-account.js').notDemoAccountModule(),
);

jest.mock('../../../utils/auth.utils.js', () => ({ hashPassword: (p: string) => hashPasswordMock(p) }));
jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: (...args: unknown[]) => assignRoleMock(...(args as [])) },
}));
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: (...args: unknown[]) => getRepositoryMock(...(args as [])),
    transaction: (...args: unknown[]) => transactionMock(...(args as [])),
  },
}));
jest.mock('express-validator', () => ({
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
  body: () => ({}),
}));

import { AdminUserController } from '../AdminUserController.js';

// ─── stub ────────────────────────────────────────────────────────────────────

interface Recorded {
  userSaves: any[];
  memberships: any[];
  credentials: any[];
}

function makeRepoStub(store: any[], findOneResult: any = null) {
  return {
    findOne: jest.fn(async () => findOneResult),
    create: (obj: any) => ({ ...obj }),
    save: jest.fn(async (obj: any) => {
      const row = { ...obj, id: obj.id ?? 'generated-id' };
      store.push(row);
      return row;
    }),
    insert: jest.fn(async (obj: any) => {
      store.push({ ...obj });
      return { identifiers: [{}] };
    }),
  };
}

function install(opts: { existingUser?: any; existingCredential?: any }): Recorded {
  const rec: Recorded = { userSaves: [], memberships: [], credentials: [] };

  getRepositoryMock.mockImplementation(() => ({
    findOne: jest.fn(async () => opts.existingUser ?? null),
  }));

  transactionMock.mockImplementation(async (cb: any) => {
    const manager = {
      getRepository: (target: any) => {
        const name = typeof target === 'string' ? target : target?.name;
        if (name === 'ServiceMembership') return makeRepoStub(rec.memberships, null);
        if (name === 'ServiceCredential') return makeRepoStub(rec.credentials, opts.existingCredential ?? null);
        return makeRepoStub(rec.userSaves, null); // User repository
      },
    };
    return cb(manager);
  });

  return rec;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const SUSPENDED_USER = {
  id: 'user-suspended-1',
  email: 'suspended@example.com',
  status: 'suspended',
  isActive: false,
  firstName: '길동',
  lastName: '홍',
};

const APPROVED_USER = {
  id: 'user-approved-1',
  email: 'approved@example.com',
  status: 'approved',
  isActive: true,
  firstName: '길동',
  lastName: '홍',
};

function expectInvitationRequired(res: any) {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'OPERATOR_INVITATION_REQUIRED' });
  expect(transactionMock).not.toHaveBeenCalled();
  expect(assignRoleMock).not.toHaveBeenCalled();
  expect(hashPasswordMock).not.toHaveBeenCalled();
}

const body = (overrides: Record<string, unknown> = {}) => ({
  body: {
    email: 'suspended@example.com',
    firstName: '길동',
    lastName: '홍',
    roles: ['kpa:operator'],
    ...overrides,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  hashPasswordMock.mockImplementation(async (p: string) => `hashed:${p}`);
});

// ─── A. 기존 suspended 사용자 ────────────────────────────────────────────────

describe('A. 기존 suspended 사용자 — role 추가로 되살아나지 않는다', () => {
  it('users 행을 저장하지 않는다 (user-global status 무변경)', async () => {
    const rec = install({ existingUser: { ...SUSPENDED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    // User repository 로의 save/insert 가 한 번도 일어나지 않아야 한다.
    expect(rec.userSaves).toHaveLength(0);
    // No membership is created before explicit invitation acceptance.
    expect(rec.memberships).toHaveLength(0);
    expectInvitationRequired(res);
    // credential 은 이 경로에서 더 이상 만들어지지 않는다 (§18).
    expect(rec.credentials).toHaveLength(0);
  });

  it('기존 suspended 계정의 직접 지정을 쓰기 전에 거절한다', async () => {
    install({ existingUser: { ...SUSPENDED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expectInvitationRequired(res);
    expect(payload.isExistingUser).toBeUndefined();
    expectInvitationRequired(res);
  });

  it('body 에 status/isActive 를 실어 보내도 기존 사용자 상태는 바뀌지 않는다', async () => {
    // 상태 변경은 PATCH /admin/users/:id/status 전용 계약이다.
    const rec = install({ existingUser: { ...SUSPENDED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ status: 'approved', isActive: true }) as any,
      res,
    );

    expect(rec.userSaves).toHaveLength(0);
    expectInvitationRequired(res);
  });

  it('실제 회귀 케이스: 정지된 검증 계정에 kpa:store_owner 를 다시 부여하는 요청은 이제 400 으로 거절된다', async () => {
    // WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1 에서 관측된 시나리오.
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: Admin 은 서비스 운영자 역할만 지정한다 — 회원 역할
    //   (kpa:store_owner)은 서비스 운영자가 자기 서비스에서 관리하므로 이 경로는 쓰기 전에 거절한다.
    //   suspended 보존 계약은 위 운영자 역할 케이스가 계속 고정한다.
    const rec = install({
      existingUser: { ...SUSPENDED_USER, email: 'o4o-smoke-mystore@example.com' },
      existingCredential: { userId: SUSPENDED_USER.id, serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'o4o-smoke-mystore@example.com', roles: ['kpa:store_owner'] }) as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'ROLE_NOT_ASSIGNABLE' });
    expect(rec.userSaves).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
  });
});

// ─── B. 기존 approved 사용자 ─────────────────────────────────────────────────

describe('B. 기존 approved 사용자 — 상태 그대로', () => {
  it('users 행 저장 없이 approved 를 유지한다', async () => {
    const rec = install({ existingUser: { ...APPROVED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'approved@example.com' }) as any,
      res,
    );

    expect(rec.userSaves).toHaveLength(0);
    expectInvitationRequired(res);
  });
});

// ─── C. 은퇴한 입력 — 조용히 무시하지 않고 명시 코드로 거절한다 (§18) ───────

describe('C. 신규 생성 · 비밀번호 경로는 은퇴했다', () => {
  // New emails cannot create accounts through legacy direct assignment.
  it('미가입 email → 400 OPERATOR_INVITATION_REQUIRED (users 를 만들지 않는다)', async () => {
    const rec = install({ existingUser: null });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'brand-new@example.com' }) as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('OPERATOR_INVITATION_REQUIRED');
    // 어떤 행도 쓰지 않는다.
    expect(rec.userSaves).toHaveLength(0);
    expect(rec.memberships).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
  });

  it('body 에 password 가 있으면 400 PASSWORD_NOT_ALLOWED_HERE — 부분 수용도 하지 않는다', async () => {
    const rec = install({ existingUser: { ...APPROVED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'approved@example.com', password: 'InitialPw123!' }) as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].code).toBe('PASSWORD_NOT_ALLOWED_HERE');
    // 비밀번호를 무시하고 역할만 부여하는 silent fallback 이 아니다.
    expect(assignRoleMock).not.toHaveBeenCalled();
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(rec.userSaves).toHaveLength(0);
    expect(rec.memberships).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
  });
});
