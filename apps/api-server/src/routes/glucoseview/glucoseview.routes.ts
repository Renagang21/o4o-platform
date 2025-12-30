/**
 * GlucoseView Routes
 *
 * Phase C-1: GlucoseView API Implementation
 * Route factory for GlucoseView API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createGlucoseViewController } from './controllers/glucoseview.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

/**
 * Scope verification middleware factory for GlucoseView
 */
function requireGlucoseViewScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    // Allow super_admin to bypass scope checks
    if (user?.roles?.includes('super_admin') || user?.role === 'super_admin') {
      return next();
    }

    // Check for admin role
    if (user?.roles?.includes('admin') || user?.role === 'admin') {
      return next();
    }

    // Check for specific scope
    const userScopes = user?.scopes || [];
    if (userScopes.includes(scope) || userScopes.includes('glucoseview:admin')) {
      return next();
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Missing required scope: ${scope}`,
      },
    });
  };
}

/**
 * Create GlucoseView routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router with all GlucoseView routes mounted
 */
export function createGlucoseViewRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with middleware
  const glucoseviewController = createGlucoseViewController(
    dataSource,
    coreRequireAuth as any,
    requireGlucoseViewScope
  );

  router.use('/', glucoseviewController);

  return router;
}
