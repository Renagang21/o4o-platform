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

// WO-O4O-USER-WITHDRAW-LIFECYCLE-V1
export interface WithdrawMemberParams {
  userId: string;
  withdrawnBy: string | null;
  isPlatformAdmin: boolean;
  serviceKeys: string[];
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

      // WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync (best-effort)
      //   기존 rejectMembership 은 단일 statement (transaction 미사용) 패턴이므로 동일 스타일 유지.
      //   sync 실패 시 reject 자체는 성공으로 간주하고 warning 로그만 남김
      //   (kpa_members 가 pending 으로 남아도 서비스 접근에 영향 없음 — service_memberships 가 SSOT).
      if (membership.service_key === 'kpa-society' && membership.user_id) {
        try {
          await AppDataSource.query(
            `UPDATE kpa_members
             SET status = 'rejected', updated_at = NOW()
             WHERE user_id = $1 AND status IN ('pending', 'active')`,
            [membership.user_id]
          );
        } catch (syncError) {
          logger.warn('[ApprovalService] REJECTION_KPA_SYNC_FAILED', {
            membershipId,
            userId: membership.user_id,
            error: syncError instanceof Error ? syncError.message : String(syncError),
          });
        }
      }

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

      // STEP3: WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync
      //   service_key='kpa-society' 인 membership 이 포함된 경우에만 kpa_members.status='suspended'.
      //   status='active' 인 row 만 update (이미 다른 상태이면 덮어쓰지 않음).
      //   identity_status 컬럼은 별도 의미(KpaIdentityStatus)이므로 손대지 않음.
      const hasKpaSocietyMembership = selectResult.some((m: any) => m.service_key === 'kpa-society');
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

      // STEP4: WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 — kpa_members projection sync
      //   service_key='kpa-society' 인 membership 이 포함된 경우에만 kpa_members.status='active'.
      //   status='suspended' 인 row 만 update (다른 상태는 덮어쓰지 않음).
      const hasKpaSocietyMembership = selectResult.some((m: any) => m.service_key === 'kpa-society');
      if (hasKpaSocietyMembership) {
        logger.info('[REACTIVATE][STEP4] kpa_members projection sync', { userId });
        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'active', updated_at = NOW()
           WHERE user_id = $1 AND status = 'suspended'`,
          [userId]
        );
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
    const { userId, withdrawnBy, isPlatformAdmin, serviceKeys } = params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
        await queryRunner.rollbackTransaction();
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
      const hasKpaSociety = affectedServiceKeys.includes('kpa-society');
      if (hasKpaSociety) {
        logger.info('[WITHDRAW][STEP3] kpa_members projection sync', { userId });

        await queryRunner.query(
          `UPDATE kpa_members
           SET status = 'withdrawn', identity_status = 'withdrawn', updated_at = NOW()
           WHERE user_id = $1 AND status NOT IN ('withdrawn')`,
          [userId]
        );
      }

      // STEP4: organization_members — service-scoped 정리
      // Policy: role='member' → 제거 (KPA org scope만)
      //         owner/admin/operator → 유지 + AUDIT warning
      // Store ownership 자동 이전 금지. Orphan resolution 금지.
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

          // Non-member (owner/admin/operator): 유지, AUDIT 로그
          const nonMemberRows = await queryRunner.query(
            `SELECT id, role FROM organization_members
             WHERE user_id = $1 AND organization_id = $2 AND role != 'member'`,
            [userId, kpaOrgId]
          );

          if (nonMemberRows.length > 0) {
            logger.warn('[WITHDRAW][STEP4] Non-member org roles retained — manual review required', {
              userId,
              organizationId: kpaOrgId,
              roles: nonMemberRows.map((r: any) => r.role),
              withdrawnBy,
            });
          }
        }
      }

      // NOTE: users.status 변경하지 않음 — 로그인 유지, MembershipGate가 접근 차단
      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();
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
    } finally {
      await queryRunner.release();
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
        // WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1:
        //   soft delete 도 lifecycle 종료 status 'withdrawn' 으로 일원화.
        //   withdrawMembership() 과 동일 enum 사용 (별도 'inactive' 분리 금지).
        await queryRunner.query(
          `UPDATE service_memberships SET status = 'withdrawn', updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );

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
