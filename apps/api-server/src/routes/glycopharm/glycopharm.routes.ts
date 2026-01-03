/**
 * Glycopharm Routes
 *
 * Phase B-1: Glycopharm API Implementation
 * Route factory for Glycopharm API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createGlycopharmController } from './controllers/glycopharm.controller.js';
import { createDisplayController } from './controllers/display.controller.js';
import { createForumRequestController } from './controllers/forum-request.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminController } from './controllers/admin.controller.js';
import { createOrderController } from './controllers/order.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

/**
 * Scope verification middleware factory for Glycopharm
 */
function requireGlycopharmScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check for glycopharm:admin scope or admin role
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    const hasScope = userScopes.includes(scope) || userScopes.includes('glycopharm:admin');
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

    if (!hasScope && !isAdmin) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` },
      });
      return;
    }

    next();
  };
}

/**
 * Create Glycopharm routes
 */
export function createGlycopharmRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Core pharmacy/product routes
  const glycopharmController = createGlycopharmController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', glycopharmController);

  // Smart Display routes
  const displayController = createDisplayController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/display', displayController);

  // Forum Category Request routes
  const forumRequestController = createForumRequestController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/forum-requests', forumRequestController);

  // Application routes (pharmacy participation/service applications)
  const applicationController = createApplicationController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', applicationController);

  // Admin routes (operator/admin application review)
  const adminController = createAdminController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', adminController);

  // Order routes (H8-2)
  const orderController = createOrderController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/orders', orderController);

  return router;
}
