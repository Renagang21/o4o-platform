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

// WO-O4O-USER-MEMBERSHIP-REACTIVATION-V1
export interface SuspendParams {
  userId: string;
  suspendedBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
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
}

export interface ReactivateResult {
  reactivatedMemberships: number;
  reactivatedRoles: string[];
  userId: string;
}

export class MembershipApprovalService {

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
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'rejected')`,
        [approvedBy, userId]
      );

      // STEP3: Ensure role_assignment exists (idempotent — ON CONFLICT updates timestamp)
      const memberRole = membership.role || 'member';
      logger.info('[APPROVAL][STEP3] role INSERT', { userId, role: memberRole });

      await queryRunner.query(
        `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
         DO UPDATE SET updated_at = NOW(), is_active = true`,
        [userId, memberRole, approvedBy]
      );

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
   * Reject a service membership.
   * Returns the rejected membership row, or null if not found.
   */
  async rejectMembership(params: RejectParams): Promise<ApproveResult | null> {
    const { membershipId, reason, isPlatformAdmin, serviceKeys } = params;

    try {
      const result = isPlatformAdmin
        ? await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'active')
             RETURNING id, user_id, service_key, role, status`,
            [reason, membershipId]
          )
        : await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'active') AND service_key = ANY($3)
             RETURNING id, user_id, service_key, role, status`,
            [reason, membershipId, serviceKeys]
          );

      if (result.length === 0) {
        return null;
      }

      const membership = result[0] as ApproveResult;

      logger.info('[ApprovalService] REJECTION_SUCCESS', {
        membershipId,
        userId: membership.user_id,
        reason,
        serviceKey: membership.service_key,
      });

      return membership;
    } catch (error) {
      logger.error('[ApprovalService] REJECTION_FAILED', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Suspend active memberships for a user (atomic: membership + role_assignment).
   * WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2
   * Service-level only — does NOT change users.status (no global impact).
   * Returns result with counts, or null if no active memberships found in scope.
   */
  async suspendMembership(params: SuspendParams): Promise<SuspendResult | null> {
    const { userId, suspendedBy, isPlatformAdmin, serviceKeys } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
        await queryRunner.rollbackTransaction();
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
        if (membership.role) {
          logger.info('[SUSPEND][STEP2] role DEACTIVATE', { userId, role: membership.role });

          await queryRunner.query(
            `UPDATE role_assignments SET is_active = false, updated_at = NOW()
             WHERE user_id = $1 AND role = $2 AND is_active = true`,
            [userId, membership.role]
          );
          deactivatedRoles.push(membership.role);
        }
      }

      // NOTE: users.status is NOT changed — service-level suspension only
      await queryRunner.commitTransaction();

      logger.info('[SUSPEND][SUCCESS]', {
        userId, suspendedMemberships: selectResult.length, deactivatedRoles, suspendedBy,
      });

      return {
        suspendedMemberships: selectResult.length,
        deactivatedRoles,
        userId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[SUSPEND][FAILED]', {
        userId, suspendedBy,
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
   * Reactivate suspended memberships for a user (atomic: membership + user + role_assignment).
   * WO-O4O-USER-MEMBERSHIP-REACTIVATION-V1
   * Returns result with counts, or null if no suspended memberships found.
   */
  async reactivateMembership(params: ReactivateParams): Promise<ReactivateResult | null> {
    const { userId, reactivatedBy, isPlatformAdmin, serviceKeys } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // STEP0: SELECT suspended memberships FOR UPDATE
      logger.info('[REACTIVATE][STEP0] SELECT suspended memberships FOR UPDATE', {
        userId, reactivatedBy, isPlatformAdmin,
      });

      const selectResult = isPlatformAdmin
        ? await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status = 'suspended'
             FOR UPDATE`,
            [userId]
          )
        : await queryRunner.query(
            `SELECT id, user_id, service_key, role, status
             FROM service_memberships
             WHERE user_id = $1 AND status = 'suspended' AND service_key = ANY($2)
             FOR UPDATE`,
            [userId, serviceKeys]
          );

      if (!selectResult || selectResult.length === 0) {
        logger.warn('[REACTIVATE][STEP0] no suspended memberships found', {
          userId, isPlatformAdmin, serviceKeys,
        });
        await queryRunner.rollbackTransaction();
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

      // STEP2: Activate user account (idempotent — only if currently suspended)
      logger.info('[REACTIVATE][STEP2] user UPDATE', { userId });

      await queryRunner.query(
        `UPDATE users SET status = 'active', "isActive" = true, "updatedAt" = NOW()
         WHERE id = $1 AND status = 'suspended'`,
        [userId]
      );

      // STEP3: Reactivate role_assignments for each membership role
      const reactivatedRoles: string[] = [];
      for (const membership of selectResult) {
        const memberRole = membership.role || 'member';
        logger.info('[REACTIVATE][STEP3] role UPSERT', { userId, role: memberRole });

        await queryRunner.query(
          `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
           VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
           ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
           DO UPDATE SET updated_at = NOW(), is_active = true`,
          [userId, memberRole, reactivatedBy]
        );
        reactivatedRoles.push(memberRole);
      }

      await queryRunner.commitTransaction();

      logger.info('[REACTIVATE][SUCCESS]', {
        userId, reactivatedMemberships: selectResult.length, reactivatedRoles, reactivatedBy,
      });

      return {
        reactivatedMemberships: selectResult.length,
        reactivatedRoles,
        userId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[REACTIVATE][FAILED]', {
        userId, reactivatedBy,
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
   * Delete a member.
   * WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1: soft/hard 2단계 분리
   *
   * soft (기본): users.status='deleted', isActive=false, memberships 비활성
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
        // Hard delete: FK 참조 데이터도 함께 정리 후 users 삭제
        await queryRunner.query(`DELETE FROM service_memberships WHERE user_id = $1`, [userId]);
        await queryRunner.query(`DELETE FROM role_assignments WHERE user_id = $1`, [userId]);
        // organization_members 정리 (FK 참조)
        await queryRunner.query(`DELETE FROM organization_members WHERE user_id = $1`, [userId]);
        // users 삭제 시도 — 남아있는 FK가 있으면 여전히 실패 가능
        await queryRunner.query(`DELETE FROM users WHERE id = $1`, [userId]);

        await queryRunner.commitTransaction();
        logger.info('[ApprovalService] HARD_DELETE_SUCCESS', { userId, deletedBy });
      } else {
        // Soft delete: 비활성화만 수행 (users 삭제 없음)
        await queryRunner.query(
          `UPDATE users SET status = 'deleted', "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
          [userId]
        );
        await queryRunner.query(
          `UPDATE service_memberships SET status = 'inactive', updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );

        await queryRunner.commitTransaction();
        logger.info('[ApprovalService] SOFT_DELETE_SUCCESS', { userId, deletedBy });
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
