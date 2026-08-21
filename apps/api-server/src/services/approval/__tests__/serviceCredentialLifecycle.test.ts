/**
 * WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1
 *
 * membership 수명주기와 `service_credentials` 의 관계를 계약으로 고정한다.
 *
 * 고정하는 사실:
 *  1) hard delete — 삭제한 membership 과 **같은 서비스 범위의 credential 만** 폐기한다.
 *     (2026-08-21 이전 구현은 credential 을 남겨 orphan 28행을 만들었다 — 재현 테스트)
 *  2) hard delete (platform admin) — 모든 membership 을 지우므로 모든 credential 을 폐기한다.
 *  3) soft delete / withdraw / suspend — credential 을 **유지**한다.
 *     reactivateMembership 이 같은 비밀번호로 접근을 되살리는 것이 설계된 동작이기 때문이다.
 *  4) 서비스 A 를 hard delete 해도 서비스 B 의 credential 은 남는다 (교차 영향 0).
 *
 * SQL 문자열을 캡처해 검증한다 — DB 접속 없음.
 */

const queries: { sql: string; params: any[] }[] = [];

const queryRunner = {
  connect: jest.fn(async () => undefined),
  startTransaction: jest.fn(async () => undefined),
  commitTransaction: jest.fn(async () => undefined),
  rollbackTransaction: jest.fn(async () => undefined),
  release: jest.fn(async () => undefined),
  query: jest.fn(async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    // 서비스 경계 검사(SELECT 1 FROM service_memberships ... LIMIT 1) 는 통과시키고,
    // STEP H4 의 잔여 membership 조회는 "없음"으로 답한다.
    if (/^\s*SELECT 1 FROM service_memberships/i.test(sql)) {
      return /LIMIT 1$/i.test(sql.trim()) && params.length === 2 ? [{ '?column?': 1 }] : [];
    }
    if (/FROM kpa_members/i.test(sql)) return [];
    return [];
  }),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { createQueryRunner: () => queryRunner },
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { MembershipApprovalService } from '../MembershipApprovalService.js';

const service = new MembershipApprovalService();
const USER = 'user-1';

const credentialWrites = () =>
  queries.filter((q) => /service_credentials/i.test(q.sql));

const membershipDeletes = () =>
  queries.filter((q) => /^\s*DELETE FROM service_memberships/i.test(q.sql));

beforeEach(() => {
  queries.length = 0;
  queryRunner.query.mockClear();
});

describe('service_credentials 수명주기 — hard delete', () => {
  it('서비스 범위 hard delete 는 같은 serviceKey 의 credential 만 삭제한다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['kpa-society'],
      mode: 'hard',
    });

    const credQ = credentialWrites();
    expect(credQ).toHaveLength(1);
    expect(credQ[0].sql).toMatch(/DELETE FROM service_credentials/i);
    expect(credQ[0].sql).toMatch(/service_key = ANY\(\$2\)/i);
    expect(credQ[0].params).toEqual([USER, ['kpa-society']]);
  });

  it('credential 삭제 범위는 membership 삭제 범위와 정확히 같다 (교차 서비스 영향 0)', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['neture'],
      mode: 'hard',
    });

    const smDel = membershipDeletes();
    const credDel = credentialWrites();
    expect(smDel).toHaveLength(1);
    expect(credDel).toHaveLength(1);
    expect(credDel[0].params).toEqual(smDel[0].params);
  });

  it('platform admin hard delete 는 전 서비스 membership 과 credential 을 함께 폐기한다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: true,
      serviceKeys: [],
      mode: 'hard',
    });

    const credQ = credentialWrites();
    expect(credQ).toHaveLength(1);
    expect(credQ[0].sql).toMatch(/DELETE FROM service_credentials WHERE user_id = \$1/i);
    expect(credQ[0].sql).not.toMatch(/service_key/i);
    expect(credQ[0].params).toEqual([USER]);
  });

  it('hard delete 후에도 users row 는 삭제하지 않는다 (Identity 보존)', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: true,
      serviceKeys: [],
      mode: 'hard',
    });

    expect(queries.some((q) => /DELETE FROM users/i.test(q.sql))).toBe(false);
    expect(
      queries.some((q) => /UPDATE users SET status = 'deleted'/i.test(q.sql)),
    ).toBe(true);
  });

  it('orphan 재현 방지 — hard delete 트랜잭션에 credential 삭제가 반드시 포함된다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['glycopharm'],
      mode: 'hard',
    });

    // membership 을 지우면서 credential 을 남기면 "membership 0 + credential 존재" orphan 이 된다.
    expect(membershipDeletes().length).toBeGreaterThan(0);
    expect(credentialWrites().length).toBeGreaterThan(0);
  });
});

describe('service_credentials 수명주기 — soft delete / withdraw', () => {
  it('soft delete 는 credential 을 건드리지 않는다 (reactivate 로 같은 비밀번호 복구)', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['kpa-society'],
      mode: 'soft',
    });

    expect(credentialWrites()).toHaveLength(0);
    expect(
      queries.some((q) => /UPDATE service_memberships SET status = 'withdrawn'/i.test(q.sql)),
    ).toBe(true);
  });

  it('withdrawMembership 은 credential 을 유지한다', async () => {
    queryRunner.query.mockImplementationOnce(async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      return [{ id: 'm-1', user_id: USER, service_key: 'kpa-society', role: 'member', status: 'active' }];
    });

    await service.withdrawMembership({
      userId: USER,
      withdrawnBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['kpa-society'],
    } as any);

    expect(credentialWrites()).toHaveLength(0);
  });

  it('suspendMembership 은 credential 을 유지한다', async () => {
    queryRunner.query.mockImplementationOnce(async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      return [{ id: 'm-1', user_id: USER, service_key: 'kpa-society', role: 'member', status: 'active' }];
    });

    await service.suspendMembership({
      userId: USER,
      suspendedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['kpa-society'],
    } as any);

    expect(credentialWrites()).toHaveLength(0);
  });
});
