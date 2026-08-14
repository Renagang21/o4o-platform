/**
 * WO-O4O-ADMIN-USER-UPSERT-STATUS-PRESERVATION-V1 — 계정 상태 보존 계약 회귀 가드
 *
 * 계약: **기존 사용자 upsert ≠ 계정 상태 재승인**
 *
 * `POST /admin/users` 는 기존 사용자에게 role·service_membership·service_credential 을
 * 추가하는 경로다. 이 경로가 user-global `status` / `isActive` 를 바꾸면
 * 정지(suspended) 계정이 역할 추가만으로 조용히 되살아난다.
 *
 * 조사 결과(census) 현재 구현은 기존 사용자 분기에서 users 행을 저장하지 않으므로
 * 상태를 바꾸지 않는다. 본 테스트는 그 계약을 **고정**해 향후 회귀를 막는다.
 *   - 기존 사용자 분기에서 User repository 의 save/insert 가 호출되지 않는다
 *   - 응답의 user.status 는 요청 body 의 status 가 아니라 **기존 값**이다
 *   - body 에 status/isActive 를 실어 보내도 기존 사용자 상태는 바뀌지 않는다
 *     (상태 변경은 PATCH /admin/users/:id/status 전용 계약)
 *   - 신규 사용자는 기존 계약대로 초기 status 를 가진다
 */
import 'reflect-metadata';

const hashPasswordMock = jest.fn(async (p: string) => `hashed:${p}`);
const assignRoleMock = jest.fn(async () => ({}));
const transactionMock = jest.fn();
const getRepositoryMock = jest.fn();

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

const body = (overrides: Record<string, unknown> = {}) => ({
  body: {
    email: 'suspended@example.com',
    password: 'InitialPw123!',
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
    // membership/credential 은 정상적으로 추가된다 (기능은 살아 있다).
    expect(rec.memberships.length + rec.credentials.length).toBeGreaterThan(0);
  });

  it('응답의 status 는 기존 suspended 를 그대로 반영한다', async () => {
    install({ existingUser: { ...SUSPENDED_USER } });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.isExistingUser).toBe(true);
    expect(payload.user.status).toBe('suspended');
    expect(payload.user.isActive).toBe(false);
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
    const payload = res.json.mock.calls[0][0];
    expect(payload.user.status).toBe('suspended');
    expect(payload.user.isActive).toBe(false);
  });

  it('실제 회귀 케이스: 정지된 검증 계정에 kpa:store_owner 를 다시 부여해도 suspended 유지', async () => {
    // WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1 에서
    // 관측된 시나리오를 회귀 케이스로 고정한다.
    const rec = install({
      existingUser: { ...SUSPENDED_USER, email: 'o4o-smoke-mystore@example.com' },
      existingCredential: { userId: SUSPENDED_USER.id, serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'o4o-smoke-mystore@example.com', roles: ['kpa:store_owner'] }) as any,
      res,
    );

    expect(rec.userSaves).toHaveLength(0);
    const payload = res.json.mock.calls[0][0];
    expect(payload.user.status).toBe('suspended');
    // 기존 credential 은 덮어쓰지 않는다 (기존 계약 동시 확인)
    expect(payload.credentialPolicy).toBe('KEEP_EXISTING_CREDENTIAL');
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
    const payload = res.json.mock.calls[0][0];
    expect(payload.user.status).toBe('approved');
    expect(payload.user.isActive).toBe(true);
  });
});

// ─── C. 신규 사용자 — 초기 status 계약 유지 ──────────────────────────────────

describe('C. 신규 사용자 — 기존 초기 상태 계약을 유지한다', () => {
  it('status 미지정 시 기본 approved / isActive true 로 생성된다', async () => {
    const rec = install({ existingUser: null });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'brand-new@example.com' }) as any,
      res,
    );

    expect(rec.userSaves).toHaveLength(1);
    expect(rec.userSaves[0].status).toBe('approved');
    expect(rec.userSaves[0].isActive).toBe(true);
  });

  it('명시한 초기 status 는 신규 생성에서만 반영된다', async () => {
    const rec = install({ existingUser: null });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'brand-new-2@example.com', status: 'pending', isActive: false }) as any,
      res,
    );

    expect(rec.userSaves).toHaveLength(1);
    expect(rec.userSaves[0].status).toBe('pending');
    expect(rec.userSaves[0].isActive).toBe(false);
  });
});
