/**
 * Cosmetics Supplier Extension Routes
 *
 * 공급사 확장 API 라우트
 * Prefix: /api/v1/supplier
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createSupplierProfileController } from '../controllers/supplier-profile.controller';
import { createPricePolicyController } from '../controllers/price-policy.controller';
import { createSampleSupplyController } from '../controllers/sample-supply.controller';
import { createApprovalController } from '../controllers/approval.controller';
import { createCampaignController } from '../controllers/campaign.controller';

export function createSupplierExtensionRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount controllers
  router.use('/profile', createSupplierProfileController(dataSource));
  router.use('/price-policy', createPricePolicyController(dataSource));
  router.use('/sample', createSampleSupplyController(dataSource));
  router.use('/approval', createApprovalController(dataSource));
  router.use('/campaign', createCampaignController(dataSource));

  return router;
}

export { createSupplierExtensionRoutes as createRoutes };
