/**
 * PartnerController — Facade
 * WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1
 *
 * Composes 4 sub-controllers:
 *   partner-recruitment.controller.ts  — recruiting + applications (5 endpoints)
 *   partner-dashboard.controller.ts    — dashboard items + content linking (10 endpoints)
 *   partner-commerce.controller.ts     — contracts + commissions + affiliate + settlements (10 endpoints)
 *   admin-partner.controller.ts        — admin partner monitoring + settlements (6 endpoints)
 *
 * Mounted at `/` prefix (NOT `/partner`!) because routes have mixed prefixes.
 */
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import {
  createRequireActivePartner,
  createRequireLinkedPartner,
  createRequireActiveSupplier,
} from '../middleware/neture-identity.middleware.js';
import { PartnerService } from '../services/partner.service.js';
import { PartnerCommissionService } from '../services/partner-commission.service.js';
import { NetureService } from '../neture.service.js';
import { createPartnerRecruitmentController } from './partner-recruitment.controller.js';
import { createPartnerDashboardController } from './partner-dashboard.controller.js';
import { createPartnerCommerceController } from './partner-commerce.controller.js';
import { createAdminPartnerController } from './admin-partner.controller.js';
import type { Response } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/neture-identity.middleware.js';
import { NeturePartnerServiceApplicationService } from '../services/neture-partner-service-application.service.js';
import logger from '../../../utils/logger.js';

export function createPartnerController(dataSource: DataSource): Router {
  const router = Router();

  // Shared service instances (instantiated once)
  const partnerService = new PartnerService(dataSource);
  const netureService = new NetureService();
  const commissionService = new PartnerCommissionService(dataSource);

  // Shared middleware instances (instantiated once)
  const requireActivePartner = createRequireActivePartner(dataSource);
  const requireLinkedPartner = createRequireLinkedPartner(dataSource);
  const requireActiveSupplier = createRequireActiveSupplier(dataSource);

  // WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1:
  //   POST /partner/register — 로그인 회원 본인의 파트너 서비스 신청 (supplier/register 의 대칭).
  //   O4O 계정 생성이 아니라 기존 계정의 서비스 신청이다. 승인은 /operator/partners/:id/approve.
  const applicationService = new NeturePartnerServiceApplicationService(dataSource);
  router.post('/partner/register', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }
      const { name, businessName, description } = req.body || {};
      const result = await applicationService.applyPartner(userId, { name, businessName, description });
      if (!result.success) {
        const statusMap: Record<string, number> = { MISSING_NAME: 400, USER_NOT_FOUND: 404, USER_ALREADY_HAS_PARTNER: 409 };
        return res
          .status(statusMap[result.error!] || 400)
          .json({ success: false, error: { code: result.error, message: result.error }, data: result.data });
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Neture API] Error registering partner:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register partner' } });
    }
  });

  // Mount sub-controllers — order preserved from original file
  router.use('/', createPartnerRecruitmentController({ dataSource, netureService, requireActiveSupplier }));
  router.use('/', createPartnerDashboardController({ dataSource, partnerService, netureService, requireActivePartner, requireLinkedPartner }));
  router.use('/', createPartnerCommerceController({ dataSource, netureService, partnerService, commissionService, requireActivePartner, requireLinkedPartner }));
  router.use('/', createAdminPartnerController({ partnerService }));

  return router;
}
