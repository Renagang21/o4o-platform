/**
 * KPA Application Controller
 * 약사회 신청 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { KpaApplication, KpaOrganization, KpaApplicationType } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
    });
    return;
  }
  next();
};

export function createApplicationController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const appRepo = dataSource.getRepository(KpaApplication);
  const orgRepo = dataSource.getRepository(KpaOrganization);

  /**
   * POST /kpa/applications
   * 신청서 제출
   */
  router.post(
    '/',
    requireAuth,
    [
      body('organization_id').isUUID(),
      body('type').isIn(['membership', 'service', 'other']),
      body('payload').optional().isObject(),
      body('note').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        // 조직 확인
        const org = await orgRepo.findOne({ where: { id: req.body.organization_id } });
        if (!org) {
          res.status(400).json({ error: { code: 'INVALID_ORG', message: 'Organization not found' } });
          return;
        }

        // 동일 유형 진행 중인 신청 확인
        const existing = await appRepo.findOne({
          where: {
            user_id: req.user!.id,
            organization_id: req.body.organization_id,
            type: req.body.type,
            status: 'submitted',
          },
        });

        if (existing) {
          res.status(409).json({
            error: { code: 'DUPLICATE_APPLICATION', message: 'A pending application of this type already exists' },
          });
          return;
        }

        const application = appRepo.create({
          user_id: req.user!.id,
          organization_id: req.body.organization_id,
          type: req.body.type as KpaApplicationType,
          payload: req.body.payload || {},
          note: req.body.note || null,
          status: 'submitted',
        });

        const saved = await appRepo.save(application);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to submit application:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/applications/mine
   * 내 신청 목록 조회
   */
  router.get('/mine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { type, status } = req.query;

      const qb = appRepo.createQueryBuilder('app')
        .leftJoinAndSelect('app.organization', 'org')
        .where('app.user_id = :user_id', { user_id: req.user!.id });

      if (type) {
        qb.andWhere('app.type = :type', { type });
      }

      if (status) {
        qb.andWhere('app.status = :status', { status });
      }

      qb.orderBy('app.created_at', 'DESC');

      const applications = await qb.getMany();

      res.json({
        data: applications,
        total: applications.length,
      });
    } catch (error: any) {
      console.error('Failed to list my applications:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  /**
   * GET /kpa/applications/:id
   * 신청 상세 조회
   */
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const application = await appRepo.findOne({
          where: { id: req.params.id },
          relations: ['organization'],
        });

        if (!application) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
          return;
        }

        // 본인 또는 관리자만 조회 가능
        const isOwner = application.user_id === req.user!.id;
        const isAdmin = req.user!.roles?.includes('admin') || req.user!.roles?.includes('super_admin');
        const isKpaOperator = req.user!.scopes?.includes('kpa:operator') || req.user!.scopes?.includes('kpa:admin');

        if (!isOwner && !isAdmin && !isKpaOperator) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
          return;
        }

        res.json({ data: application });
      } catch (error: any) {
        console.error('Failed to get application:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * DELETE /kpa/applications/:id
   * 신청 취소 (본인만, submitted 상태만)
   */
  router.delete(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const application = await appRepo.findOne({ where: { id: req.params.id } });

        if (!application) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
          return;
        }

        if (application.user_id !== req.user!.id) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
          return;
        }

        if (application.status !== 'submitted') {
          res.status(400).json({
            error: { code: 'INVALID_STATUS', message: 'Only submitted applications can be cancelled' },
          });
          return;
        }

        application.status = 'cancelled';
        await appRepo.save(application);

        res.json({ data: application });
      } catch (error: any) {
        console.error('Failed to cancel application:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/applications/admin
   * 전체 신청 목록 조회 (관리자/운영자 전용)
   */
  router.get(
    '/admin/all',
    requireAuth,
    requireScope('kpa:operator'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { organization_id, type, status, page = '1', limit = '20' } = req.query;

        const qb = appRepo.createQueryBuilder('app')
          .leftJoinAndSelect('app.organization', 'org');

        if (organization_id) {
          qb.andWhere('app.organization_id = :organization_id', { organization_id });
        }

        if (type) {
          qb.andWhere('app.type = :type', { type });
        }

        if (status) {
          qb.andWhere('app.status = :status', { status });
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        qb.orderBy('app.created_at', 'DESC')
          .skip((pageNum - 1) * limitNum)
          .take(limitNum);

        const [applications, total] = await qb.getManyAndCount();

        res.json({
          data: applications,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        });
      } catch (error: any) {
        console.error('Failed to list all applications:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * PATCH /kpa/applications/:id/review
   * 신청 검토 (승인/거절) - 관리자/운영자 전용
   */
  router.patch(
    '/:id/review',
    requireAuth,
    requireScope('kpa:operator'),
    [
      param('id').isUUID(),
      body('status').isIn(['approved', 'rejected']),
      body('review_comment').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const application = await appRepo.findOne({ where: { id: req.params.id } });

        if (!application) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
          return;
        }

        if (application.status !== 'submitted') {
          res.status(400).json({
            error: { code: 'ALREADY_REVIEWED', message: 'Application has already been reviewed' },
          });
          return;
        }

        application.status = req.body.status;
        application.reviewer_id = req.user!.id;
        application.review_comment = req.body.review_comment || null;
        application.reviewed_at = new Date();

        const saved = await appRepo.save(application);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to review application:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /**
   * GET /kpa/applications/admin/stats
   * 신청 통계 (관리자/운영자 전용)
   */
  router.get(
    '/admin/stats',
    requireAuth,
    requireScope('kpa:operator'),
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { organization_id } = req.query;

        const qb = appRepo.createQueryBuilder('app')
          .select('app.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('app.status');

        if (organization_id) {
          qb.where('app.organization_id = :organization_id', { organization_id });
        }

        const stats = await qb.getRawMany();

        const result: Record<string, number> = {
          submitted: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
        };

        for (const stat of stats) {
          result[stat.status] = parseInt(stat.count);
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('Failed to get application stats:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
