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
      // 1. Activate membership
      const result = isPlatformAdmin
        ? await queryRunner.query(
            `UPDATE service_memberships
             SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'rejected')
             RETURNING id, user_id, service_key, role, status`,
            [approvedBy, membershipId]
          )
        : await queryRunner.query(
            `UPDATE service_memberships
             SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'rejected') AND service_key = ANY($3)
             RETURNING id, user_id, service_key, role, status`,
            [approvedBy, membershipId, serviceKeys]
          );

      if (result.length === 0) {
        await queryRunner.rollbackTransaction();
        return null;
      }

      const membership = result[0] as ApproveResult;

      // 2. Activate user account (idempotent)
      await queryRunner.query(
        `UPDATE users SET status = 'ACTIVE', "isActive" = true,
         "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'rejected')`,
        [approvedBy, membership.user_id]
      );

      // 3. Ensure role_assignment exists (idempotent — ON CONFLICT updates timestamp)
      const memberRole = membership.role || 'member';
      await queryRunner.query(
        `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
         DO UPDATE SET updated_at = NOW(), is_active = true`,
        [membership.user_id, memberRole, approvedBy]
      );

      await queryRunner.commitTransaction();

      logger.info('[ApprovalService] APPROVAL_SUCCESS', {
        membershipId,
        userId: membership.user_id,
        role: memberRole,
        approvedBy,
        serviceKey: membership.service_key,
      });

      return membership;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('[ApprovalService] APPROVAL_FAILED', {
        membershipId,
        approvedBy,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
   * Delete a member (atomic: memberships + roles + user).
   * Returns true if deleted, false if user not found in scope.
   */
  async deleteMember(params: DeleteMemberParams): Promise<boolean> {
    const { userId, deletedBy, isPlatformAdmin, serviceKeys } = params;
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

      await queryRunner.query(`DELETE FROM service_memberships WHERE user_id = $1`, [userId]);
      await queryRunner.query(`DELETE FROM role_assignments WHERE user_id = $1`, [userId]);
      await queryRunner.query(`DELETE FROM users WHERE id = $1`, [userId]);

      await queryRunner.commitTransaction();

      logger.info('[ApprovalService] DELETE_SUCCESS', { userId, deletedBy });

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('[ApprovalService] DELETE_FAILED', {
        userId,
        deletedBy,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
