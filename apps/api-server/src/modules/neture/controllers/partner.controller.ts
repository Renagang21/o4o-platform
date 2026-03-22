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

  // Mount sub-controllers — order preserved from original file
  router.use('/', createPartnerRecruitmentController({ dataSource, netureService, requireActiveSupplier }));
  router.use('/', createPartnerDashboardController({ dataSource, partnerService, netureService, requireActivePartner, requireLinkedPartner }));
  router.use('/', createPartnerCommerceController({ dataSource, netureService, partnerService, commissionService, requireActivePartner, requireLinkedPartner }));
  router.use('/', createAdminPartnerController({ partnerService }));

  return router;
}
