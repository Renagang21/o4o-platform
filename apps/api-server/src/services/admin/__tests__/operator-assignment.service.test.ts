/**
 * 운영자 직접 지정 계약 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§6·§21
 *
 * 지정 대상은 언제나 **userId** 다. email 로 사람을 찾아 넣지 않는다(email ≠ Identity Key).
 * 쓰는 것은 role_assignments (+ 없을 때만 service_memberships) 뿐이다.
 */
import 'reflect-metadata';

const assignRoleMock = jest.fn(async () => ({}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: (...args: unknown[]) => assignRoleMock(...(args as [])) },
}));

import { OperatorAssignmentService } from '../operator-assignment.service.js';
import { OperatorRoleContractError } from '../../../config/operator-role-catalog.js';

interface Writes { users: any[]; memberships: any[]; credentials: any[]; linkedAccounts: any[] }

function makeHarness(opts: {
  user?: any;
  linked?: any;
  existingMembership?: any;
  rawRows?: any[];
} = {}) {
  const writes: Writes = { users: [], memberships: [], credentials: [], linkedAccounts: [] };
  const qb: any = {
    leftJoin: () => qb,
    select: () => qb,
    addSelect: () => qb,
    where: () => qb,
    orderBy: () => qb,
    limit: jest.fn(() => qb),
    getRawMany: jest.fn(async () => opts.rawRows ?? []),
  };

  const repoFor = (target: any) => {
    const name = typeof target === 'string' ? target : target?.name;
    if (name === 'LinkedAccount') {
      return {
        findOne: jest.fn(async () => opts.linked ?? null),
        save: jest.fn(async (o: any) => { writes.linkedAccounts.push(o); return o; }),
      };
    }
    if (name === 'ServiceMembership') {
      return {
        findOne: jest.fn(async () => opts.existingMembership ?? null),
        create: (o: any) => ({ ...o }),
        save: jest.fn(async (o: any) => { writes.memberships.push(o); return o; }),
      };
    }
    if (name === 'ServiceCredential') {
      return {
        findOne: jest.fn(async () => null),
        create: (o: any) => ({ ...o }),
        save: jest.fn(async (o: any) => { writes.credentials.push(o); return o; }),
      };
    }
    return {
      findOne: jest.fn(async () => opts.user ?? null),
      create: (o: any) => ({ ...o }),
      save: jest.fn(async (o: any) => { writes.users.push(o); return o; }),
      createQueryBuilder: () => qb,
    };
  };

  const manager = { getRepository: repoFor };
  const dataSource = {
    getRepository: repoFor,
    transaction: jest.fn(async (cb: any) => cb(manager)),
  } as any;

  return { service: new OperatorAssignmentService(dataSource), writes, dataSource, qb };
}

const USER = { id: 'user-1', email: 'op@example.com' };
const LINKED = { id: 'la-1', userId: 'user-1', provider: 'google' };

beforeEach(() => jest.clearAllMocks());

describe('assign — 역할 부여', () => {
  it('Google 연결된 기존 사용자에게 role 과 membership 만 부여한다', async () => {
    const h = makeHarness({ user: USER, linked: LINKED });

    const r = await h.service.assign({ userId: 'user-1', serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator', assignedBy: 'admin-1' });

    expect(r).toMatchObject({
      userId: 'user-1',
      serviceKey: 'pharmacy-hub',
      role: 'pharmacy-hub:operator',
      rolePolicy: 'ASSIGNED',
      membershipPolicy: 'CREATED',
    });
    expect(assignRoleMock).toHaveBeenCalledWith(
      { userId: 'user-1', role: 'pharmacy-hub:operator', assignedBy: 'admin-1' },
      expect.anything(),
    );
    expect(h.writes.users).toHaveLength(0);
    expect(h.writes.credentials).toHaveLength(0);
    expect(h.writes.linkedAccounts).toHaveLength(0);
    expect(h.writes.memberships).toHaveLength(1);
  });

  it('전부 한 트랜잭션 안에서 일어난다', async () => {
    const h = makeHarness({ user: USER, linked: LINKED });
    await h.service.assign({ userId: 'user-1', serviceKey: 'kpa-society', role: 'kpa:operator' });
    expect(h.dataSource.transaction).toHaveBeenCalledTimes(1);
    // role prefix 'kpa' → canonical 'kpa-society' 로 membership 을 만든다.
    expect(h.writes.memberships[0]).toMatchObject({ serviceKey: 'kpa-society', status: 'active', role: 'operator' });
  });

  it('없는 사용자는 404 USER_NOT_FOUND — 만들지 않는다', async () => {
    const h = makeHarness({ user: null });
    await expect(h.service.assign({ userId: 'ghost', serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator' }))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    expect(h.writes.users).toHaveLength(0);
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('Google 연결이 없으면 409 GOOGLE_LINK_REQUIRED — 대신 연결해 주지 않는다', async () => {
    const h = makeHarness({ user: USER, linked: null });
    await expect(h.service.assign({ userId: 'user-1', serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator' }))
      .rejects.toMatchObject({ code: 'GOOGLE_LINK_REQUIRED', statusCode: 409 });
    expect(h.writes.linkedAccounts).toHaveLength(0);
    expect(h.writes.credentials).toHaveLength(0);
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('platform:super_admin 은 이 경로로 부여할 수 없다', async () => {
    const h = makeHarness({ user: USER, linked: LINKED });
    await expect(h.service.assign({ userId: 'user-1', serviceKey: 'platform', role: 'platform:super_admin' }))
      .rejects.toBeInstanceOf(OperatorRoleContractError);
    expect(h.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('role 과 serviceKey 가 어긋나면 SERVICE_KEY_MISMATCH — 트랜잭션 전에 걸린다', async () => {
    const h = makeHarness({ user: USER, linked: LINKED });
    await expect(h.service.assign({ userId: 'user-1', serviceKey: 'pharmacy-hub', role: 'kpa:operator' }))
      .rejects.toMatchObject({ code: 'SERVICE_KEY_MISMATCH' });
    expect(h.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('기존 membership 상태를 승격하지 않고 그대로 보고한다', async () => {
    const h = makeHarness({
      user: USER,
      linked: LINKED,
      existingMembership: { userId: 'user-1', serviceKey: 'pharmacy-hub', status: 'pending' },
    });
    const r = await h.service.assign({ userId: 'user-1', serviceKey: 'pharmacy-hub', role: 'pharmacy-hub:operator' });
    expect(h.writes.memberships).toHaveLength(0);
    expect(r).toMatchObject({ membershipPolicy: 'KEEP_EXISTING_STATUS', membershipStatuses: { 'pharmacy-hub': 'pending' } });
  });
});

describe('searchCandidates — 사람을 고르기 위한 검색', () => {
  it('2자 미만이면 조회하지 않는다', async () => {
    const h = makeHarness();
    expect(await h.service.searchCandidates('a')).toEqual([]);
    expect(await h.service.searchCandidates('  ')).toEqual([]);
    expect(h.qb.getRawMany).not.toHaveBeenCalled();
  });

  it('Google 연결 없는 사용자도 숨기지 않고 hasGoogleLink:false 로 보여준다', async () => {
    const h = makeHarness({
      rawRows: [
        { id: 'u1', email: 'a@example.com', name: '가', has_google: true },
        { id: 'u2', email: 'b@example.com', name: null, has_google: false },
      ],
    });
    expect(await h.service.searchCandidates('example')).toEqual([
      { userId: 'u1', email: 'a@example.com', name: '가', hasGoogleLink: true },
      { userId: 'u2', email: 'b@example.com', name: null, hasGoogleLink: false },
    ]);
  });

  it('limit 은 50 을 넘지 않는다', async () => {
    const h = makeHarness({ rawRows: [] });
    await h.service.searchCandidates('example', 500);
    expect(h.qb.limit).toHaveBeenCalledWith(50);
  });
});
