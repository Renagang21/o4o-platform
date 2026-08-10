/**
 * WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1 — 등록 계약 회귀 가드
 *
 * 배경: `POST /admin/users` 는 User · role_assignments · service_memberships 까지만 만들고
 *   **service_credentials 를 만들지 않아** 등록된 서비스 운영자가 Identity V2 로 로그인할 수 없었다.
 *   또한 생성이 단일 트랜잭션이 아니라 중간 실패 시 부분 생성이 남았다.
 *
 * 이 테스트는 DB 없이(repository/트랜잭션 stub) 다음 계약을 고정한다.
 *   - 대상 서비스는 하나로 확정된다(다중 서비스 거절, 명시 serviceKey 불일치 거절)
 *   - 신규 등록은 **하나의 트랜잭션** 안에서 User·role·membership·credential 을 만든다
 *   - 신규 등록의 credential passwordHash 와 users.password 는 같은 hash 다 (L1/L2 계약)
 *   - 기존 credential 은 절대 덮어쓰지 않는다 (KEEP_EXISTING_CREDENTIAL)
 *   - credential 이 없는데 초기 비밀번호가 없으면 트랜잭션이 롤백된다 (부분 생성 0)
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

import {
  AdminUserController,
  resolveOperatorTargetServiceKey,
  SERVICE_PASSWORD_MIN_LENGTH,
} from '../AdminUserController.js';

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

/**
 * 트랜잭션 stub — 콜백이 던지면 기록을 **버린다**(롤백 시뮬레이션).
 * 커밋된 경우에만 rec 에 반영되므로 "부분 생성 0" 을 그대로 검사할 수 있다.
 */
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
    password: 'InitialPw123!',
    firstName: '길동',
    lastName: '홍',
    name: '홍 길동',
    roles: ['pharmacy-hub:operator'],
    serviceKey: 'pharmacy-hub',
    ...overrides,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  hashPasswordMock.mockImplementation(async (p: string) => `hashed:${p}`);
});

// ─── 1. 대상 서비스 확정 ─────────────────────────────────────────────────────

describe('resolveOperatorTargetServiceKey — 대상 서비스는 하나다', () => {
  it('role prefix 를 canonical service_key 로 변환한다 (SSOT 위임)', () => {
    expect(resolveOperatorTargetServiceKey(['kpa:operator']).serviceKey).toBe('kpa-society');
    expect(resolveOperatorTargetServiceKey(['cosmetics:admin']).serviceKey).toBe('k-cosmetics');
    // pharmacy-hub 는 role prefix 와 canonical key 가 같다 — 로컬 매핑을 만들 이유가 없다.
    expect(resolveOperatorTargetServiceKey(['pharmacy-hub:operator']).serviceKey).toBe('pharmacy-hub');
  });

  it('platform · 무접두 legacy role 은 서비스 credential 대상이 아니다', () => {
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

// ─── 2. 신규 사용자 등록 ─────────────────────────────────────────────────────

describe('createUser — 신규 서비스 운영자 등록', () => {
  it('하나의 트랜잭션에서 User·role·membership·credential 을 만든다', async () => {
    const rec = installDataSource({});
    const res = mockRes();

    await new AdminUserController().createUser(body() as any, res);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(rec.transactionCommitted).toBe(true);
    expect(rec.users).toHaveLength(1);
    expect(rec.memberships).toHaveLength(1);
    expect(rec.memberships[0]).toMatchObject({ serviceKey: 'pharmacy-hub', status: 'active', role: 'operator' });
    expect(rec.credentials).toHaveLength(1);
    expect(rec.credentials[0]).toMatchObject({ serviceKey: 'pharmacy-hub' });
    // role 도 트랜잭션 manager 로 기록돼야 롤백 대상이 된다 (F9 write 경로는 그대로 하나).
    expect(rec.roles).toEqual([
      expect.objectContaining({ role: 'pharmacy-hub:operator', inTransaction: true }),
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: true,
      serviceKey: 'pharmacy-hub',
      credentialPolicy: 'CREATED',
    });
  });

  it('users.password(L1) 와 서비스 credential(L2) 은 같은 hash 다', async () => {
    // users.password 는 NOT NULL 이라 생략할 수 없다. 서비스 로그인 원본은 credential 이며
    // users.password 는 같은 값의 초기값이라는 계약을 여기서 고정한다(일반 가입 경로와 동일).
    const rec = installDataSource({});
    await new AdminUserController().createUser(body() as any, mockRes());

    expect(rec.users[0].password).toBe('hashed:InitialPw123!');
    expect(rec.credentials[0].passwordHash).toBe('hashed:InitialPw123!');
  });

  it('비밀번호가 없으면 아무것도 쓰지 않고 400 SERVICE_PASSWORD_REQUIRED', async () => {
    const rec = installDataSource({});
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: undefined }) as any, res);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(rec.users).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'SERVICE_PASSWORD_REQUIRED' });
  });

  it(`비밀번호가 ${SERVICE_PASSWORD_MIN_LENGTH}자 미만이면 거절한다`, async () => {
    installDataSource({});
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: 'short' }) as any, res);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('대상 서비스가 모순이면 트랜잭션을 시작조차 하지 않는다', async () => {
    const rec = installDataSource({});
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

// ─── 3. 기존 사용자 권한 추가 ────────────────────────────────────────────────

describe('createUser — 기존 사용자에게 서비스 운영자 권한 추가', () => {
  const EXISTING_USER = { id: 'user-1', email: 'ph-op@example.com', firstName: '길동', lastName: '홍' };

  it('User 를 새로 만들지 않고 role·membership 만 추가한다', async () => {
    const rec = installDataSource({
      existingUser: EXISTING_USER,
      existingCredential: { userId: 'user-1', serviceKey: 'pharmacy-hub' },
    });
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: undefined }) as any, res);

    expect(rec.users).toHaveLength(0);
    expect(rec.roles).toEqual([expect.objectContaining({ userId: 'user-1', inTransaction: true })]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('기존 서비스 credential 은 덮어쓰지 않는다 (KEEP_EXISTING_CREDENTIAL)', async () => {
    const rec = installDataSource({
      existingUser: EXISTING_USER,
      existingCredential: { userId: 'user-1', serviceKey: 'pharmacy-hub', passwordHash: 'hashed:OLD' },
    });
    const res = mockRes();

    // 비밀번호를 입력해도 기존 credential 이 있으면 유지한다.
    await new AdminUserController().createUser(body({ password: 'BrandNewPw123!' }) as any, res);

    expect(rec.credentials).toHaveLength(0);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      isExistingUser: true,
      passwordPolicy: 'KEEP_EXISTING_PASSWORD',
      credentialPolicy: 'KEEP_EXISTING_CREDENTIAL',
    });
  });

  it('credential 이 없으면 명시적 초기 비밀번호로 생성한다 (CREATED)', async () => {
    const rec = installDataSource({ existingUser: EXISTING_USER, existingCredential: null });
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: 'InitialPw123!' }) as any, res);

    expect(rec.credentials).toHaveLength(1);
    expect(rec.credentials[0]).toMatchObject({
      userId: 'user-1',
      serviceKey: 'pharmacy-hub',
      passwordHash: 'hashed:InitialPw123!',
    });
    expect(res.json.mock.calls[0][0]).toMatchObject({ credentialPolicy: 'CREATED' });
  });

  it('credential 이 없는데 초기 비밀번호도 없으면 role·membership 까지 롤백한다 (부분 생성 0)', async () => {
    const rec = installDataSource({ existingUser: EXISTING_USER, existingCredential: null });
    const res = mockRes();

    await new AdminUserController().createUser(body({ password: undefined }) as any, res);

    expect(rec.transactionCommitted).toBe(false);
    expect(rec.roles).toHaveLength(0);
    expect(rec.memberships).toHaveLength(0);
    expect(rec.credentials).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'SERVICE_PASSWORD_REQUIRED' });
  });
});
