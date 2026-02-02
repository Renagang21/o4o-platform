/**
 * Platform Services - User-Facing Routes
 *
 * GET  /api/v1/platform-services       — 가시 서비스 목록 (optionalAuth)
 * GET  /api/v1/platform-services/my    — 내 서비스 (requireAuth)
 * POST /api/v1/platform-services/:code/apply — 이용 신청 (requireAuth)
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { PlatformServiceCatalogService } from '../../services/platform-service-catalog.service.js';
import { requireAuth, optionalAuth } from '../../common/middleware/auth.middleware.js';
import type { AuthRequest } from '../../common/middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

export function createPlatformServicesRoutes(dataSource: DataSource): Router {
  const router = Router();
  const catalogService = new PlatformServiceCatalogService(dataSource);

  /**
   * GET / — 가시 서비스 목록 (로그인 시 enrollment status 포함)
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

  /**
   * GET /my — 내 서비스 목록 (applied + approved)
   */
  router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const enrollments = await catalogService.getUserEnrollments(userId);

      res.json({
        success: true,
        data: enrollments,
      });
    } catch (error) {
      logger.error('[PlatformServices] Error getting user enrollments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get enrollments',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * POST /:code/apply — 서비스 이용 신청
   */
  router.post('/:code/apply', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { code } = req.params;

      const enrollment = await catalogService.applyForService(userId, code);

      res.status(201).json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'SERVICE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: '서비스를 찾을 수 없습니다',
          code: 'SERVICE_NOT_FOUND',
        });
      }
      if (message === 'ALREADY_APPROVED') {
        return res.status(409).json({
          success: false,
          error: '이미 승인된 서비스입니다',
          code: 'ALREADY_APPROVED',
        });
      }
      if (message === 'ALREADY_APPLIED') {
        return res.status(409).json({
          success: false,
          error: '이미 신청 중입니다',
          code: 'ALREADY_APPLIED',
        });
      }

      logger.error('[PlatformServices] Error applying for service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply for service',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
