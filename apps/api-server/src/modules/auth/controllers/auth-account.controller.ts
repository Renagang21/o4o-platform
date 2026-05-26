/**
 * @core O4O_PLATFORM_CORE — Auth
 * Auth Account Controller: me, status, updateProfile
 * Split from auth.controller.ts (WO-O4O-AUTH-CONTROLLER-SPLIT-V1)
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { deriveUserScopes } from '../../../utils/scope-assignment.utils.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import { getCachedRoles, setCachedRoles } from '../utils/role-cache.js';
import { derivePharmacistQualification } from './auth-helpers.js';

export class AuthAccountController extends BaseController {
  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  static async me(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      // WO-O4O-AUTH-ROLE-FRESHEN-V1:
      //   roles는 role_assignments(SSOT) 기준으로 fresh 조회하되 60s in-memory 캐시.
      //   캐시 무효화는 assignRole/removeRole 시점에 즉시 수행.
      //   DB 실패 시 JWT payload로 fallback (/auth/me는 500을 내면 안 되는 hot path).
      let roles = getCachedRoles(req.user.id);
      if (!roles) {
        try {
          roles = await roleAssignmentService.getRoleNames(req.user.id);
          setCachedRoles(req.user.id, roles);
        } catch (cacheError: any) {
          logger.warn('[AuthAccountController.me] Role fresh query failed, falling back to JWT payload', {
            error: cacheError?.message,
            userId: req.user.id,
          });
          roles = req.user.roles || [];
        }
      }

      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 계산
      const scopes = deriveUserScopes({
        role: roles[0] || 'user',
        roles,
      });

      const userData = req.user.toPublicData?.() || {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        // WO-O4O-KPA-FORUM-DISPLAYNAME-NICKNAME-ALIGNMENT-V1: nickname fallback
        nickname: req.user.nickname || null,
        role: roles[0] || 'user',
        roles,  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE1-V1
        status: req.user.status,
        scopes: [] as string[],
      };

      // roles / scopes 주입 (toPublicData 이미 roles 포함하지만 일관성 보장)
      userData.roles = roles;
      userData.scopes = scopes;

      // WO-O4O-NAME-NORMALIZATION-V1: firstName, lastName, displayName 추가
      const ud0 = userData as Record<string, unknown>;
      ud0.firstName = req.user.firstName || null;
      ud0.lastName = req.user.lastName || null;
      // WO-O4O-KPA-FORUM-DISPLAYNAME-NICKNAME-ALIGNMENT-V1:
      //   toPublicData() 가 nickname 을 포함하지 않는 fallback 경로에서도 일관 노출.
      ud0.nickname = req.user.nickname || null;
      ud0.displayName =
        (req.user.lastName || req.user.firstName)
          ? `${req.user.lastName || ''}${req.user.firstName || ''}`.trim()
          : req.user.name || req.user.email?.split('@')[0] || '사용자';

      // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA enrichment 제거
      // pharmacistQualification, activityType, kpaMembership는
      // 프론트엔드에서 GET /api/v1/kpa/me-context로 별도 조회

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
      const ud = userData as Record<string, unknown>;
      try {
        ud.memberships = await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status, role FROM service_memberships WHERE user_id = $1`,
          [req.user.id]
        );
      } catch { ud.memberships = []; }

      return BaseController.ok(res, { user: userData });
    } catch (error: any) {
      logger.error('[AuthAccountController.me] Get user error', {
        error: error.message,
        userId: req.user.id,
      });

      return BaseController.error(res, 'Failed to get user data');
    }
  }

  /**
   * PATCH /api/v1/auth/me/profile
   * Update pharmacist profile (pharmacistFunction)
   *
   * WO-ROLE-NORMALIZATION-PHASE3-B-V1:
   * kpa_pharmacist_profiles에 UPSERT (users 테이블 대신)
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    // WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1:
    // activityType 직접 수용 (프론트 계약) + pharmacistFunction 하위 호환
    const { pharmacistFunction, activityType: rawActivityType, businessInfo } = req.body;

    const validActivityTypes = [
      'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
      'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
    ];
    const functionToActivity: Record<string, string> = {
      pharmacy: 'pharmacy_employee', hospital: 'hospital',
      industry: 'other_industry', other: 'other',
    };

    // activityType 직접 전송 우선, pharmacistFunction 레거시 매핑 폴백
    let resolvedActivityType: string | null = null;
    if (rawActivityType && validActivityTypes.includes(rawActivityType)) {
      resolvedActivityType = rawActivityType;
    } else if (pharmacistFunction && functionToActivity[pharmacistFunction]) {
      resolvedActivityType = functionToActivity[pharmacistFunction];
    }

    if (!resolvedActivityType) {
      return BaseController.error(res, 'No fields to update', 400);
    }

    try {
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
      //   FLOW P (PATCH /auth/me/profile) atomic transaction.
      //   기존 4 separate query → 단일 transaction 으로 묶어 partial failure 시 전체 rollback.
      await AppDataSource.transaction(async (manager) => {
        // WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1:
        //   변경 전 직역 조회 (UPSERT 후엔 새 값으로 덮여있어 비교 불가).
        //   pharmacy_owner → 다른 직역 전환 감지에 사용 (아래 step 5).
        const [prevProfile] = await manager.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1`,
          [userId]
        );
        const prevActivityType: string | null = prevProfile?.activity_type ?? null;

        // 1. SSOT: kpa_pharmacist_profiles
        await manager.query(
          `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
          [userId, resolvedActivityType]
        );

        // 2. Mirror: kpa_members.activity_type (denormalized sync)
        await manager.query(
          `UPDATE kpa_members SET activity_type = $2 WHERE user_id = $1`,
          [userId, resolvedActivityType]
        );

        // 3. WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1:
        //    businessInfo → users.businessInfo JSONB (merge with existing)
        // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
        //    allowed list 에 ceoName / taxInvoiceEmail / managerPhone / businessNumber 추가.
        //    representativeName / taxEmail (legacy) 은 client 가 보내도 무시 (canonical key 만 저장).
        if (businessInfo && typeof businessInfo === 'object') {
          const allowedFields = [
            'businessName', 'businessNumber', 'businessType',
            // Canonical (WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1)
            'businessItem', 'representativeName', 'taxInvoiceEmail', 'managerPhone', 'contactName',
            'businessAddress', 'businessAddressDetail', 'zipCode',
            'phone', 'storeAddress',
            // Legacy read-fallback (accept writes for backward compat, canonical takes precedence)
            'businessCategory', 'ceoName', 'address', 'address2',
          ];
          const sanitized: Record<string, any> = {};
          for (const key of allowedFields) {
            if (businessInfo[key] !== undefined) sanitized[key] = businessInfo[key];
          }
          if (Object.keys(sanitized).length > 0) {
            const [existingUser] = await manager.query(
              `SELECT "businessInfo" FROM users WHERE id = $1`, [userId]
            );
            const merged = { ...(existingUser?.businessInfo || {}), ...sanitized };
            await manager.query(
              `UPDATE users SET "businessInfo" = $1 WHERE id = $2`,
              [JSON.stringify(merged), userId]
            );
          }
        }

        // 4. pharmacy_owner → kpa_members.pharmacy_name/pharmacy_address mirror
        if (resolvedActivityType === 'pharmacy_owner' && businessInfo) {
          const pName = businessInfo.businessName || null;
          const pAddr = businessInfo.storeAddress
            ? [businessInfo.storeAddress.zipCode, businessInfo.storeAddress.baseAddress, businessInfo.storeAddress.detailAddress].filter(Boolean).join(' ')
            : (businessInfo.address || null);
          await manager.query(
            `UPDATE kpa_members SET pharmacy_name = COALESCE($2, pharmacy_name), pharmacy_address = COALESCE($3, pharmacy_address) WHERE user_id = $1`,
            [userId, pName, pAddr]
          );
        }

        // 5. WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1:
        //    pharmacy_owner → 다른 직역 전환 시 kpa:store_owner role 비활성화.
        //    AdminUserController.revokeRoleAssignment 와 동일한 raw SQL soft delete 패턴.
        //    is_active = true 가드로 멱등성 보장 (중복 호출 무해).
        //    부여 방향(다른 직역 → pharmacy_owner) 은 frontend 가드
        //    (WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1) 로 차단되어
        //    본 경로에서는 거의 발생하지 않음 — 본 WO 범위 외.
        if (prevActivityType === 'pharmacy_owner' && resolvedActivityType !== 'pharmacy_owner') {
          await manager.query(
            `UPDATE role_assignments
             SET is_active = false, updated_at = NOW()
             WHERE user_id = $1 AND role = 'kpa:store_owner' AND is_active = true`,
            [userId]
          );
        }
      });

      const qualification = await derivePharmacistQualification(userId);
      return BaseController.ok(res, {
        pharmacistFunction: qualification.pharmacistFunction,
        pharmacistRole: qualification.pharmacistRole,
        isStoreOwner: qualification.isStoreOwner,
        activityType: resolvedActivityType,
      });
    } catch (error: any) {
      logger.error('[AuthAccountController.updateProfile] Update failed', {
        error: error.message,
        userId,
      });
      return BaseController.error(res, 'Failed to update profile');
    }
  }

  /**
   * GET /api/v1/auth/status
   * Check authentication status (public endpoint)
   */
  static async status(req: AuthRequest, res: Response): Promise<any> {
    const authenticated = !!req.user;

    let userData = null;
    if (authenticated && req.user) {
      userData = req.user.toPublicData?.() || req.user;
      // Phase3-E: Fresh RA query for current roles on status check
      const roles = await roleAssignmentService.getRoleNames(req.user.id);
      userData.roles = roles;
      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 주입
      const scopes = deriveUserScopes({
        role: roles[0] || 'user',
        roles,
      });
      userData.scopes = scopes;

      // WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA enrichment 제거
      // pharmacistQualification, activityType, kpaMembership는
      // 프론트엔드에서 GET /api/v1/kpa/me-context로 별도 조회

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
      const ud = userData as Record<string, unknown>;
      try {
        ud.memberships = await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status, role FROM service_memberships WHERE user_id = $1`,
          [req.user.id]
        );
      } catch { ud.memberships = []; }
    }

    return BaseController.ok(res, {
      authenticated,
      user: userData,
    });
  }
}
