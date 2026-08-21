/**
 * MembershipApprovalService — Core-level approval logic
 *
 * WO-O4O-APPROVAL-SERVICE-EXTRACTION-V1
 *
 * Responsibilities:
 * - Membership approve/reject/delete as atomic transactions
 * - membership + user + role_assignments 3-table consistency
 * - Structured logging for all state transitions
 *
 * Rules:
 * - All write operations run inside a single transaction
 * - Controller MUST NOT contain DB logic — only this service
 * - approve = membership active + user ACTIVE + role granted (all-or-nothing)
 */
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { resolveRolePrefixFromCanonicalServiceKey } from '@o4o/security-core';

/**
 * WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
 *
 * 호출자가 이미 transaction 을 소유한 경우, 그 실행 컨텍스트를 주입받기 위한 최소 계약.
 * TypeORM 의 `QueryRunner` 와 transaction `EntityManager` 가 모두 구조적으로 이를 만족한다.
 * 주입 시 이 서비스는 begin / commit / rollback 을 수행하지 않는다 (호출자 소유).
 */
export type MembershipTxExecutor = {
  query(sql: string, parameters?: any[]): Promise<any>;
};

export interface ApproveParams {
  membershipId: string;
  approvedBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
}

export interface ApproveResult {
  id: string;
  user_id: string;
  service_key: string;
  role: string;
  status: string;
  /** WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1: 반려 응답 정합성 */
  rejection_reason?: string | null;
}

/**
 * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1
 *
 * TypeORM 0.3.x pg driver 는 SELECT 는 rows 를, UPDATE/DELETE 는 `[rows, rowCount]` 를 반환한다
 * (typeorm/driver/postgres/PostgresQueryRunner.js — `result.raw = [raw.rows, raw.rowCount]`).
 * 따라서 `UPDATE ... RETURNING` 결과에 `.length` / `[0]` 을 그대로 쓰면
 *   - length 가 항상 2 → "대상 없음" 분기(404)가 도달 불가
 *   - [0] 이 행이 아니라 rows 배열 → 이후 필드가 전부 undefined
 * 가 된다. 이 helper 로 driver 반환 형태를 행 배열로 정규화한다.
 */
function normalizeReturningRows<T = any>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    // UPDATE/DELETE ... RETURNING → [rows, rowCount]
    if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
      return result[0] as T[];
    }
    return result as T[];
  }
  // useStructuredResult 경로 (QueryResult)
  const records = (result as any).records;
  if (Array.isArray(records)) return records as T[];
  const raw = (result as any).raw;
  if (Array.isArray(raw)) return normalizeReturningRows<T>(raw);
  return [];
}

export interface RejectParams {
  membershipId: string;
  reason: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
}

export interface DeleteMemberParams {
  userId: string;
  deletedBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
  /** WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1: 'soft' (기본) = 비활성화, 'hard' = 데이터 삭제 */
  mode?: 'soft' | 'hard';
}

// WO-O4O-USER-WITHDRAW-LIFECYCLE-V1
export interface WithdrawMemberParams {
  userId: string;
  withdrawnBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
  /**
   * WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1: 호출자 transaction 참여용. 주입 시 이 서비스는 자체 transaction 을 열지 않는다.
   * 미주입 시 기존 동작(자체 queryRunner transaction) 을 그대로 유지한다.
   */
  manager?: MembershipTxExecutor;
}

export interface WithdrawResult {
  inactivatedMemberships: number;
  deactivatedRoles: string[];
  userId: string;
}

// WO-O4O-USER-MEMBERSHIP-REACTIVATION-V1
export interface SuspendParams {
  userId: string;
  suspendedBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
  /**
   * WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1: 호출자 transaction 참여용. 주입 시 이 서비스는 자체 transaction 을 열지 않는다.
   * 미주입 시 기존 동작(자체 queryRunner transaction) 을 그대로 유지한다.
   */
  manager?: MembershipTxExecutor;
}

export interface SuspendResult {
  suspendedMemberships: number;
  deactivatedRoles: string[];
  userId: string;
}

export interface ReactivateParams {
  userId: string;
  reactivatedBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
  /**
   * WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1: 호출자 transaction 참여용. 주입 시 이 서비스는 자체 transaction 을 열지 않는다.
   * 미주입 시 기존 동작(자체 queryRunner transaction) 을 그대로 유지한다.
   */
  manager?: MembershipTxExecutor;
}

export interface ReactivateResult {
  reactivatedMemberships: number;
  reactivatedRoles: string[];
  userId: string;
}

/**
 * service_memberships.role → role_assignments.role 매핑 (승인 시 실제로 부여되는 역할).
 *
 * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1:
 *   K-Cosmetics 판매자 = 매장 경영자. canonical role 은 cosmetics:store_owner.
 *   write-path 정규화(auth-register) 이전에 생성된 legacy 'seller' 변종 멤버십도
 *   승인 시점에 정규화하여 cosmetics:store_owner 가 부여되도록 한다
 *   (2026-09 BackfillStoreOwnerRoles / CleanupKCosmeticsSellerRole 통합 마이그레이션 정렬).
 *
 * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1:
 *   승인 경로에 인라인으로만 있던 매핑을 공통화한다. 반려 시 비활성화 대상 역할을
 *   승인 시 부여한 역할과 동일하게 계산해야 legacy k-cosmetics 멤버십에서도
 *   role 회수가 누락되지 않는다.
 *
 * role 이 비어 있으면 null 을 반환한다 (반려 경로에서는 role 변경을 skip).
 */
function resolveGrantedRole(serviceKey: string, role: string | null | undefined): string | null {
  if (!role) return null;
  if (
    serviceKey === 'k-cosmetics' &&
    ['seller', 'cosmetics:seller', 'k-cosmetics:seller'].includes(role)
  ) {
    return 'cosmetics:store_owner';
  }
  return role;
}

export class MembershipApprovalService {

  /**
   * role_assignments 활성화 (승인·재활성화 공통).
   *
   * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1 §4.3:
   *   제약은 `unique_active_role_per_user UNIQUE (user_id, role, is_active)` 이다.
   *   따라서 기존 `INSERT ... ON CONFLICT ON CONSTRAINT ... DO UPDATE SET is_active = true` 는
   *   비활성 row `(u, r, false)` 와 충돌하지 않아 `(u, r, true)` 를 **새로 INSERT** 하고,
   *   그 뒤 다시 반려/정지하면 `(u, r, false)` 가 중복되어 23505 로 실패한다.
   *   → 활성 row 확인 → 비활성 row 재활성화 → 없을 때만 INSERT 순서로 교체한다 (migration 불필요).
   */
  private async activateRoleAssignment(
    queryRunner: MembershipTxExecutor,
    userId: string,
    role: string,
    assignedBy: string | null
  ): Promise<'already_active' | 'reactivated' | 'created'> {
    const active = normalizeReturningRows(
      await queryRunner.query(
        `UPDATE role_assignments SET updated_at = NOW()
         WHERE user_id = $1 AND role = $2 AND is_active = true
         RETURNING id`,
        [userId, role]
      )
    );
    if (active.length > 0) return 'already_active';

    const reactivated = normalizeReturningRows(
      await queryRunner.query(
        `UPDATE role_assignments SET is_active = true, updated_at = NOW()
         WHERE id = (
           SELECT id FROM role_assignments
           WHERE user_id = $1 AND role = $2 AND is_active = false
           ORDER BY updated_at DESC LIMIT 1
         )
         RETURNING id`,
        [userId, role]
      )
    );
    if (reactivated.length > 0) return 'reactivated';

    await queryRunner.query(
      `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, role) WHERE is_active
       DO UPDATE SET updated_at = NOW(), is_active = true`,
      [userId, role, assignedBy]
    );
    return 'created';
  }

  /**
   * role_assignments 비활성화 (반려·정지 공통). row 는 보존하고 is_active 만 false 로 내린다.
   *
   * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1 §4.2 (당시):
   *   `unique_active_role_per_user UNIQUE (user_id, role, is_active)` 때문에 `(u, r, true)` 와
   *   `(u, r, false)` 가 동시에 존재하면 단순 UPDATE 가 23505 로 실패했다. 그래서 중복 비활성 row 를
   *   **DELETE 해서 합치는** 우회가 들어가 있었다.
   *
   * WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1:
   *   제약을 `UNIQUE (user_id, role) WHERE is_active` 부분 인덱스로 교체해
   *   비활성 이력 row 가 여러 개 공존할 수 있게 됐다(migration 20270301000000).
   *   활성 row 를 내리는 UPDATE 는 활성 유일성을 **줄이는** 방향이라 이제 어떤 경우에도
   *   충돌하지 않는다 → **이력을 지우던 DELETE 를 제거**한다.
   *   회수 이력(누가 언제 무슨 역할을 잃었는지)이 보존된다.
   *
   * @returns 비활성화된 row 수
   */
  private async deactivateRoleAssignment(
    queryRunner: MembershipTxExecutor,
    userId: string,
    role: string
  ): Promise<number> {
    const updated = normalizeReturningRows(
      await queryRunner.query(
        `UPDATE role_assignments SET is_active = false, updated_at = NOW()
         WHERE user_id = $1 AND role = $2 AND is_active = true
         RETURNING id`,
        [userId, role]
      )
    );
    return updated.length;
  }

  /**
   * Approve a service membership (atomic: membership + user + role_assignment)
   * Returns the approved membership row, or null if not found.
   */
  async approveMembership(params: ApproveParams): Promise<ApproveResult | null> {
    const { membershipId, approvedBy, isPlatformAdmin, serviceKeys } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // STEP0: SELECT membership FOR UPDATE (행 잠금 + 안전한 데이터 획득)
      logger.info('[APPROVAL][STEP0] SELECT membership FOR UPDATE', {
        membershipId, approvedBy, isPlatformAdmin,
      });

      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE id = $1 AND status IN ('pending', 'rejected')
             FOR UPDATE`,
            [membershipId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE id = $1 AND status IN ('pending', 'rejected') AND service_key = ANY($2)
             FOR UPDATE`,
            [membershipId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[APPROVAL][STEP0] membership not found or already active', {
          membershipId, isPlatformAdmin, serviceKeys,
        });
        await queryRunner.rollbackTransaction();
        return null;
      }

      const membership = selectResult[0] as ApproveResult;
      const userId = membership.user_id;

      logger.info('[APPROVAL][STEP0] membership locked', {
        membershipId: membership.id,
        userId,
        serviceKey: membership.service_key,
        role: membership.role,
      });

      if (!userId) {
        logger.error('[APPROVAL][STEP0] CRITICAL: user_id is null in service_memberships', {
          membershipId, rawResult: JSON.stringify(selectResult[0]),
        });
        await queryRunner.rollbackTransaction();
        throw new Error(`CRITICAL: service_memberships.user_id is null for id=${membershipId}`);
      }

      // STEP1: Activate membership
      logger.info('[APPROVAL][STEP1] membership UPDATE', { membershipId });

      await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [approvedBy, membershipId]
      );

      // STEP2: Activate user account (idempotent)
      logger.info('[APPROVAL][STEP2] user UPDATE', { userId });

      await queryRunner.query(
        `UPDATE users SET status = 'active', "isActive" = true,
         "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'active', 'inactive', 'deleted', 'rejected')`,
        [approvedBy, userId]
      );

      // STEP3: Ensure role_assignment exists (idempotent — ON CONFLICT updates timestamp)
      const memberRole = resolveGrantedRole(membership.service_key, membership.role) || 'member';
      const roleOutcome = await this.activateRoleAssignment(queryRunner, userId, memberRole, approvedBy);
      logger.info('[APPROVAL][STEP3] role ACTIVATE', { userId, role: memberRole, outcome: roleOutcome });

      // STEP4: WO-O4O-KPA-MEMBERSHIP-SYNC-FIX-V1 — kpa_members upsert on approve
      //   service_memberships 가 KPA 가입 상태 SSOT. kpa_members 는 domain profile (optional).
      //   4a: 기존 pending 레코드 활성화
      //   4b: 레코드 없으면 skeleton 생성 (legacy 등록자 / admin 생성 SM 등)
      //   admin/operator role 은 KPA domain profile 불필요 — 생성 건너뜀
      if (membership.service_key === 'kpa-society') {
        const smRole = membership.role || 'member';
        const skipKpaProfile = ['admin', 'operator'].includes(smRole);

        if (!skipKpaProfile) {
          logger.info('[APPROVAL][STEP4] kpa_members upsert', { userId, smRole });

          // 4a: activate existing pending record
          await queryRunner.query(
            `UPDATE kpa_members
             SET status = 'active',
                 joined_at = COALESCE(joined_at, CURRENT_DATE),
                 updated_at = NOW()
             WHERE user_id = $1 AND status = 'pending'`,
            [userId]
          );

          // 4b: create skeleton if still no record exists (idempotent)
          const kpaExists = await queryRunner.query(
            `SELECT 1 FROM kpa_members WHERE user_id = $1 LIMIT 1`,
            [userId]
          );
          if (kpaExists.length === 0) {
            // derive membership_type from SM role (best-effort)
            const derivedMembershipType =
              smRole === 'pharmacy' ? 'pharmacist'
              : smRole === 'user' ? 'pharmacy_student_member'
              : 'pharmacist';

            await queryRunner.query(
              `INSERT INTO kpa_members
                 (user_id, role, status, identity_status, membership_type,
                  joined_at, created_at, updated_at)
               VALUES ($1, 'member', 'active', 'active', $2, CURRENT_DATE, NOW(), NOW())
               ON CONFLICT (user_id) DO NOTHING`,
              [userId, derivedMembershipType]
            );
            logger.info('[APPROVAL][STEP4] kpa_members skeleton created', {
              userId, derivedMembershipType,
            });
          }
        }
      }

      // STEP5: WO-O4O-KCOSMETICS-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1
      //   k-cosmetics 승인 시 cosmetics_members upsert (service_memberships 가 SSOT).
      //   cosmetics_members.status CHECK: 'active' | 'suspended' | 'withdrawn' 만 허용.
      //   row 없으면 skeleton 생성, 있으면 active 동기화 (sub_role 보존).
      //   거절 시에는 cosmetics_members row 생성하지 않음 (rejectMembership 에서 처리 없음).
      if (membership.service_key === 'k-cosmetics') {
        logger.info('[APPROVAL][STEP5] cosmetics_members upsert', { userId });
        await queryRunner.query(
          `INSERT INTO cosmetics_members (user_id, membership_type, status, created_at, updated_at)
           VALUES ($1, 'cosmetics_member', 'active', NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET status = 'active', updated_at = NOW()`,
          [userId]
        );
      }

      await queryRunner.commitTransaction();

      // 커밋 후 결과에 status 반영
      membership.status = 'active';

      logger.info('[APPROVAL][SUCCESS]', {
        membershipId,
        userId,
        role: memberRole,
        approvedBy,
        serviceKey: membership.service_key,
      });

      return membership;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[APPROVAL][FAILED]', {
        membershipId,
        approvedBy,
        errorMessage: err.message,
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
        stack: err.stack,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a service membership (atomic: membership + role_assignment + domain projection).
   * Returns the rejected membership row, or null if not found / not rejectable.
   *
   * WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1
   * - D2: 기존 구현은 `AppDataSource.query(UPDATE ... RETURNING)` 결과를 행 배열로 오해했다
   *       (실제 반환 = `[rows, rowCount]`). 그 결과 404 분기 도달 불가 · 응답 필드 undefined ·
   *       KPA 동기화 미실행. approveMembership 과 동일한 SELECT ... FOR UPDATE → UPDATE 패턴으로 교체.
   * - D3: 반려 시 해당 membership 의 role 만 is_active=false 로 회수한다 (row 삭제 없음).
   *       다른 서비스의 role_assignments 는 절대 변경하지 않는다.
   * - users.status 는 변경하지 않는다 (D1 정책은 본 WO 범위 밖 — 별도 IR).
   */
  async rejectMembership(params: RejectParams): Promise<ApproveResult | null> {
    const { membershipId, reason, isPlatformAdmin, serviceKeys } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // STEP0: SELECT membership FOR UPDATE (행 잠금 + 안전한 데이터 획득)
      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE id = $1 AND status IN ('pending', 'active')
             FOR UPDATE`,
            [membershipId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE id = $1 AND status IN ('pending', 'active') AND service_key = ANY($2)
             FOR UPDATE`,
            [membershipId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[REJECTION][STEP0] membership not found or not rejectable', {
          membershipId, isPlatformAdmin, serviceKeys,
        });
        await queryRunner.rollbackTransaction();
        return null;
      }

      const membership = selectResult[0] as ApproveResult;
      const userId = membership.user_id;
      const statusBefore = membership.status;

      logger.info('[REJECTION][STEP0] membership locked', {
        membershipId: membership.id,
        userId,
        serviceKey: membership.service_key,
        role: membership.role,
        statusBefore,
      });

      // STEP1: Reject membership
      await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
         WHERE id = $2`,
        [reason, membershipId]
      );

      // STEP2: Deactivate the role granted by THIS membership only.
      //   승인 시 부여한 역할과 동일한 계산(resolveGrantedRole)을 사용한다.
      //   membership.role 이 없으면 반려는 그대로 수행하고 role 변경만 건너뛴다.
      const grantedRole = resolveGrantedRole(membership.service_key, membership.role);
      let deactivatedRole: string | null = null;
      if (!grantedRole) {
        logger.warn('[REJECTION][STEP2] membership.role is empty — role deactivation skipped', {
          membershipId, userId, serviceKey: membership.service_key,
        });
      } else if (!userId) {
        logger.error('[REJECTION][STEP2] user_id is null — role deactivation skipped', {
          membershipId, serviceKey: membership.service_key,
        });
      } else {
        const affected = await this.deactivateRoleAssignment(queryRunner, userId, grantedRole);
        if (affected > 0) {
          deactivatedRole = grantedRole;
        }
        logger.info('[REJECTION][STEP2] role DEACTIVATE', {
          userId, role: grantedRole, affected,
        });
      }

      // STEP3: WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync
      //   service_memberships 가 SSOT. KPA 전용 보조 원장이므로 다른 서비스로 확장하지 않는다.
      //   WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1 §4.4 에 따라 동일 트랜잭션에서 처리
      //   (기존에는 D2 로 인해 이 분기가 한 번도 실행되지 않았다).
      if (membership.service_key === 'kpa-society' && userId) {
        logger.info('[REJECTION][STEP3] kpa_members projection sync', { userId });
        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'rejected', updated_at = NOW()
           WHERE user_id = $1 AND status IN ('pending', 'active')`,
          [userId]
        );
      }

      await queryRunner.commitTransaction();

      // 커밋 후 결과에 상태·사유 반영
      membership.status = 'rejected';
      membership.rejection_reason = reason ?? null;

      logger.info('[REJECTION][SUCCESS]', {
        membershipId,
        userId,
        reason,
        serviceKey: membership.service_key,
        statusBefore,
        deactivatedRole,
      });

      return membership;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[REJECTION][FAILED]', {
        membershipId,
        errorMessage: err.message,
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
        stack: err.stack,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Suspend active memberships for a user (atomic: membership + role_assignment).
   * WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2
   * Service-level only — does NOT change users.status (no global impact).
   * Returns result with counts, or null if no active memberships found in scope.
   */
  async suspendMembership(params: SuspendParams): Promise<SuspendResult | null> {
    // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
    //   호출자가 transaction 을 소유하면(manager 주입) 자체 transaction 을 열지 않고
    //   같은 transaction 에서 실행한다. 중첩 transaction · 별도 connection · 미커밋 행에 대한
    //   교차 connection lock 대기를 만들지 않기 위함이다.
    //   manager 미주입 기존 소비처는 아래 자체 transaction 경로로 기존 동작을 그대로 유지한다.
    if (params.manager) {
      return this.suspendMembershipCore(params.manager, params);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.suspendMembershipCore(queryRunner, params);
      if (result === null) {
        await queryRunner.rollbackTransaction();
        return null;
      }
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async suspendMembershipCore(
    queryRunner: MembershipTxExecutor,
    params: SuspendParams
  ): Promise<SuspendResult | null> {
    const { userId, suspendedBy, isPlatformAdmin, serviceKeys } = params;

    try {
      // STEP0: SELECT active memberships FOR UPDATE
      logger.info('[SUSPEND][STEP0] SELECT active memberships FOR UPDATE', {
        userId, suspendedBy, isPlatformAdmin,
      });

      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status = 'active'
             FOR UPDATE`,
            [userId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status = 'active' AND service_key = ANY($2)
             FOR UPDATE`,
            [userId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[SUSPEND][STEP0] no active memberships found', {
          userId, isPlatformAdmin, serviceKeys,
        });
        return null;
      }

      const membershipIds = selectResult.map((m: any) => m.id);
      const roles = selectResult.map((m: any) => m.role).filter(Boolean);

      logger.info('[SUSPEND][STEP0] memberships locked', {
        userId, count: selectResult.length, roles,
      });

      // STEP1: Suspend memberships
      logger.info('[SUSPEND][STEP1] membership UPDATE', { membershipIds });

      await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'suspended', updated_at = NOW()
         WHERE id = ANY($1)`,
        [membershipIds]
      );

      // STEP2: Deactivate role_assignments for each membership role
      const deactivatedRoles: string[] = [];
      for (const membership of selectResult) {
        // WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1: 승인 시 부여한 역할과 동일하게 계산 +
        //   legacy 중복 row 로 인한 unique constraint 충돌 방어 (deactivateRoleAssignment 공통화)
        const grantedRole = resolveGrantedRole(membership.service_key, membership.role);
        if (grantedRole) {
          const affected = await this.deactivateRoleAssignment(queryRunner, userId, grantedRole);
          logger.info('[SUSPEND][STEP2] role DEACTIVATE', { userId, role: grantedRole, affected });
          deactivatedRoles.push(grantedRole);
        }
      }

      // STEP2.5: WO-O4O-KPA-STORE-OWNER-ROLE-LIFECYCLE-FIX-V1
      //   service_memberships.role (member/operator/admin) 만으로는 kpa:store_owner 같은
      //   capability role 이 회수되지 않는다. kpa:store_owner 는 service_memberships 와 별개의
      //   role_assignments 단독 row 이기 때문 (IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1 §3-2 F1).
      //   kpa-society membership 이 정지/거부될 때 kpa:store_owner 도 명시적으로 deactivate.
      //   다른 서비스(glycopharm/cosmetics)의 store_owner 는 본 단계에서 손대지 않음 — 각 서비스
      //   정지 흐름이 자체적으로 처리해야 함.
      const hasKpaSocietyMembership = selectResult.some((m: any) => m.service_key === 'kpa-society');
      if (hasKpaSocietyMembership) {
        logger.info('[SUSPEND][STEP2.5] kpa:store_owner DEACTIVATE', { userId });
        // WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1: UPDATE ... RETURNING 반환 형태 정규화
        const storeOwnerRows = normalizeReturningRows(
          await queryRunner.query(
            `UPDATE role_assignments SET is_active = false, updated_at = NOW()
             WHERE user_id = $1 AND role = $2 AND is_active = true
             RETURNING id`,
            [userId, 'kpa:store_owner']
          )
        );
        if (storeOwnerRows.length > 0) {
          deactivatedRoles.push('kpa:store_owner');
        }
      }

      // STEP3: WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync
      //   service_key='kpa-society' 인 membership 이 포함된 경우에만 kpa_members.status='suspended'.
      //   status='active' 인 row 만 update (이미 다른 상태이면 덮어쓰지 않음).
      //   identity_status 컬럼은 별도 의미(KpaIdentityStatus)이므로 손대지 않음.
      if (hasKpaSocietyMembership) {
        logger.info('[SUSPEND][STEP3] kpa_members projection sync', { userId });
        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'suspended', updated_at = NOW()
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        );
      }

      // NOTE: users.status is NOT changed — service-level suspension only

      logger.info('[SUSPEND][SUCCESS]', {
        userId, suspendedMemberships: selectResult.length, deactivatedRoles, suspendedBy,
      });

      return {
        suspendedMemberships: selectResult.length,
        deactivatedRoles,
        userId,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[SUSPEND][FAILED]', {
        userId, suspendedBy,
        errorMessage: err.message,
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * Reactivate suspended memberships for a user (atomic: membership + user + role_assignment).
   * WO-O4O-USER-MEMBERSHIP-REACTIVATION-V1
   * Returns result with counts, or null if no suspended memberships found.
   */
  async reactivateMembership(params: ReactivateParams): Promise<ReactivateResult | null> {
    // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
    //   호출자가 transaction 을 소유하면(manager 주입) 자체 transaction 을 열지 않고
    //   같은 transaction 에서 실행한다. 중첩 transaction · 별도 connection · 미커밋 행에 대한
    //   교차 connection lock 대기를 만들지 않기 위함이다.
    //   manager 미주입 기존 소비처는 아래 자체 transaction 경로로 기존 동작을 그대로 유지한다.
    if (params.manager) {
      return this.reactivateMembershipCore(params.manager, params);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.reactivateMembershipCore(queryRunner, params);
      if (result === null) {
        await queryRunner.rollbackTransaction();
        return null;
      }
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async reactivateMembershipCore(
    queryRunner: MembershipTxExecutor,
    params: ReactivateParams
  ): Promise<ReactivateResult | null> {
    const { userId, reactivatedBy, isPlatformAdmin, serviceKeys } = params;

    try {
      // STEP0: SELECT reactivatable memberships FOR UPDATE
      // WO-O4O-NETURE-SUPPLIER-WITHDRAWN-RESTORE-ACTION-V1:
      //   복구 대상을 suspended(정지) + withdrawn(탈퇴) 양쪽으로 broaden.
      //   suspend / soft-delete(withdraw) 모두 이 canonical 경로로 되돌린다.
      logger.info('[REACTIVATE][STEP0] SELECT reactivatable memberships FOR UPDATE', {
        userId, reactivatedBy, isPlatformAdmin,
      });

      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status IN ('suspended', 'withdrawn')
             FOR UPDATE`,
            [userId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status IN ('suspended', 'withdrawn') AND service_key = ANY($2)
             FOR UPDATE`,
            [userId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[REACTIVATE][STEP0] no reactivatable memberships found', {
          userId, isPlatformAdmin, serviceKeys,
        });
        return null;
      }

      const membershipIds = selectResult.map((m: any) => m.id);
      const roles = selectResult.map((m: any) => m.role).filter(Boolean);

      logger.info('[REACTIVATE][STEP0] memberships locked', {
        userId, count: selectResult.length, roles,
      });

      // STEP1: Activate memberships
      logger.info('[REACTIVATE][STEP1] membership UPDATE', { membershipIds });

      await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = ANY($2)`,
        [reactivatedBy, membershipIds]
      );

      // STEP2: Activate user account (idempotent)
      //
      // WO-O4O-MEMBERSHIP-REACTIVATION-PLATFORM-SUSPENSION-BOUNDARY-V1:
      //   users.status='suspended' 를 기록하는 경로는 admin API 뿐이다
      //   (AdminUserController:376·425, UserManagementController:205).
      //   즉 users 축의 'suspended' 는 **플랫폼 조치**이며, 서비스 운영자의 재활성화가 이를
      //   해제하면 "서비스 운영자는 자기 서비스 Membership 만 통제한다" 경계가
      //   반대 방향으로 뚫린다(WO-...-REJECTION-CROSS-SERVICE-ISOLATION-V1 의 대칭 결함).
      //
      //   'deleted' 는 서비스 운영자도 호출할 수 있는 deleteMember(mode='soft') 의 역동작이므로
      //   운영자 복구 대상으로 남긴다 — WO-O4O-NETURE-SUPPLIER-WITHDRAWN-RESTORE-ACTION-V1 의
      //   "suspend / soft-delete 모두 이 canonical 경로로 되돌린다" 계약 보존.
      //   (soft-delete 자체가 users 전역을 쓰는 문제는 withdrawn/delete 의미 감사에서 다룬다.)
      const liftableUserStatuses = isPlatformAdmin ? ['suspended', 'deleted'] : ['deleted'];

      logger.info('[REACTIVATE][STEP2] user UPDATE', { userId, isPlatformAdmin, liftableUserStatuses });

      await queryRunner.query(
        `UPDATE users SET status = 'active', "isActive" = true, "updatedAt" = NOW()
         WHERE id = $1 AND status = ANY($2)`,
        [userId, liftableUserStatuses]
      );

      // STEP3: Reactivate role_assignments for each membership role
      const reactivatedRoles: string[] = [];
      for (const membership of selectResult) {
        const memberRole = resolveGrantedRole(membership.service_key, membership.role) || 'member';
        const roleOutcome = await this.activateRoleAssignment(queryRunner, userId, memberRole, reactivatedBy);
        logger.info('[REACTIVATE][STEP3] role ACTIVATE', { userId, role: memberRole, outcome: roleOutcome });
        reactivatedRoles.push(memberRole);
      }

      // STEP3.5: WO-O4O-KPA-STORE-OWNER-ROLE-LIFECYCLE-FIX-V1
      //   suspendMembership STEP2.5 에서 kpa:store_owner 를 deactivate 했으므로, 재활성화 시에도
      //   동일 정책으로 복원. 단:
      //     (a) activity_type='pharmacy_owner' (SSOT = kpa_pharmacist_profiles) 인 경우만
      //     (b) deactivated row 가 존재할 때만 in-place 활성화 (UPDATE only — INSERT 없음)
      //   부여 자체는 별도 트리거 (PATCH /:id/status pending→active 자동활성화,
      //   PATCH /:id/info activity_type 전환) 가 담당. 본 단계는 "정지 직전 상태 복귀" 만 수행.
      const hasKpaSocietyMembership = selectResult.some((m: any) => m.service_key === 'kpa-society');
      if (hasKpaSocietyMembership) {
        const profileRows = await queryRunner.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        const isPharmacyOwner = profileRows?.[0]?.activity_type === 'pharmacy_owner';
        if (isPharmacyOwner) {
          logger.info('[REACTIVATE][STEP3.5] kpa:store_owner RESTORE candidate', { userId });
          // WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1: UPDATE ... RETURNING 반환 형태 정규화
          const restoredRows = normalizeReturningRows(
            await queryRunner.query(
              `UPDATE role_assignments SET is_active = true, updated_at = NOW()
               WHERE user_id = $1 AND role = $2 AND is_active = false
               RETURNING id`,
              [userId, 'kpa:store_owner']
            )
          );
          if (restoredRows.length > 0) {
            reactivatedRoles.push('kpa:store_owner');
          }
        }
      }

      // STEP4: WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync
      //   service_key='kpa-society' 인 membership 이 포함된 경우에만 kpa_members.status='active'.
      //   status='suspended' 인 row 만 update (다른 상태는 덮어쓰지 않음).
      if (hasKpaSocietyMembership) {
        logger.info('[REACTIVATE][STEP4] kpa_members projection sync', { userId });
        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'active', updated_at = NOW()
           WHERE user_id = $1 AND status IN ('suspended', 'withdrawn')`,
          [userId]
        );
      }

      // STEP5: WO-O4O-NETURE-SUPPLIER-WITHDRAWN-RESTORE-ACTION-V1 — neture_suppliers 프로필 복구
      //   neture membership 이 복구 대상에 포함된 경우, deactivate 로 INACTIVE 된 공급자 프로필을
      //   ACTIVE 로 되돌린다. REJECTED(의도적 거절)는 복구 대상이 아니므로 INACTIVE 만 전환.
      //   상품 승인/listing 재활성은 정책상 운영자 수동 (이 트랜잭션 범위 외).
      const hasNetureMembership = selectResult.some((m: any) => m.service_key === 'neture');
      if (hasNetureMembership) {
        logger.info('[REACTIVATE][STEP5] neture_suppliers profile restore', { userId });
        await queryRunner.query(
          `UPDATE neture_suppliers
           SET status = 'ACTIVE', updated_at = NOW()
           WHERE user_id = $1 AND status = 'INACTIVE'`,
          [userId]
        );
      }


      logger.info('[REACTIVATE][SUCCESS]', {
        userId, reactivatedMemberships: selectResult.length, reactivatedRoles, reactivatedBy,
      });

      return {
        reactivatedMemberships: selectResult.length,
        reactivatedRoles,
        userId,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[REACTIVATE][FAILED]', {
        userId, reactivatedBy,
        errorMessage: err.message,
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * Withdraw a member from specific service(s) — canonical service leave lifecycle.
   * WO-O4O-USER-WITHDRAW-LIFECYCLE-V1
   * WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1: status='withdrawn' 정식 통일
   *
   * Policy:
   * - service_memberships.status = 'withdrawn' (Core enum 정식 추가, frontend filter 와 일치)
   * - role_assignments: deactivate service-prefix roles only
   * - kpa_members: status/identity_status = 'withdrawn' (KPA domain profile sync)
   * - organization_members: role='member' → remove (KPA scope); owner/admin → log only
   * - users.status: 변경하지 않음 (로그인 유지 — MembershipGate가 접근 차단)
   * - 다른 서비스 membership/role: 영향 없음
   *
   * Returns result with counts, or null if no eligible memberships found.
   */
  async withdrawMembership(params: WithdrawMemberParams): Promise<WithdrawResult | null> {
    // WO-O4O-KPA-MEMBERSHIP-STATUS-SINGLE-TRANSACTION-CONVERGENCE-V1
    //   호출자가 transaction 을 소유하면(manager 주입) 자체 transaction 을 열지 않고
    //   같은 transaction 에서 실행한다. 중첩 transaction · 별도 connection · 미커밋 행에 대한
    //   교차 connection lock 대기를 만들지 않기 위함이다.
    //   manager 미주입 기존 소비처는 아래 자체 transaction 경로로 기존 동작을 그대로 유지한다.
    if (params.manager) {
      return this.withdrawMembershipCore(params.manager, params);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.withdrawMembershipCore(queryRunner, params);
      if (result === null) {
        await queryRunner.rollbackTransaction();
        return null;
      }
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async withdrawMembershipCore(
    queryRunner: MembershipTxExecutor,
    params: WithdrawMemberParams
  ): Promise<WithdrawResult | null> {
    const { userId, withdrawnBy, isPlatformAdmin, serviceKeys } = params;

    try {
      // STEP0: SELECT eligible memberships FOR UPDATE
      logger.info('[WITHDRAW][STEP0] SELECT eligible memberships FOR UPDATE', {
        userId, withdrawnBy, isPlatformAdmin, serviceKeys,
      });

      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status IN ('pending', 'active', 'suspended')
             FOR UPDATE`,
            [userId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status IN ('pending', 'active', 'suspended')
               AND service_key = ANY($2)
             FOR UPDATE`,
            [userId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[WITHDRAW][STEP0] no eligible memberships found', {
          userId, isPlatformAdmin, serviceKeys,
        });
        return null;
      }

      const membershipIds = selectResult.map((m: any) => m.id);
      const affectedServiceKeys: string[] = Array.from(new Set(selectResult.map((m: any) => m.service_key as string)));

      logger.info('[WITHDRAW][STEP0] memberships locked', {
        userId, count: selectResult.length, affectedServiceKeys,
      });

      // STEP1: Set service_memberships.status = 'withdrawn'
      // WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1:
      //   이전 'inactive' 저장은 Core enum 미정의 + GET filter 'withdrawn' 과 미스매치 발생.
      //   ServiceMembershipStatus 에 'withdrawn' 정식 추가하여 정렬.
      logger.info('[WITHDRAW][STEP1] membership WITHDRAW', { membershipIds });

      await queryRunner.query(
        `UPDATE service_memberships SET status = 'withdrawn', updated_at = NOW() WHERE id = ANY($1)`,
        [membershipIds]
      );

      // STEP2: Deactivate service-prefix role_assignments
      // Platform roles (super_admin, admin, operator) 는 prefix 매핑에 없으므로 건드리지 않음
      // WO-O4O-CANONICAL-SERVICE-KEY-REVERSE-MAP-V1: canonical service_key → role prefix 는
      //   @o4o/security-core SSOT 위임. SQL LIKE 패턴의 ':' 는 호출처에서 조립.
      const deactivatedRoles: string[] = [];
      const prefixesToClean = affectedServiceKeys
        .map((k) => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
        .filter((p) => p !== ':');  // safety: empty key 방어

      for (const prefix of prefixesToClean) {
        logger.info('[WITHDRAW][STEP2] role DEACTIVATE', { userId, prefix });

        await queryRunner.query(
          `UPDATE role_assignments SET is_active = false, updated_at = NOW()
           WHERE user_id = $1 AND role LIKE $2 AND is_active = true`,
          [userId, `${prefix}%`]
        );
        deactivatedRoles.push(prefix);
      }

      // STEP3: Domain profile sync — KPA 전용
      // kpa_members.status='withdrawn', identity_status='withdrawn'
      // 다른 서비스 profile 테이블 sync 는 추후 별도 WO
      //
      // WO-O4O-KPA-WITHDRAWN-LICENSE-CLEANUP-V1:
      //   withdrawn 시 license_number 자동 NULL 처리.
      //   - kpa_members.license_number 는 Partial UNIQUE index (NULL/'' 제외) 보유
      //     → 탈퇴 회원이 license 를 계속 점유하면 재가입(본인 또는 다른 약사) 시
      //       /check-license 가 차단 (status 무관 unique 정책 — IR §4)
      //   - kpa_pharmacist_profiles.license_number 도 일관성 위해 같이 NULL
      //   정책: active/pending/suspended/rejected 회원의 license 는 절대 변경하지 않음
      //          (위 WHERE status NOT IN ('withdrawn') 가드로 이중 보호)
      const hasKpaSociety = affectedServiceKeys.includes('kpa-society');
      if (hasKpaSociety) {
        logger.info('[WITHDRAW][STEP3] kpa_members projection sync + license cleanup', { userId });

        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'withdrawn', identity_status = 'withdrawn',
               license_number = NULL, updated_at = NOW()
           WHERE user_id = $1 AND status NOT IN ('withdrawn')`,
          [userId]
        );

        // kpa_pharmacist_profiles 의 license 도 일관성 정리 (SSOT mirror)
        await queryRunner.query(
          `UPDATE kpa_pharmacist_profiles
           SET license_number = NULL, updated_at = NOW()
           WHERE user_id = $1 AND license_number IS NOT NULL`,
          [userId]
        );
      }

      // STEP4: organization_members — service-scoped 정리
      // Policy (WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 Phase 4):
      //   role='member' → 제거 (KPA org scope)
      //   role='owner'  → soft-cleanup (left_at=NOW) — store_owner role 과 정렬, orphan drift 방지
      //   role IN ('admin', 'operator') → 유지 + AUDIT warning (delegated role, manual review)
      // 다른 사용자의 owner row 는 절대 수정하지 않음. Store ownership 자동 이전 금지.
      // Soft pattern 만 사용 (DESTRUCTIVE DELETE 금지 — owner 는 historical 보존).
      if (hasKpaSociety) {
        logger.info('[WITHDRAW][STEP4] organization_members cleanup (KPA scope)', { userId });

        // KPA org linkage: kpa_members.organization_id
        const kpaOrgRows = await queryRunner.query(
          `SELECT organization_id FROM kpa_members WHERE user_id = $1 AND organization_id IS NOT NULL LIMIT 1`,
          [userId]
        );

        if (kpaOrgRows.length > 0) {
          const kpaOrgId = kpaOrgRows[0].organization_id;

          // 일반 member: 제거
          await queryRunner.query(
            `DELETE FROM organization_members
             WHERE user_id = $1 AND organization_id = $2 AND role = 'member'`,
            [userId, kpaOrgId]
          );

          // owner: soft-cleanup (left_at=NOW) — kpa:store_owner role 비활성과 정렬
          // WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1: UPDATE ... RETURNING 반환 형태 정규화
          const ownerCleanupRows = normalizeReturningRows(
            await queryRunner.query(
              `UPDATE organization_members
               SET left_at = NOW(), updated_at = NOW()
               WHERE user_id = $1 AND organization_id = $2 AND role = 'owner' AND left_at IS NULL
               RETURNING id`,
              [userId, kpaOrgId]
            )
          );
          const ownerSoftCleanupCount = ownerCleanupRows.length;
          if (ownerSoftCleanupCount > 0) {
            logger.info('[WITHDRAW][STEP4] owner role soft-cleanup applied', {
              userId,
              organizationId: kpaOrgId,
              count: ownerSoftCleanupCount,
              withdrawnBy,
            });
          }

          // admin/operator: 유지 + AUDIT 로그 (위임 권한 — manual review)
          const delegatedRows = await queryRunner.query(
            `SELECT id, role FROM organization_members
             WHERE user_id = $1 AND organization_id = $2 AND role IN ('admin', 'operator') AND left_at IS NULL`,
            [userId, kpaOrgId]
          );

          if (delegatedRows.length > 0) {
            logger.warn('[WITHDRAW][STEP4] Delegated org roles retained — manual review required', {
              userId,
              organizationId: kpaOrgId,
              roles: delegatedRows.map((r: any) => r.role),
              withdrawnBy,
            });
          }
        }
      }

      // NOTE: users.status 변경하지 않음 — 로그인 유지, MembershipGate가 접근 차단

      logger.info('[WITHDRAW][SUCCESS]', {
        userId,
        withdrawnBy,
        inactivatedMemberships: membershipIds.length,
        deactivatedRoles,
        affectedServiceKeys,
      });

      return {
        inactivatedMemberships: membershipIds.length,
        deactivatedRoles,
        userId,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[WITHDRAW][FAILED]', {
        userId,
        withdrawnBy,
        errorMessage: err.message,
        errorCode: (error as any)?.code,
        errorDetail: (error as any)?.detail,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * Delete a member.
   * WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1: soft/hard 2단계 분리
   *
   * soft (기본): users.status='deleted', isActive=false, memberships 비활성,
   *              role_assignments 서비스 prefix 범위 내 비활성 (WO-O4O-SOFT-DELETE-ROLE-CLEANUP-V1)
   * hard: service_memberships + role_assignments 삭제, users hard delete (FK 위험)
   *
   * Returns true if processed, false if user not found in scope.
   */
  async deleteMember(params: DeleteMemberParams): Promise<boolean> {
    const { userId, deletedBy, isPlatformAdmin, serviceKeys, mode = 'soft' } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Service boundary check
      if (!isPlatformAdmin) {
        const accessCheck = await queryRunner.query(
          `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
          [userId, serviceKeys]
        );
        if (accessCheck.length === 0) {
          await queryRunner.rollbackTransaction();
          return false;
        }
      }

      if (mode === 'hard') {
        // WO-O4O-HARD-DELETE-SERVICE-SCOPED-V1:
        // users는 공통 Identity — 절대 삭제 금지.
        // serviceKey 범위의 데이터만 정리한다.
        // 다른 서비스 membership/role/profile은 건드리지 않는다.

        // STEP H1: service_memberships — 해당 서비스 범위만 삭제
        if (isPlatformAdmin) {
          // platform admin 전체 삭제 시에도 users row는 유지
          await queryRunner.query(
            `DELETE FROM service_memberships WHERE user_id = $1`,
            [userId]
          );
        } else {
          await queryRunner.query(
            `DELETE FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2)`,
            [userId, serviceKeys]
          );
        }

        // STEP H1b: service_credentials — 삭제한 membership 과 **정확히 같은 서비스 범위**만 폐기
        // WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1 §9 판정 B:
        //   hard delete 는 membership row 자체를 없애므로 되돌릴 canonical 경로가 없다
        //   (reactivateMembership 은 suspended/withdrawn membership 이 남아 있을 때만 동작).
        //   그런데 종전 구현은 service_credentials 를 그대로 남겨 두어
        //   "membership 0 + credential 존재" orphan 을 만들었고(2026-08-21 실측 28행),
        //   이후 admin 이 membership 을 다시 만들면(AdminUserController: KEEP_EXISTING_CREDENTIAL)
        //   **아무도 새 비밀번호를 정하지 않은 채 과거 비밀번호가 다시 유효**해졌다.
        //   따라서 hard delete 범위의 credential 은 함께 폐기한다.
        //   soft delete(withdraw/suspend)는 credential 을 유지한다 — reactivate 로
        //   같은 비밀번호를 복구하는 것이 설계된 동작이다(아래 else 분기 무변경).
        if (isPlatformAdmin) {
          await queryRunner.query(
            `DELETE FROM service_credentials WHERE user_id = $1`,
            [userId]
          );
        } else {
          await queryRunner.query(
            `DELETE FROM service_credentials WHERE user_id = $1 AND service_key = ANY($2)`,
            [userId, serviceKeys]
          );
        }

        // STEP H2: role_assignments — 해당 서비스 prefix 역할만 삭제
        // 플랫폼 역할(super_admin, admin, operator)은 절대 건드리지 않음
        const ALL_SERVICE_KEYS_H = ['kpa-society', 'k-cosmetics', 'glycopharm', 'neture'] as const;
        const hardPrefixes = isPlatformAdmin
          ? ALL_SERVICE_KEYS_H.map((k) => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
          : serviceKeys
              .map((k) => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
              .filter((p) => p !== ':');

        for (const prefix of hardPrefixes) {
          await queryRunner.query(
            `DELETE FROM role_assignments WHERE user_id = $1 AND role LIKE $2`,
            [userId, `${prefix}%`]
          );
        }

        // STEP H3: organization_members — KPA scope는 kpa_members를 통해 org_id 특정
        const hardHasKpa = serviceKeys.includes('kpa-society') || isPlatformAdmin;
        if (hardHasKpa) {
          const kpaOrgRowsH = await queryRunner.query(
            `SELECT organization_id FROM kpa_members WHERE user_id = $1 AND organization_id IS NOT NULL LIMIT 1`,
            [userId]
          );
          if (kpaOrgRowsH.length > 0) {
            const kpaOrgIdH = kpaOrgRowsH[0].organization_id;
            await queryRunner.query(
              `DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2`,
              [userId, kpaOrgIdH]
            );
          }

          // KPA domain profile cleanup
          await queryRunner.query(
            `UPDATE kpa_members SET status = 'withdrawn', identity_status = 'withdrawn', updated_at = NOW()
             WHERE user_id = $1 AND status NOT IN ('withdrawn')`,
            [userId]
          );
        }

        // STEP H4: users — 절대 삭제 금지
        // 남은 service_memberships가 없으면 users를 비활성화(soft-deactivate)만 수행
        const remainingMemberships = await queryRunner.query(
          `SELECT 1 FROM service_memberships WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        if (remainingMemberships.length === 0) {
          await queryRunner.query(
            `UPDATE users SET status = 'deleted', "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
            [userId]
          );
        }

        await queryRunner.commitTransaction();
        logger.info('[ApprovalService] HARD_DELETE_SUCCESS', {
          userId, deletedBy, serviceKeys, isPlatformAdmin,
          usersDeactivated: remainingMemberships.length === 0,
        });
      } else {
        // Soft delete: 비활성화만 수행 (users row 삭제 없음)
        //
        // WO-O4O-SERVICE-MEMBER-SOFT-DELETE-CROSS-SERVICE-ISOLATION-V1:
        //   이전 구현은 호출자 권한과 무관하게 두 개의 **전역** write 를 실행했다.
        //     1) UPDATE users SET status='deleted', "isActive"=false   → 모든 서비스 로그인 차단
        //     2) UPDATE service_memberships ... WHERE user_id = $1     → 다른 서비스 membership 까지 종료
        //   requireAuth 가 매 요청 users.isActive 를 검사하므로(authentication.middleware.ts),
        //   한 서비스 운영자의 탈퇴 처리가 그 사용자의 **다른 서비스 진행 중 세션까지** 끊었다.
        //
        //   서비스 운영자 = 자기 서비스 membership 종료만. users 는 건드리지 않는다.
        //   플랫폼 관리자 = 계정 전체 탈퇴(기존 계약 보존).
        //   role 정리는 아래 prefixesToClean 이 이미 권한별로 스코프하고 있어 그대로 둔다.
        if (isPlatformAdmin) {
          await queryRunner.query(
            `UPDATE users SET status = 'deleted', "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
            [userId]
          );
          // WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1:
          //   soft delete 도 lifecycle 종료 status 'withdrawn' 으로 일원화.
          //   withdrawMembership() 과 동일 enum 사용 (별도 'inactive' 분리 금지).
          await queryRunner.query(
            `UPDATE service_memberships SET status = 'withdrawn', updated_at = NOW() WHERE user_id = $1`,
            [userId]
          );
        } else {
          await queryRunner.query(
            `UPDATE service_memberships SET status = 'withdrawn', updated_at = NOW()
             WHERE user_id = $1 AND service_key = ANY($2)`,
            [userId, serviceKeys]
          );
        }

        // WO-O4O-SOFT-DELETE-ROLE-CLEANUP-V1: role_assignments 서비스 prefix 범위 내 비활성화.
        // 플랫폼 역할(super_admin, admin, operator)은 절대 자동 비활성화하지 않는다.
        // isPlatformAdmin: 전체 서비스 prefix 정리 / 서비스 operator: 해당 서비스 prefix만 정리.
        // WO-O4O-CANONICAL-SERVICE-KEY-REVERSE-MAP-V1: canonical service_key → role prefix 는
        //   @o4o/security-core SSOT 위임. SQL LIKE 패턴의 ':' 는 호출처에서 조립.
        const ALL_SERVICE_KEYS = ['kpa-society', 'k-cosmetics', 'glycopharm', 'neture'] as const;

        const prefixesToClean = isPlatformAdmin
          ? ALL_SERVICE_KEYS.map((k) => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
          : serviceKeys
              .map((k) => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
              .filter((p) => p !== ':');  // safety: empty key 방어

        for (const prefix of prefixesToClean) {
          await queryRunner.query(
            `UPDATE role_assignments SET is_active = false, updated_at = NOW()
             WHERE user_id = $1 AND role LIKE $2 AND is_active = true`,
            [userId, `${prefix}%`]
          );
        }

        await queryRunner.commitTransaction();
        logger.info('[ApprovalService] SOFT_DELETE_SUCCESS', {
          userId, deletedBy, cleanedPrefixes: prefixesToClean,
        });
      }

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('[ApprovalService] DELETE_FAILED', {
        userId,
        deletedBy,
        mode,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
