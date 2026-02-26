/**
 * Pharmacy Store Config Controller
 *
 * WO-PHARMACY-HUB-REALIGN-PHASEH2-V1
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
 *
 * GET  /pharmacy/store/config — 현재 매장 설정 조회
 * PUT  /pharmacy/store/config — 매장 설정 저장 (JSON 전체 overwrite)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../entities/organization-store.entity.js';
import { KpaAuditLog } from '../entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createPharmacyStoreConfigController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

  // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 middleware
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // GET /config — 매장 설정 조회
  router.get('/config', requireAuth, requireStoreOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;

    const org = await orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      res.status(404).json({ success: false, error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        organizationId: org.id,
        organizationName: org.name,
        storefrontConfig: (org as any).storefront_config || {},
      },
    });
  }));

  // PUT /config — 매장 설정 저장
  router.put('/config', requireAuth, requireStoreOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;

    const config = req.body;
    if (!config || typeof config !== 'object') {
      res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } });
      return;
    }

    // JSON 전체 overwrite
    await orgRepo
      .createQueryBuilder()
      .update(OrganizationStore)
      .set({ storefront_config: config } as any)
      .where('id = :id', { id: organizationId })
      .execute();

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'store_owner',
        action_type: 'STOREFRONT_CONFIG_UPDATED' as any,
        target_type: 'content' as any,
        target_id: organizationId,
        metadata: { keys: Object.keys(config) },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write storefront config audit:', e);
    }

    res.json({
      success: true,
      data: {
        organizationId,
        storefrontConfig: config,
      },
    });
  }));

  return router;
}
