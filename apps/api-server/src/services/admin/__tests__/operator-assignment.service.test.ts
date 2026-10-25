/**
 * 운영자 직접 지정 계약 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§6·§21
 *
 * 지정 대상은 언제나 **userId** 다. email 로 사람을 찾아 넣지 않는다(email ≠ Identity Key).
 * 쓰는 것은 role_assignments (+ 없을 때만 service_memberships) 뿐이다.
 */
import 'reflect-metadata';
import { getCachedRoles, setCachedRoles } from '../../../modules/auth/utils/role-cache.js';

const assignRoleMock = jest.fn(async () => ({}));

// Demo 판정은 "Demo 아님" 으로 고정 (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 근거는 support 헬퍼).
jest.mock('../../auth/demo-account.service.js', () =>
  jest.requireActual('../../../__tests__/support/not-demo-account.js').notDemoAccountModule(),
);

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

describe('legacy assign requires email confirmation', () => {
  it.each([true,false])('never grants immediately (Google linked=%s)', async linked => {
    const h=makeHarness({user:USER,linked:linked?LINKED:null});
    await expect(h.service.assign({userId:USER.id,serviceKey:'lecture',role:'lecture:operator'})).rejects.toMatchObject({code:'OPERATOR_INVITATION_REQUIRED'});
    expect(assignRoleMock).not.toHaveBeenCalled();expect(h.dataSource.transaction).not.toHaveBeenCalled();expect(h.writes.memberships).toHaveLength(0);
  });
  it('continues to reject platform roles',async()=>{
    const h=makeHarness();await expect(h.service.assign({userId:USER.id,serviceKey:'platform',role:'platform:super_admin'})).rejects.toBeInstanceOf(OperatorRoleContractError);
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


describe('collaborator assignment preserves the canonical account and membership state', () => {
  it.each(['pharmacy','carepharm','megapharm','pharmcoop'].flatMap(key => ['admin','operator'].map(level => `neture:${key}_${level}`)))('%s never grants Neture-wide administration or activates suspended membership', async role => {
    const h = makeHarness({ user: USER, linked: LINKED,
      existingMembership: { userId: 'user-1', serviceKey: 'neture', status: 'suspended' } });
    await expect(h.service.assign({ userId:'user-1',serviceKey:'neture',role }))
      .rejects.toMatchObject({code:'OPERATOR_INVITATION_REQUIRED'});
    expect(assignRoleMock).not.toHaveBeenCalled();
    expect(h.writes.memberships).toEqual([]);
    expect(h.writes.users).toEqual([]);
    expect(h.writes.linkedAccounts).toEqual([]);
  });
});


it('legacy central assignment refuses immediate writes without consuming cached roles',async()=>{
  const h=makeHarness({user:USER,linked:LINKED});setCachedRoles(USER.id,[]);
  await expect(h.service.assign({userId:USER.id,serviceKey:'neture',role:'neture:operator'}))
    .rejects.toMatchObject({code:'OPERATOR_INVITATION_REQUIRED'});
  expect(h.dataSource.transaction).not.toHaveBeenCalled();
});
