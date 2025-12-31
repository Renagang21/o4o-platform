/**
 * Dropshipping Admin Routes
 *
 * DS-3: Main entry point for Dropshipping Admin API routes
 * All endpoints under /dropshipping/admin/* require:
 * - Authentication (JWT)
 * - dropshipping:admin scope
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { createDropshippingAdminController } from './controllers/dropshipping-admin.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';

/**
 * Dropshipping scope verification middleware
 * Checks if user has required scope in their JWT
 */
function requireDropshippingScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // Get scopes from user object (set by auth middleware)
    const userScopes = authReq.user?.scopes || [];
    const userRoles = authReq.user?.roles || [];

    // Check if user has the required scope or admin scope
    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('dropshipping:admin') ||
      userScopes.includes('admin') ||
      userRoles.includes('admin') ||
      userRoles.includes('super_admin')
    ) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'DS_403',
        message: `Permission denied. Required scope: ${requiredScope}`,
      },
    });
  };
}

/**
 * Create dropshipping admin routes
 */
export function createDropshippingAdminRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const dropshippingController = createDropshippingAdminController(
    dataSource,
    coreRequireAuth as (req: Request, res: Response, next: NextFunction) => void,
    requireDropshippingScope
  );

  // Mount controller at /admin prefix
  // Full path will be: /dropshipping/admin/*
  router.use('/admin', dropshippingController);

  return router;
}

export default createDropshippingAdminRoutes;
