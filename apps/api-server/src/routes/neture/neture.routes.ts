/**
 * Neture Routes
 *
 * Phase D-1: Neture API Server 골격 구축
 * Phase G-3: 주문/결제 플로우 구현
 * Main entry point for Neture API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { createNetureController } from './controllers/neture.controller.js';
import { createPaymentController } from './controllers/payment.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';

/**
 * Neture scope verification middleware
 * Checks if user has required scope in their JWT
 */
function requireNetureScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // Get scopes from user object (set by auth middleware)
    const userScopes = authReq.user?.scopes || [];

    // Check if user has the required scope or admin scope
    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('neture:admin') ||
      userScopes.includes('admin') ||
      authReq.user?.roles?.includes('admin')
    ) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'NETURE_403',
        message: `Permission denied. Required scope: ${requiredScope}`,
      },
    });
  };
}

/**
 * Create Neture routes
 */
export function createNetureRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const netureController = createNetureController(
    dataSource,
    coreRequireAuth as any,
    requireNetureScope
  );

  // Create payment controller
  const paymentController = createPaymentController(
    dataSource,
    coreRequireAuth as any
  );

  // Mount controllers
  router.use('/', netureController);
  router.use('/payments', paymentController);

  return router;
}

export default createNetureRoutes;
