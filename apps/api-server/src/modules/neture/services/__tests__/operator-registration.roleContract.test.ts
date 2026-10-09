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

// Demo 판정은 "Demo 아님" 으로 고정 (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 근거는 support 헬퍼).
jest.mock('../../../../services/auth/demo-account.service.js', () =>
  jest.requireActual('../../../../__tests__/support/not-demo-account.js').notDemoAccountModule(),
);

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

  // CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E4:
  //   Neture 가입 승인은 메인 이용 자격만 준다 — role 부여 · 공급자 원장 생성 · 조직 생성을 하지 않는다.
  it.each(['supplier', 'member', 'customer', 'store_owner', ''])(
    "membership role '%s' 승인은 role · 공급자 · 조직을 만들지 않는다",
    async (role) => {
      const { service, state } = createService(role);

      await expect(service.approveRegistration('user-1', 'approver-1')).resolves.toEqual({
        success: true,
        userId: 'user-1',
      });

      expect(roleAssignmentInserts(state)).toHaveLength(0);
      const touches = (needle: string) => state.queries.some((q) => q.sql.includes(needle));
      expect(touches('neture_suppliers')).toBe(false);
      expect(touches('INSERT INTO organizations')).toBe(false);
      expect(touches('organization_members')).toBe(false);
      expect(touches('neture_pharmacy_memberships')).toBe(false);
      expect(touches('semi_franchise_memberships')).toBe(false);
      // Neture 원장만 active 로 바꾼다
      expect(touches("UPDATE service_memberships")).toBe(true);
      expect(touches("UPDATE users")).toBe(false);
      expect(state.committed).toBe(true);
      expect(state.rolledBack).toBe(false);
    },
  );

  // WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1:
  //   Legacy Partner 은퇴 — 어떤 역할의 승인도 neture.neture_partners 를 읽거나 쓰지 않는다.
  it.each(['supplier', 'member', 'partner'])("'%s' 승인은 neture.neture_partners 를 건드리지 않는다", async (role) => {
    const { service, state } = createService(role);
    await service.approveRegistration('user-1', 'approver-1');
    expect(state.queries.some((q) => q.sql.includes('neture_partners'))).toBe(false);
  });
});
