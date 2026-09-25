/**
 * WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1
 *
 * membership 수명주기와 `service_credentials` 의 관계를 계약으로 고정한다.
 *
 * ── 계약 변경 (WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 · 2026-09-24) ──
 * hard delete 의 `service_credentials` 동반 폐기는 **은퇴**했다(`MembershipApprovalService` STEP H1b).
 * 원래 orphan 문제("삭제된 membership 뒤에 과거 비밀번호가 살아남는다")는 password 축의 문제였고,
 * 그 축이 사라져 재현 조건이 없다. 테이블 자체는 Phase B 스키마 정리에서 제거한다.
 *
 * 그래서 이 spec 은 **계약을 지우지 않고 뒤집어 고정**한다 — credential write 경로가 되살아나면
 * (password 축 부활 신호) 이 테스트가 먼저 깨진다.
 *
 * 고정하는 사실:
 *  1) hard delete — membership 은 삭제하고 `service_credentials` 에는 **어떤 write 도 하지 않는다**.
 *  2) hard delete (platform admin) — 전 서비스 membership 을 지우되 credential write 0.
 *  3) soft delete / withdraw / suspend — credential 무접촉(종전과 동일 · 아래 describe 유지).
 *  4) users row 는 어떤 경우에도 물리 삭제하지 않는다 (Identity 보존).
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
  it('서비스 범위 hard delete 는 membership 만 지우고 credential 에는 write 하지 않는다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['kpa-society'],
      mode: 'hard',
    });

    const smDel = membershipDeletes();
    expect(smDel).toHaveLength(1);
    expect(smDel[0].params).toEqual([USER, ['kpa-society']]);
    // password 축 은퇴 — credential write 경로가 부활하면 여기서 먼저 깨진다.
    expect(credentialWrites()).toHaveLength(0);
  });

  it('credential write 0 은 서비스 범위와 무관하게 유지된다 (교차 서비스 영향 0)', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['neture'],
      mode: 'hard',
    });

    expect(membershipDeletes()).toHaveLength(1);
    expect(credentialWrites()).toHaveLength(0);
  });

  it('platform admin hard delete 는 전 서비스 membership 을 폐기하고 credential 은 무접촉이다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: true,
      serviceKeys: [],
      mode: 'hard',
    });

    // 전 서비스 membership 은 지우되 credential 은 건드리지 않는다(은퇴 계약).
    expect(membershipDeletes().length).toBeGreaterThan(0);
    expect(credentialWrites()).toHaveLength(0);
  });

  it('hard delete 후에도 users row 는 삭제하지 않고 **비활성화도 하지 않는다** (Identity 보존)', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: true,
      serviceKeys: [],
      mode: 'hard',
    });

    expect(queries.some((q) => /DELETE FROM users/i.test(q.sql))).toBe(false);

    // WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1:
    //   구 계약은 "남은 membership 이 0 이면 users 를 status='deleted' 로 내린다" 였고
    //   이 테스트가 그 UPDATE 의 **존재**를 단정했다. requireAuth 가 isActive 를 보므로
    //   결과는 계정 정지였고 Google 로그인까지 막혔다(2026-09-25 실측).
    //   users 는 전역 Identity, service_memberships 는 서비스 관계다 —
    //   관계가 0개가 되어도 Identity 는 존재할 수 있어야 한다.
    //   계약을 지우지 않고 **뒤집어** 고정한다: 부수효과가 되살아나면 여기서 먼저 깨진다.
    expect(
      queries.some((q) => /UPDATE users SET status = 'deleted'/i.test(q.sql)),
    ).toBe(false);
    expect(queries.some((q) => /UPDATE users SET[^;]*"isActive" = false/i.test(q.sql))).toBe(false);

    // membership 종료 자체는 그대로 일어난다(기능을 지운 것이 아니다).
    expect(membershipDeletes().length).toBeGreaterThan(0);
  });

  it('password 축 부활 감지 — hard delete 트랜잭션에 credential write 가 없다', async () => {
    await service.deleteMember({
      userId: USER,
      deletedBy: 'admin-1',
      isPlatformAdmin: false,
      serviceKeys: ['pharmacy-hub'],
      mode: 'hard',
    });

    // 구 계약은 "credential 을 함께 지워야 orphan 이 아니다" 였다. password 축이 은퇴한 뒤에는
    // credential 자체가 인증에 쓰이지 않으므로 orphan 이 성립하지 않고, 남은 행은 Phase B 에서 테이블과 함께 사라진다.
    // 여기서 credential write 가 다시 보이면 password 경로가 되살아났다는 뜻이다.
    expect(membershipDeletes().length).toBeGreaterThan(0);
    expect(credentialWrites()).toHaveLength(0);
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
