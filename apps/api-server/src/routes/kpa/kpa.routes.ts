/**
 * KPA Routes
 * 약사회 SaaS API 라우트 설정
 *
 * API Namespace: /api/v1/kpa
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createOrganizationController } from './controllers/organization.controller.js';
import { createMemberController } from './controllers/member.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

/**
 * Scope verification middleware factory for KPA
 */
function requireKpaScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check for kpa:* scope or admin role
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    const hasScope = userScopes.includes(scope) || userScopes.includes('kpa:admin');
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
 * Create KPA routes
 */
export function createKpaRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount controllers with auth middleware
  router.use('/organizations', createOrganizationController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/members', createMemberController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/applications', createApplicationController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'kpa', timestamp: new Date().toISOString() });
  });

  return router;
}
