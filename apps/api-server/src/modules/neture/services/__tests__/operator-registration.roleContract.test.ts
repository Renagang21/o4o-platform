/**
 * WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1 (1)
 *
 * Neture 가입 승인(`approveRegistration`)이 **운영자·관리자 역할을 부여하지 않는다**는
 * 계약을 고정한다.
 *
 * 배경: 과거 `finalRole = neture:${rawRole}` 승격 분기가 있어
 *   `service_memberships.role` 이 'admin'/'operator' 이면 가입 승인만으로
 *   `neture:admin` / `neture:operator` 가 생성될 수 있었다.
 *   Neture 전용 운영자 API 은퇴(WO-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1)로
 *   입력 원천은 사라졌지만, 방어적으로 승격 자체를 차단한다.
 */

import { OperatorRegistrationService } from '../operator-registration.service.js';

interface FakeRunner {
  queries: Array<{ sql: string; params?: unknown[] }>;
  committed: boolean;
  rolledBack: boolean;
  released: boolean;
}

function createService(membershipRole: string) {
  const state: FakeRunner = { queries: [], committed: false, rolledBack: false, released: false };

  const queryRunner = {
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => {
      state.committed = true;
    }),
    rollbackTransaction: jest.fn(async () => {
      state.rolledBack = true;
    }),
    release: jest.fn(async () => {
      state.released = true;
    }),
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      state.queries.push({ sql, params });
      if (sql.includes('FROM service_memberships')) {
        return [{ id: 'sm-1', role: membershipRole }];
      }
      if (sql.includes('SELECT id, status FROM users')) {
        return [{ id: 'user-1', status: 'pending' }];
      }
      return [];
    }),
  };

  const dataSource = { createQueryRunner: () => queryRunner } as any;
  return { service: new OperatorRegistrationService(dataSource), state, queryRunner };
}

const roleAssignmentInserts = (state: FakeRunner) =>
  state.queries.filter((q) => q.sql.includes('INSERT INTO role_assignments'));

describe('approveRegistration — 가입 승인은 운영자·관리자를 부여하지 않는다', () => {
  it.each(['admin', 'operator', 'super_admin', 'neture:admin', 'neture:operator'])(
    "membership role '%s' 는 ROLE_PROMOTION_NOT_ALLOWED 로 거부한다",
    async (role) => {
      const { service, state } = createService(role);

      await expect(service.approveRegistration('user-1', 'approver-1')).rejects.toThrow(
        'ROLE_PROMOTION_NOT_ALLOWED',
      );

      // role_assignments 에 아무것도 쓰지 않는다
      expect(roleAssignmentInserts(state)).toHaveLength(0);
      // 트랜잭션은 롤백된다 — 회원 상태 변경도 남지 않는다
      expect(state.rolledBack).toBe(true);
      expect(state.committed).toBe(false);
      expect(state.released).toBe(true);
    },
  );

  it.each(['supplier', 'partner', 'member', 'customer'])(
    "정상 신청 역할 '%s' 는 그대로 부여한다(접두 정규화 없음)",
    async (role) => {
      const { service, state } = createService(role);

      await expect(service.approveRegistration('user-1', 'approver-1')).resolves.toEqual({
        success: true,
        userId: 'user-1',
      });

      const inserts = roleAssignmentInserts(state);
      expect(inserts).toHaveLength(1);
      // 저장되는 role 정본은 membership 의 원문 문자열이다 — 임의 접두를 붙이지 않는다
      expect(inserts[0].params?.[1]).toBe(role);
      expect(state.committed).toBe(true);
      expect(state.rolledBack).toBe(false);
    },
  );

  it('membership role 이 비어 있으면 기존과 같이 member 로 부여한다', async () => {
    const { service, state } = createService('');

    await service.approveRegistration('user-1', 'approver-1');

    expect(roleAssignmentInserts(state)[0].params?.[1]).toBe('member');
  });
});
