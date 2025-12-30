/**
 * Yaksa Routes
 *
 * Phase A-1: Yaksa API Implementation
 * Main entry point for Yaksa API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { createYaksaController } from './controllers/yaksa.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';

/**
 * Yaksa scope verification middleware
 * Checks if user has required scope in their JWT
 */
function requireYaksaScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // Get scopes from user object (set by auth middleware)
    const userScopes = authReq.user?.scopes || [];

    // Check if user has the required scope or admin scope
    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('yaksa:admin') ||
      userScopes.includes('admin') ||
      authReq.user?.roles?.includes('admin')
    ) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'YAKSA_403',
        message: `Permission denied. Required scope: ${requiredScope}`,
      },
    });
  };
}

/**
 * Create Yaksa routes
 */
export function createYaksaRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const yaksaController = createYaksaController(
    dataSource,
    coreRequireAuth as any,
    requireYaksaScope
  );

  // Mount controller
  router.use('/', yaksaController);

  return router;
}

export default createYaksaRoutes;
