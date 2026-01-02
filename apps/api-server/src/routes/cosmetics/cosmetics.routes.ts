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
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';

/**
 * Cosmetics scope verification middleware
 * Checks if user has required scope in their JWT
 */
function requireCosmeticsScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // Get scopes from user object (set by auth middleware)
    const userScopes = authReq.user?.scopes || [];

    // Check if user has the required scope or admin scope
    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('cosmetics:admin') ||
      userScopes.includes('admin') ||
      authReq.user?.roles?.includes('admin')
    ) {
      return next();
    }

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
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Mount controllers
  router.use('/', cosmeticsController);
  router.use('/orders', orderController); // H2-0: 주문 엔드포인트

  return router;
}

export default createCosmeticsRoutes;
