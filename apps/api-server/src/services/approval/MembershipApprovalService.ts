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
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'active', 'inactive', 'deleted', 'rejected')`,
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
        const storeOwnerRows = await queryRunner.query(
          `UPDATE role_assignments SET is_active = false, updated_at = NOW()
           WHERE user_id = $1 AND role = $2 AND is_active = true
           RETURNING id`,
          [userId, 'kpa:store_owner']
        );
        if ((storeOwnerRows?.length ?? 0) > 0) {
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
          const restoredRows = await queryRunner.query(
            `UPDATE role_assignments SET is_active = true, updated_at = NOW()
             WHERE user_id = $1 AND role = $2 AND is_active = false
             RETURNING id`,
            [userId, 'kpa:store_owner']
          );
          if ((restoredRows?.length ?? 0) > 0) {
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
          const ownerCleanupRows = await queryRunner.query(
            `UPDATE organization_members
             SET left_at = NOW(), updated_at = NOW()
             WHERE user_id = $1 AND organization_id = $2 AND role = 'owner' AND left_at IS NULL
             RETURNING id`,
            [userId, kpaOrgId]
          );
          const ownerSoftCleanupCount = ownerCleanupRows?.length ?? 0;
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
