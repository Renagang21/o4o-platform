/**
 * Platform Services - Admin Routes
 *
 * GET   /api/v1/admin/platform-services              — 전체 목록
 * PATCH /api/v1/admin/platform-services/:code        — 설정 수정
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: enrollment 관리 라우트 제거 (service_memberships SSOT)
 */

import { Router, Response } from 'express';
import type { DataSource } from 'typeorm';
import { PlatformServiceCatalogService } from '../../services/platform-service-catalog.service.js';
import { requireAuth, requireAdmin } from '../../common/middleware/auth.middleware.js';
import type { AuthRequest } from '../../common/middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

export function createAdminPlatformServicesRoutes(dataSource: DataSource): Router {
  const router = Router();
  const catalogService = new PlatformServiceCatalogService(dataSource);

  // All admin routes require auth + admin role
  router.use(requireAuth);
  router.use(requireAdmin);

  /**
   * GET / — 전체 서비스 목록 (admin)
   */
  router.get('/', async (_req: AuthRequest, res: Response) => {
    try {
      const services = await catalogService.listServices();

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      logger.error('[AdminPlatformServices] Error listing services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list services',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PATCH /:code — 서비스 설정 수정
   */
  router.patch('/:code', async (req: AuthRequest, res: Response) => {
    try {
      const { code } = req.params;
      const allowedFields = [
        'name', 'shortDescription', 'entryUrl', 'serviceType',
        'approvalRequired', 'visibilityPolicy', 'isFeatured',
        'featuredOrder', 'status', 'iconEmoji',
      ];

      const data: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          data[field] = req.body[field];
        }
      }

      const service = await catalogService.updateService(code, data);

      if (!service) {
        return res.status(404).json({
          success: false,
          error: '서비스를 찾을 수 없습니다',
          code: 'SERVICE_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      logger.error('[AdminPlatformServices] Error updating service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update service',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
