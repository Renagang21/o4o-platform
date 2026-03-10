/**
 * Cosmetics Routes
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * H2-0: Order Routes 추가
 *
 * Main entry point for cosmetics API routes
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createCosmeticsController } from './controllers/cosmetics.controller.js';
import { createCosmeticsOrderController } from './controllers/cosmetics-order.controller.js';
import { createCosmeticsPaymentController } from './controllers/cosmetics-payment.controller.js';
import { createCosmeticsStoreController } from './controllers/cosmetics-store.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import { createMembershipScopeGuard } from '../../common/middleware/membership-guard.middleware.js';
import type { ServiceScopeGuardConfig } from '@o4o/security-core';

/**
 * Cosmetics Scope Guard — WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1
 *
 * Replaces inline implementation with membership-aware scope guard.
 * Behavior: membership check + cosmetics roles, platform bypass, cross-service deny.
 */
const COSMETICS_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'cosmetics',
  allowedRoles: ['cosmetics:admin', 'cosmetics:operator'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: ['kpa', 'neture', 'glycopharm', 'glucoseview'],
};
const requireCosmeticsScope = createMembershipScopeGuard(COSMETICS_SCOPE_CONFIG);

/**
 * Create cosmetics routes
 */
export function createCosmeticsRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const cosmeticsController = createCosmeticsController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Create order controller (H2-0)
  const orderController = createCosmeticsOrderController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Create payment controller (WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1)
  const paymentController = createCosmeticsPaymentController(
    dataSource,
    coreRequireAuth as any
  );

  // Create store controller (WO-KCOS-STORES-PHASE1-V1)
  const storeController = createCosmeticsStoreController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Mount controllers
  router.use('/', cosmeticsController);
  router.use('/orders', orderController); // H2-0: 주문 엔드포인트
  router.use('/payments', paymentController); // Payment EventHub 연결
  router.use('/stores', storeController); // WO-KCOS-STORES-PHASE1-V1: 매장 관리

  return router;
}

export default createCosmeticsRoutes;
