/**
 * Platform Services - Admin Routes
 *
 * GET   /api/v1/admin/platform-services              — 전체 목록
 * PATCH /api/v1/admin/platform-services/:code        — 설정 수정
 * GET   /api/v1/admin/platform-services/:code/enrollments — 신청 목록
 * PATCH /api/v1/admin/platform-services/enrollments/:id   — 승인/거절
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
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

  /**
   * GET /:code/enrollments — 서비스별 신청 목록
   */
  router.get('/:code/enrollments', async (req: AuthRequest, res: Response) => {
    try {
      const { code } = req.params;
      const status = req.query.status as string | undefined;

      const enrollments = await catalogService.listEnrollmentsByService(
        code,
        status ? { status: status as 'applied' | 'approved' | 'rejected' } : undefined,
      );

      res.json({
        success: true,
        data: enrollments,
      });
    } catch (error) {
      logger.error('[AdminPlatformServices] Error listing enrollments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list enrollments',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PATCH /enrollments/:id — 신청 승인/거절
   */
  router.patch('/enrollments/:id', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const decidedBy = req.user!.id;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status must be "approved" or "rejected"',
          code: 'VALIDATION_ERROR',
        });
      }

      const enrollment = await catalogService.reviewEnrollment(id, status, decidedBy, note);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: '신청을 찾을 수 없습니다',
          code: 'ENROLLMENT_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'INVALID_STATUS') {
        return res.status(400).json({
          success: false,
          error: '승인 대기 상태가 아닙니다',
          code: 'INVALID_STATUS',
        });
      }

      logger.error('[AdminPlatformServices] Error reviewing enrollment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to review enrollment',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
