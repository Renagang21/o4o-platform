/**
 * Cosmetics Routes
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * H2-0: Order Routes 추가
 *
 * Main entry point for cosmetics API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { createCosmeticsController } from './controllers/cosmetics.controller.js';
import { createCosmeticsOrderController } from './controllers/cosmetics-order.controller.js';
import { createCosmeticsPaymentController } from './controllers/cosmetics-payment.controller.js';
import { createCosmeticsStoreController } from './controllers/cosmetics-store.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../utils/role.utils.js';

/**
 * Cosmetics scope verification middleware
 *
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.4: K-Cosmetics)
 * - **Cosmetics 비즈니스 서비스는 cosmetics:* role + platform:admin 신뢰**
 * - Priority 1: Cosmetics prefixed roles + platform admin
 * - Priority 2: Legacy role detection → Log + DENY
 * - Cross-service isolation: Other service roles DENY
 */
function requireCosmeticsScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'unknown';
    const userRoles = authReq.user?.roles || [];

    // Get scopes from user object (set by auth middleware)
    const userScopes = authReq.user?.scopes || [];

    // Check if user has the required scope or cosmetics:admin scope
    const hasScope =
      userScopes.includes(requiredScope) ||
      userScopes.includes('cosmetics:admin');

    // Priority 1: Check Cosmetics-specific prefixed roles + platform admin
    const hasCosmeticsRole = hasAnyServiceRole(userRoles, [
      'cosmetics:admin',
      'cosmetics:operator',
      'platform:admin',
      'platform:super_admin'
    ]);

    if (hasScope || hasCosmeticsRole) {
      return next();
    }

    // Priority 2: Detect legacy roles and DENY with detailed error
    const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
    const detectedLegacyRoles = userRoles.filter((r: string) => legacyRoles.includes(r));

    if (detectedLegacyRoles.length > 0) {
      // Log legacy role usage
      detectedLegacyRoles.forEach((role: string) => {
        logLegacyRoleUsage(userId, role, 'cosmetics.routes:requireCosmeticsScope');
      });

      return res.status(403).json({
        error: {
          code: 'COSMETICS_403',
          message: `Required scope: ${requiredScope}. Legacy roles are no longer supported. Please use cosmetics:* or platform:* prefixed roles.`,
        },
      });
    }

    // Detect other service roles and deny
    const hasOtherServiceRole = userRoles.some((r: string) =>
      r.startsWith('kpa:') ||
      r.startsWith('neture:') ||
      r.startsWith('glycopharm:') ||
      r.startsWith('glucoseview:')
    );

    if (hasOtherServiceRole) {
      return res.status(403).json({
        error: {
          code: 'COSMETICS_403',
          message: `Required scope: ${requiredScope}. Cross-service access denied. Cosmetics requires cosmetics:* or platform:* roles.`,
        },
      });
    }

    // Default deny
    return res.status(403).json({
      error: {
        code: 'COSMETICS_403',
        message: `Permission denied. Required scope: ${requiredScope}`,
      },
    });
  };
}

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
