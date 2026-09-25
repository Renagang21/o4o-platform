/**
 * `POST /admin/users` 운영자 등록 계약 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §18
 *
 * 이 경로에서 **은퇴한 것**을 회귀로 고정한다.
 *   - 비밀번호 수신 → users.password / service_credentials 생성   (400 PASSWORD_NOT_ALLOWED_HERE)
 *   - 미가입 email 로 신규 user 생성                                (400 USER_SIGNUP_REQUIRED)
 * 남는 것은 **기존 사용자에게 역할·membership 을 추가**하는 경로 하나뿐이며, 그 경로도
 * credential 을 만들지 않는다. 대체 경로는 `POST /admin/operator-assignments` · `POST /admin/operator-invitations`.
 *
 * (이전 버전 WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1 의 credential 생성 계약은
 *  Google Identity 전환으로 폐기됐다. 대상 서비스 확정 계약만 그대로 유효해 아래 §1 로 남는다.)
 */
import 'reflect-metadata';

const assignRoleMock = jest.fn(async () => ({}));
const transactionMock = jest.fn();
const getRepositoryMock = jest.fn();

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

import { AdminUserController, resolveOperatorTargetServiceKey } from '../AdminUserController.js';

// ─── 테스트용 stub ───────────────────────────────────────────────────────────

interface Recorded {
  users: any[];
  memberships: any[];
  credentials: any[];
  roles: Array<{ userId: string; role: string; inTransaction: boolean }>;
  transactionCommitted: boolean;
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

/** 트랜잭션 stub — 콜백이 던지면 기록을 버린다(롤백 시뮬레이션). */
function installDataSource(opts: {
  existingUser?: any;
  existingCredential?: any;
  existingMembership?: any;
}): Recorded {
  const rec: Recorded = { users: [], memberships: [], credentials: [], roles: [], transactionCommitted: false };

  getRepositoryMock.mockImplementation(() => ({
    findOne: jest.fn(async () => opts.existingUser ?? null),
  }));

  assignRoleMock.mockImplementation(async (input: any, manager?: unknown) => {
    (rec as any)._pendingRoles ??= [];
    (rec as any)._pendingRoles.push({ userId: input.userId, role: input.role, inTransaction: !!manager });
    return {};
  });

  transactionMock.mockImplementation(async (cb: any) => {
    const pendingUsers: any[] = [];
    const pendingMemberships: any[] = [];
    const pendingCredentials: any[] = [];
    (rec as any)._pendingRoles = [];

    const manager = {
      getRepository: (target: any) => {
        const name = typeof target === 'string' ? target : target?.name;
        if (name === 'ServiceMembership') return makeRepoStub(pendingMemberships, opts.existingMembership ?? null);
        if (name === 'ServiceCredential') return makeRepoStub(pendingCredentials, opts.existingCredential ?? null);
        return makeRepoStub(pendingUsers, null); // User
      },
    };

    const result = await cb(manager); // 던지면 아래 반영을 건너뛴다 = 롤백
    rec.users.push(...pendingUsers);
    rec.memberships.push(...pendingMemberships);
    rec.credentials.push(...pendingCredentials);
    rec.roles.push(...((rec as any)._pendingRoles as Recorded['roles']));
    rec.transactionCommitted = true;
    return result;
  });

  return rec;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const body = (overrides: Record<string, unknown> = {}) => ({
  body: {
    email: 'ph-op@example.com',
    roles: ['pharmacy-hub:operator'],
    serviceKey: 'pharmacy-hub',
    ...overrides,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── 1. 대상 서비스 확정 ─────────────────────────────────────────────────────

describe('resolveOperatorTargetServiceKey — 대상 서비스는 하나다', () => {
  it('role prefix 를 canonical service_key 로 변환한다 (SSOT 위임)', () => {
    expect(resolveOperatorTargetServiceKey(['kpa:operator']).serviceKey).toBe('kpa-society');
    expect(resolveOperatorTargetServiceKey(['cosmetics:admin']).serviceKey).toBe('k-cosmetics');
    // pharmacy-hub 는 role prefix 와 canonical key 가 같다 — 로컬 매핑을 만들 이유가 없다.
    expect(resolveOperatorTargetServiceKey(['pharmacy-hub:operator']).serviceKey).toBe('pharmacy-hub');
  });

  it('platform · 무접두 legacy role 은 서비스 축 대상이 아니다', () => {
    expect(resolveOperatorTargetServiceKey(['platform:super_admin']).serviceKey).toBeNull();
    expect(resolveOperatorTargetServiceKey(['user']).serviceKey).toBeNull();
  });

  it('서로 다른 서비스가 섞이면 거절한다 (MULTI_SERVICE_NOT_ALLOWED)', () => {
    const r = resolveOperatorTargetServiceKey(['kpa:operator', 'neture:operator']);
    expect(r.serviceKey).toBeNull();
    expect(r.error?.code).toBe('MULTI_SERVICE_NOT_ALLOWED');
    expect(r.error?.status).toBe(400);
  });

  it('명시 serviceKey 가 role 파생 키와 다르면 거절한다 (SERVICE_KEY_MISMATCH)', () => {
    const r = resolveOperatorTargetServiceKey(['kpa:operator'], 'pharmacy-hub');
    expect(r.error?.code).toBe('SERVICE_KEY_MISMATCH');
  });

  it('명시 serviceKey 가 canonical 로 일치하면 통과한다', () => {
    expect(resolveOperatorTargetServiceKey(['kpa:operator'], 'kpa-society').error).toBeUndefined();
  });
});

// ─── 2. 은퇴한 계약 ──────────────────────────────────────────────────────────

describe('createUser — 비밀번호 경로 은퇴', () => {
  it('password 가 오면 아무것도 쓰지 않고 400 PASSWORD_NOT_ALLOWED_HERE', async () => {
    const rec = installDataSource({ existingUser: { id: 'user-1', email: 'ph-op@example.com' } });
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: 'InitialPw123!' }) as any, res);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(rec.users).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
    expect(rec.roles).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'PASSWORD_NOT_ALLOWED_HERE' });
  });

  // WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 초대 경로 은퇴 — 코드가 OPERATOR_INVITATION_REQUIRED 에서 USER_SIGNUP_REQUIRED 로 바뀌었다.
  it('미가입 email 이면 user 를 만들지 않고 400 USER_SIGNUP_REQUIRED', async () => {
    const rec = installDataSource({});
    const res = mockRes();

    await new AdminUserController().createUser(body() as any, res);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(rec.users).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'USER_SIGNUP_REQUIRED' });
  });

  it('대상 서비스가 모순이면 트랜잭션을 시작조차 하지 않는다', async () => {
    const rec = installDataSource({ existingUser: { id: 'user-1', email: 'ph-op@example.com' } });
    const res = mockRes();

    await new AdminUserController().createUser(
      body({ roles: ['kpa:operator', 'neture:operator'], serviceKey: undefined }) as any,
      res,
    );

    expect(transactionMock).not.toHaveBeenCalled();
    expect(rec.users).toHaveLength(0);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'MULTI_SERVICE_NOT_ALLOWED' });
  });
});

// ─── 3. 남은 경로: 기존 사용자 역할 추가 ─────────────────────────────────────

describe('createUser — 기존 사용자에게 서비스 운영자 역할 추가', () => {
  const EXISTING_USER = { id: 'user-1', email: 'ph-op@example.com' };

  it('User 를 새로 만들지 않고 role·membership 만 추가한다', async () => {
    const rec = installDataSource({ existingUser: EXISTING_USER });
    const res = mockRes();

    await new AdminUserController().createUser(body() as any, res);

    expect(rec.users).toHaveLength(0);
    expect(rec.roles).toEqual([
      expect.objectContaining({ userId: 'user-1', role: 'pharmacy-hub:operator', inTransaction: true }),
    ]);
    expect(rec.memberships).toHaveLength(1);
    expect(rec.memberships[0]).toMatchObject({ serviceKey: 'pharmacy-hub', status: 'active', role: 'operator' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('credential 은 어떤 경우에도 만들지 않는다 (NOT_APPLICABLE)', async () => {
    const rec = installDataSource({ existingUser: EXISTING_USER, existingCredential: null });
    const res = mockRes();

    await new AdminUserController().createUser(body() as any, res);

    expect(rec.credentials).toHaveLength(0);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      isExistingUser: true,
      passwordPolicy: 'KEEP_EXISTING_PASSWORD',
      credentialPolicy: 'NOT_APPLICABLE',
    });
  });

  it('기존 membership 은 상태를 승격하지 않고 그대로 보고한다', async () => {
    const rec = installDataSource({
      existingUser: EXISTING_USER,
      existingMembership: { userId: 'user-1', serviceKey: 'pharmacy-hub', status: 'suspended' },
    });
    const res = mockRes();

    await new AdminUserController().createUser(body() as any, res);

    expect(rec.memberships).toHaveLength(0); // 생성 0 — 기존 행을 건드리지 않는다
    expect(res.json.mock.calls[0][0]).toMatchObject({
      membershipPolicy: 'KEEP_EXISTING_STATUS',
      membershipStatuses: { 'pharmacy-hub': 'suspended' },
    });
  });
});
