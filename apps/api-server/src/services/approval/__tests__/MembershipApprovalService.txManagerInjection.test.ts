/**
 * WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
 *
 * MembershipApprovalService 의 **호출자 transaction 참여 계약**을 고정한다.
 *
 * 계약:
 *   - `manager` 주입 시: 자체 queryRunner 를 만들지 않고(별도 connection 0),
 *     begin / commit / rollback 을 수행하지 않으며, 모든 SQL 이 주입된 executor 로 나간다.
 *     실패는 그대로 throw 되어 호출자 transaction 이 rollback 을 결정한다.
 *   - `manager` 미주입 시: 기존 자체 transaction 동작(connect → start → commit / rollback → release) 유지.
 *   - 대상 행이 없으면 두 경로 모두 null 을 반환한다. 자체 경로만 rollback 을 수행한다.
 */

type Row = Record<string, any>;

let memberships: Row[] = [];
let failOn: RegExp | null = null;
const runnerQueries: string[] = [];
const managerQueries: string[] = [];

function driverShape(sql: string, rows: Row[]): any {
  const command = sql.trim().split(/\s+/)[0].toUpperCase();
  if (command === 'UPDATE' || command === 'DELETE') return [rows, rows.length];
  return rows;
}

function runQuery(sql: string, params: any[] = []): any {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (failOn && failOn.test(s)) throw new Error('INJECTED_FAILURE');

  if (s.startsWith('SELECT') && s.includes('FROM service_memberships')) {
    const [userId, keys] = params;
    const rows = memberships.filter(
      (m) => m.user_id === userId && (keys === undefined || (keys as string[]).includes(m.service_key)),
    );
    return driverShape(s, rows.map((m) => ({ ...m })));
  }
  return driverShape(s, []);
}

const fakeQueryRunner = {
  connect: jest.fn(async () => {}),
  startTransaction: jest.fn(async () => {}),
  commitTransaction: jest.fn(async () => {}),
  rollbackTransaction: jest.fn(async () => {}),
  release: jest.fn(async () => {}),
  query: jest.fn(async (sql: string, params?: any[]) => {
    runnerQueries.push(sql.replace(/\s+/g, ' ').trim());
    return runQuery(sql, params);
  }),
};

const createQueryRunner = jest.fn(() => fakeQueryRunner);

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    createQueryRunner: () => createQueryRunner(),
    query: jest.fn(async (sql: string, params?: any[]) => runQuery(sql, params)),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { MembershipApprovalService } from '../MembershipApprovalService.js';

const service = new MembershipApprovalService();

/** 호출자 transaction manager 더블 (TypeORM EntityManager 의 query 만 구조적으로 만족) */
const manager = {
  query: jest.fn(async (sql: string, params?: any[]) => {
    managerQueries.push(sql.replace(/\s+/g, ' ').trim());
    return runQuery(sql, params);
  }),
};

function seed(rows: Row[] = [{ id: 'm-1', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: 'active' }]) {
  memberships = rows;
  failOn = null;
  runnerQueries.length = 0;
  managerQueries.length = 0;
  jest.clearAllMocks();
}

const KPA = { userId: 'u1', isPlatformAdmin: false, serviceKeys: ['kpa-society'] };

const call = (method: 'suspend' | 'withdraw' | 'reactivate', withManager: boolean) => {
  const injected = withManager ? { manager: manager as any } : {};
  if (method === 'suspend') {
    return service.suspendMembership({ ...KPA, suspendedBy: 'op-1', ...injected });
  }
  if (method === 'withdraw') {
    return service.withdrawMembership({ ...KPA, withdrawnBy: 'op-1', ...injected });
  }
  return service.reactivateMembership({ ...KPA, reactivatedBy: 'op-1', ...injected });
};

describe.each(['suspend', 'withdraw', 'reactivate'] as const)('%sMembership — transaction 소유권', (method) => {
  const seedStatus = method === 'reactivate' ? 'suspended' : 'active';
  const seedRows = [{ id: 'm-1', user_id: 'u1', service_key: 'kpa-society', role: 'member', status: seedStatus }];

  describe('manager 주입 (호출자 transaction 참여)', () => {
    it('자체 queryRunner 를 만들지 않고 주입된 executor 로만 SQL 을 실행한다', async () => {
      seed(seedRows);

      const result = await call(method, true);

      expect(result).not.toBeNull();
      expect(createQueryRunner).not.toHaveBeenCalled();
      expect(runnerQueries).toEqual([]);
      expect(managerQueries.length).toBeGreaterThan(0);
    });

    it('begin / commit / rollback 을 수행하지 않는다', async () => {
      seed(seedRows);

      await call(method, true);

      expect(fakeQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(fakeQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(fakeQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('중간 write 실패는 삼키지 않고 그대로 throw 한다 (rollback 은 호출자 소유)', async () => {
      seed(seedRows);
      failOn = /UPDATE service_memberships/i;

      await expect(call(method, true)).rejects.toThrow('INJECTED_FAILURE');
      expect(fakeQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('대상 행이 없으면 rollback 없이 null 을 반환한다', async () => {
      seed([]);

      await expect(call(method, true)).resolves.toBeNull();
      expect(fakeQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });
  });

  describe('manager 미주입 (기존 독립 소비처 회귀)', () => {
    it('기존대로 자체 transaction 을 열고 commit 한다', async () => {
      seed(seedRows);

      const result = await call(method, false);

      expect(result).not.toBeNull();
      expect(fakeQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(fakeQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(fakeQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(fakeQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(fakeQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(managerQueries).toEqual([]);
    });

    it('중간 write 실패 시 기존대로 rollback 후 throw 한다', async () => {
      seed(seedRows);
      failOn = /UPDATE service_memberships/i;

      await expect(call(method, false)).rejects.toThrow('INJECTED_FAILURE');
      expect(fakeQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(fakeQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(fakeQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('대상 행이 없으면 기존대로 rollback 후 null 을 반환한다', async () => {
      seed([]);

      await expect(call(method, false)).resolves.toBeNull();
      expect(fakeQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(fakeQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(fakeQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });
});
