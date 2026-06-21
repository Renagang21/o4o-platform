/**
 * Store Paid Feature Entitlement routes
 * WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
 *
 * V1: read-only. 매장/조직별 이용권 조회 + 활성 판정.
 * Mount: /api/v1/store-entitlements
 *
 * 주의: V1 은 결제/발급(write) 미포함. 메뉴 잠금/오픈은 후속
 *   WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1 에서 이 API 를 소비한다.
 */
import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import { StorePaidFeatureEntitlementService } from './store-paid-feature-entitlement.service.js';
import {
  STORE_PAID_FEATURE_PLAN_CODES,
  type StorePaidFeaturePlanCode,
} from './store-paid-feature-entitlement.entity.js';

export function createStoreEntitlementRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StorePaidFeatureEntitlementService(dataSource);

  // GET /store-entitlements?organizationId=&serviceKey=
  // 조직(+서비스)의 모든 이용권 행. serviceKey 미지정 시 전체.
  router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = req.query.serviceKey ? String(req.query.serviceKey).trim() : undefined;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
          code: 'MISSING_ORGANIZATION_ID',
        });
      }
      const data = await service.listEntitlements(organizationId, serviceKey);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('[StoreEntitlement] list error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /store-entitlements/active?organizationId=&serviceKey=
  // 현재 활성 이용권만.
  router.get('/active', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = String(req.query.serviceKey || '').trim();
      if (!organizationId || !serviceKey) {
        return res.status(400).json({
          success: false,
          error: 'organizationId and serviceKey are required',
          code: 'MISSING_PARAMS',
        });
      }
      const data = await service.getActiveEntitlements(organizationId, serviceKey);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('[StoreEntitlement] active error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /store-entitlements/check?organizationId=&serviceKey=&planCode=
  // 특정 플랜 활성 보유 여부 (메뉴 게이트 판정).
  router.get('/check', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const organizationId = String(req.query.organizationId || '').trim();
      const serviceKey = String(req.query.serviceKey || '').trim();
      const planCode = String(req.query.planCode || '').trim() as StorePaidFeaturePlanCode;
      if (!organizationId || !serviceKey || !planCode) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, serviceKey, planCode are required',
          code: 'MISSING_PARAMS',
        });
      }
      if (!STORE_PAID_FEATURE_PLAN_CODES.includes(planCode)) {
        return res.status(400).json({
          success: false,
          error: `unknown planCode: ${planCode}`,
          code: 'UNKNOWN_PLAN_CODE',
        });
      }
      const active = await service.hasActiveEntitlement(organizationId, serviceKey, planCode);
      return res.json({ success: true, data: { organizationId, serviceKey, planCode, active } });
    } catch (error) {
      logger.error('[StoreEntitlement] check error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
