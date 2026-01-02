/**
 * K-Shopping Routes
 *
 * K-Shopping (여행자 서비스) API 라우트 팩토리
 * Route factory for K-Shopping API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminController } from './controllers/admin.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

/**
 * Scope verification middleware factory for K-Shopping
 */
function requireKShoppingScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check for k-shopping:admin scope or admin role
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    const hasScope = userScopes.includes(scope) || userScopes.includes('k-shopping:admin');
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
 * Create K-Shopping routes
 */
export function createKShoppingRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Application routes (participant applications)
  const applicationController = createApplicationController(
    dataSource,
    coreRequireAuth as any,
    requireKShoppingScope
  );
  router.use('/', applicationController);

  // Admin routes (operator/admin application review)
  const adminController = createAdminController(
    dataSource,
    coreRequireAuth as any,
    requireKShoppingScope
  );
  router.use('/', adminController);

  return router;
}
