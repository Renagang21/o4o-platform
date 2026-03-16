/**
 * Platform Services - User-Facing Routes
 *
 * GET  /api/v1/platform-services       — 가시 서비스 목록 (optionalAuth)
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: enrollment 라우트 제거 (service_memberships SSOT)
 */

import { Router, Response } from 'express';
import type { DataSource } from 'typeorm';
import { PlatformServiceCatalogService } from '../../services/platform-service-catalog.service.js';
import { optionalAuth } from '../../common/middleware/auth.middleware.js';
import type { AuthRequest } from '../../common/middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

export function createPlatformServicesRoutes(dataSource: DataSource): Router {
  const router = Router();
  const catalogService = new PlatformServiceCatalogService(dataSource);

  /**
   * GET / — 가시 서비스 목록 (로그인 시 membership status 포함)
   */
  router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const services = await catalogService.listVisibleServicesForUser(userId);

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      logger.error('[PlatformServices] Error listing services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list services',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
