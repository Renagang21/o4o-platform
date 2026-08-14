/**
 * WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1 — membership 상태 보존 계약
 *
 * 계약: **ensure membership existence ≠ approve / reactivate membership**
 *
 * `POST /admin/users` 는 기존 사용자에게 role·credential 을 추가하는 upsert 경로다.
 * 이 경로가 기존 `service_memberships.status` 를 `active` 로 승격하면
 * 정지(suspended)·반려(rejected)·탈퇴(withdrawn)·승인대기(pending) 회원이
 * **역할 추가만으로 서비스 접근 권한을 되찾는다.**
 *
 * membership 상태 변경은 canonical 경로(`MembershipApprovalService`
 * approve/reject/suspend/reactivate — approved_by·approved_at·role 동기화 포함)만 담당한다.
 *
 * 고정하는 계약:
 *   - membership 없음 → 신규 생성(status='active') = 기존 계약 유지
 *   - membership 있음 → status·role 을 **건드리지 않는다** (save 호출 0회)
 *   - 응답에 membershipPolicy 로 어떤 처리가 있었는지 명시한다(조용한 동작 금지)
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
  membershipSaves: any[];
  credentials: any[];
  userSaves: any[];
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

function install(opts: { existingUser?: any; existingMembership?: any; existingCredential?: any }): Recorded {
  const rec: Recorded = { membershipSaves: [], credentials: [], userSaves: [] };

  getRepositoryMock.mockImplementation(() => ({
    findOne: jest.fn(async () => opts.existingUser ?? null),
  }));

  transactionMock.mockImplementation(async (cb: any) => {
    const manager = {
      getRepository: (target: any) => {
        const name = typeof target === 'string' ? target : target?.name;
        if (name === 'ServiceMembership') return makeRepoStub(rec.membershipSaves, opts.existingMembership ?? null);
        if (name === 'ServiceCredential') return makeRepoStub(rec.credentials, opts.existingCredential ?? null);
        return makeRepoStub(rec.userSaves, null);
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

const EXISTING_USER = {
  id: 'user-1',
  email: 'existing@example.com',
  status: 'approved',
  isActive: true,
  firstName: '길동',
  lastName: '홍',
};

const membership = (status: string) => ({
  id: 'sm-1',
  userId: 'user-1',
  serviceKey: 'kpa-society',
  status,
  role: 'user',
});

const body = (overrides: Record<string, unknown> = {}) => ({
  body: {
    email: 'existing@example.com',
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

// ─── 1. 비-active membership 은 role 추가로 승격되지 않는다 ──────────────────

describe('기존 membership 상태는 role 추가로 바뀌지 않는다', () => {
  const NON_ACTIVE: Array<'pending' | 'suspended' | 'rejected' | 'withdrawn'> = [
    'pending',
    'suspended',
    'rejected',
    'withdrawn',
  ];

  it.each(NON_ACTIVE)('기존 %s → role 추가 → 그대로 유지 (save 호출 0회)', async (status) => {
    const rec = install({
      existingUser: { ...EXISTING_USER },
      existingMembership: membership(status),
      existingCredential: { userId: 'user-1', serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    // membership repository 에 어떤 write 도 일어나면 안 된다.
    expect(rec.membershipSaves).toHaveLength(0);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.membershipPolicy).toBe('KEEP_EXISTING_STATUS');
  });

  it('기존 active → role 추가 → active 유지 (기존 동작 보존)', async () => {
    const rec = install({
      existingUser: { ...EXISTING_USER },
      existingMembership: membership('active'),
      existingCredential: { userId: 'user-1', serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    expect(rec.membershipSaves).toHaveLength(0);
    expect(res.json.mock.calls[0][0].membershipPolicy).toBe('KEEP_EXISTING_STATUS');
  });

  it('기존 membership 의 role 도 덮어쓰지 않는다', async () => {
    const existing = membership('suspended');
    install({
      existingUser: { ...EXISTING_USER },
      existingMembership: existing,
      existingCredential: { userId: 'user-1', serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    expect(existing.status).toBe('suspended');
    expect(existing.role).toBe('user'); // 'operator' 로 바뀌지 않는다
  });
});

// ─── 2. membership 없음 → 신규 생성 계약 유지 ────────────────────────────────

describe('membership 이 없으면 기존 신규 생성 계약을 유지한다', () => {
  it('기존 사용자 + membership 없음 → active 로 생성', async () => {
    const rec = install({
      existingUser: { ...EXISTING_USER },
      existingMembership: null,
      existingCredential: { userId: 'user-1', serviceKey: 'kpa-society' },
    });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    expect(rec.membershipSaves).toHaveLength(1);
    expect(rec.membershipSaves[0]).toMatchObject({
      userId: 'user-1',
      serviceKey: 'kpa-society',
      status: 'active',
      role: 'operator',
    });
    expect(res.json.mock.calls[0][0].membershipPolicy).toBe('CREATED');
  });

  it('신규 사용자 → membership active 로 생성 (기존 계약 유지)', async () => {
    const rec = install({ existingUser: null, existingMembership: null });
    const res = mockRes();
    await new AdminUserController().createUser(
      body({ email: 'brand-new@example.com' }) as any,
      res,
    );

    expect(rec.membershipSaves).toHaveLength(1);
    expect(rec.membershipSaves[0].status).toBe('active');
  });
});

// ─── 3. credential 추가만으로 membership 이 승인되지 않는다 ──────────────────

describe('credential 생성과 membership 승인은 분리된다', () => {
  it('credential 이 새로 생겨도 기존 suspended membership 은 그대로다', async () => {
    const rec = install({
      existingUser: { ...EXISTING_USER },
      existingMembership: membership('suspended'),
      existingCredential: null, // credential 은 신규 생성됨
    });
    const res = mockRes();
    await new AdminUserController().createUser(body() as any, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.credentialPolicy).toBe('CREATED');
    expect(rec.credentials).toHaveLength(1);
    // credential 이 생겼어도 membership 은 승격되지 않는다
    expect(rec.membershipSaves).toHaveLength(0);
    expect(payload.membershipPolicy).toBe('KEEP_EXISTING_STATUS');
  });
});
