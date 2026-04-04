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
import {
  derivePharmacistQualification,
  deriveKpaMembershipContext,
} from './auth-helpers.js';

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
      // Phase3-E: roles from JWT payload (set at login from role_assignments)
      const roles = req.user.roles || [];

      // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: scopes 계산
      const scopes = deriveUserScopes({
        role: roles[0] || 'user',
        roles,
      });

      const userData = req.user.toPublicData?.() || {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
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
      ud0.displayName =
        (req.user.lastName || req.user.firstName)
          ? `${req.user.lastName || ''}${req.user.firstName || ''}`.trim()
          : req.user.name || req.user.email?.split('@')[0] || '사용자';

      // WO-ROLE-NORMALIZATION-PHASE3-B-V1: derive from kpa_pharmacist_profiles + organization_members
      const qualification = await derivePharmacistQualification(req.user.id);
      const ud = userData as Record<string, unknown>;
      ud.pharmacistRole = qualification.pharmacistRole;
      ud.pharmacistFunction = qualification.pharmacistFunction;
      ud.isStoreOwner = qualification.isStoreOwner;

      // activityType from kpa_pharmacist_profiles (required for setup-activity gate)
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [req.user.id]
        );
        ud.activityType = profile?.activity_type || null;
      } catch { ud.activityType = null; }

      // WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: KPA membership context 통합
      const kpaMembership = await deriveKpaMembershipContext(req.user.id);
      ud.kpaMembership = kpaMembership;

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
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
      // 1. SSOT: kpa_pharmacist_profiles
      await AppDataSource.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, activity_type)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET activity_type = $2, updated_at = NOW()`,
        [userId, resolvedActivityType]
      );

      // 2. Mirror: kpa_members.activity_type (denormalized sync)
      await AppDataSource.query(
        `UPDATE kpa_members SET activity_type = $2 WHERE user_id = $1`,
        [userId, resolvedActivityType]
      );

      // 3. WO-KPA-A-PHARMACIST-ACTIVITY-TYPE-BUSINESS-INFO-FLOW-V1:
      //    businessInfo → users.businessInfo JSONB (merge with existing)
      if (businessInfo && typeof businessInfo === 'object') {
        const allowedFields = ['businessName', 'phone', 'storeAddress', 'address', 'address2', 'zipCode'];
        const sanitized: Record<string, any> = {};
        for (const key of allowedFields) {
          if (businessInfo[key] !== undefined) sanitized[key] = businessInfo[key];
        }
        if (Object.keys(sanitized).length > 0) {
          const [existingUser] = await AppDataSource.query(
            `SELECT "businessInfo" FROM users WHERE id = $1`, [userId]
          );
          const merged = { ...(existingUser?.businessInfo || {}), ...sanitized };
          await AppDataSource.query(
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
        await AppDataSource.query(
          `UPDATE kpa_members SET pharmacy_name = COALESCE($2, pharmacy_name), pharmacy_address = COALESCE($3, pharmacy_address) WHERE user_id = $1`,
          [userId, pName, pAddr]
        );
      }

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

      // WO-ROLE-NORMALIZATION-PHASE3-B-V1: derive from kpa_pharmacist_profiles + organization_members
      const qualification = await derivePharmacistQualification(req.user.id);
      const ud = userData as Record<string, unknown>;
      ud.pharmacistRole = qualification.pharmacistRole;
      ud.pharmacistFunction = qualification.pharmacistFunction;
      ud.isStoreOwner = qualification.isStoreOwner;

      // activityType from kpa_pharmacist_profiles (required for setup-activity gate)
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [req.user.id]
        );
        ud.activityType = profile?.activity_type || null;
      } catch { ud.activityType = null; }

      // kpaMembership context (required for membershipType on frontend)
      ud.kpaMembership = await deriveKpaMembershipContext(req.user.id);

      // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1: Include service memberships
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
