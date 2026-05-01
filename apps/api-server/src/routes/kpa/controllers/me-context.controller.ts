/**
 * KPA Me-Context Controller
 *
 * WO-KPA-LOGIN-LATENCY-CLEANUP-V1
 *
 * KPA 전용 사용자 컨텍스트를 반환하는 전용 엔드포인트.
 * /auth/login 및 /auth/me에서 KPA enrichment를 분리하여
 * 인증은 경량화하고, KPA context는 별도 API로 제공한다.
 *
 * GET /api/v1/kpa/me-context
 *
 * 반환: activityType, pharmacistRole, isStoreOwner, kpaMembership
 * 단일 SQL (5개 LEFT JOIN)으로 기존 5개 순차 쿼리 대체.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

interface AuthRequest extends Request {
  user?: { id: string; [key: string]: any };
}

export function createMeContextController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // 단일 쿼리: 기존 5개 순차 쿼리 (derivePharmacistQualification 2개 +
    // kpa_pharmacist_profiles 중복 1개 + deriveKpaMembershipContext 2개)를
    // 1개 LEFT JOIN 쿼리로 통합
    const rows = await dataSource.query(`
      SELECT
        pp.activity_type,
        CASE WHEN ra.user_id IS NOT NULL THEN true ELSE false END AS is_store_owner,
        km.status AS member_status,
        km.role AS member_role,
        km.membership_type,
        km.organization_id,
        o.name AS org_name,
        o.type AS org_type,
        om.role AS org_member_role
      FROM users u
      LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = u.id
      LEFT JOIN (
        SELECT user_id FROM role_assignments
        WHERE user_id = $1
          AND role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner')
          AND is_active = true
        LIMIT 1
      ) ra ON ra.user_id = u.id
      LEFT JOIN kpa_members km ON km.user_id = u.id
      LEFT JOIN organizations o ON o.id = km.organization_id
      LEFT JOIN organization_members om ON om.user_id = u.id AND om.left_at IS NULL
      WHERE u.id = $1
      LIMIT 1
    `, [userId]);

    const context = rows?.[0];

    if (!context) {
      res.json({ success: true, data: null });
      return;
    }

    // isStoreOwner 판정
    const isStoreOwner = context.is_store_owner === true || context.is_store_owner === 't';
    const activityType: string | null = context.activity_type || null;

    // pharmacistRole 판정 (기존 derivePharmacistQualification 로직 동일)
    let pharmacistRole: string | null = null;
    if (isStoreOwner) {
      pharmacistRole = 'pharmacy_owner';
    } else if (activityType) {
      pharmacistRole = 'general';
    }

    // serviceAccess 매트릭스 (기존 deriveKpaMembershipContext 로직 동일)
    let serviceAccess: string | null = null;
    if (context.member_status === 'pending') {
      serviceAccess = 'pending';
    } else if (context.member_status === 'suspended' || context.member_status === 'withdrawn') {
      serviceAccess = 'blocked';
    } else if (context.member_status === 'active') {
      serviceAccess = context.org_member_role ? 'full' : 'community-only';
    }

    // kpaMembership 구성 (KPA 회원이 아닌 경우 null)
    const kpaMembership = context.member_status ? {
      status: context.member_status,
      role: context.member_role,
      membershipType: context.membership_type || null,
      organizationId: context.organization_id || null,
      organizationName: context.org_name || null,
      organizationType: context.org_type || null,
      organizationRole: context.org_member_role || null,
      serviceAccess,
    } : null;

    res.json({
      success: true,
      data: {
        activityType,
        pharmacistRole,
        pharmacistFunction: activityType,
        isStoreOwner,
        kpaMembership,
      },
    });
  }));

  return router;
}
