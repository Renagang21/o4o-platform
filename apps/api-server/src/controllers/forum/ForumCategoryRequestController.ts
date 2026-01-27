/**
 * ForumCategoryRequestController
 * 포럼 카테고리 생성 요청 API (서비스 공통)
 *
 * serviceCode 기반 서비스 격리
 * organizationId 기반 조직 범위 필터링
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AppDataSource } from '../../database/connection.js';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { ForumCategory } from '@o4o/forum-core/entities';
import type { AuthRequest } from '../../types/auth.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  next();
};

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

export function createForumCategoryRequestRoutes(): Router {
  const router = Router();
  const requestRepo = AppDataSource.getRepository(ForumCategoryRequest);
  const categoryRepo = AppDataSource.getRepository(ForumCategory);

  // ============================================================================
  // USER ROUTES
  // ============================================================================

  // POST /category-requests - 포럼 카테고리 신청
  router.post(
    '/',
    authenticate,
    [
      body('name').isString().notEmpty().isLength({ min: 2, max: 100 }),
      body('description').isString().notEmpty().isLength({ min: 5 }),
      body('reason').optional().isString(),
      body('serviceCode').isString().notEmpty(),
      body('organizationId').optional().isUUID(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const user = (req as any).user;
        if (!user) {
          res.status(401).json({ success: false, error: 'Authentication required' });
          return;
        }

        const request = requestRepo.create({
          name: req.body.name,
          description: req.body.description,
          reason: req.body.reason,
          status: 'pending',
          serviceCode: req.body.serviceCode,
          organizationId: req.body.organizationId || null,
          requesterId: user.id,
          requesterName: user.name || user.email || 'Unknown',
          requesterEmail: user.email,
        });

        const saved = await requestRepo.save(request);
        res.status(201).json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to create forum category request:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // GET /category-requests/my - 내 신청 내역
  router.get(
    '/my',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const user = (req as any).user;
        const serviceCode = req.query.serviceCode as string;

        const where: any = { requesterId: user.id };
        if (serviceCode) where.serviceCode = serviceCode;

        const requests = await requestRepo.find({
          where,
          order: { createdAt: 'DESC' },
        });

        res.json({ success: true, data: requests, total: requests.length });
      } catch (error: any) {
        console.error('Failed to list my category requests:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ============================================================================
  // OPERATOR / ADMIN ROUTES
  // ============================================================================

  // GET /category-requests - 전체 신청 목록 (운영자/관리자)
  router.get(
    '/',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const user = (req as any).user;
        const serviceCode = req.query.serviceCode as string;
        const status = req.query.status as string;
        const organizationId = req.query.organizationId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        // 관리자/운영자 권한 체크
        const userRoles: string[] = user.roles || [];
        const userScopes: string[] = user.scopes || [];
        const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
        const isOperator = userScopes.some((s: string) =>
          s.includes(':admin') || s.includes(':operator') || s.includes(':forum')
        );

        if (!isAdmin && !isOperator) {
          res.status(403).json({ success: false, error: 'Operator or admin access required' });
          return;
        }

        const qb = requestRepo.createQueryBuilder('r');

        if (serviceCode) {
          qb.andWhere('r.service_code = :serviceCode', { serviceCode });
        }
        if (status && status !== 'all') {
          qb.andWhere('r.status = :status', { status });
        }
        if (organizationId) {
          qb.andWhere('r.organization_id = :organizationId', { organizationId });
        }

        qb.orderBy('r.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        const [requests, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: requests,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error: any) {
        console.error('Failed to list category requests:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // GET /category-requests/pending-count - 대기 중 신청 수
  router.get(
    '/pending-count',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const serviceCode = req.query.serviceCode as string;
        const organizationId = req.query.organizationId as string;

        const where: any = { status: 'pending' as const };
        if (serviceCode) where.serviceCode = serviceCode;
        if (organizationId) where.organizationId = organizationId;

        const count = await requestRepo.count({ where });
        res.json({ success: true, count });
      } catch (error: any) {
        console.error('Failed to count pending requests:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // PATCH /category-requests/:id/approve - 승인 (카테고리 자동 생성)
  router.patch(
    '/:id/approve',
    authenticate,
    [param('id').isUUID(), body('review_comment').optional().isString(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const user = (req as any).user;
        const request = await requestRepo.findOne({ where: { id: req.params.id } });

        if (!request) {
          res.status(404).json({ success: false, error: 'Request not found' });
          return;
        }
        if (request.status !== 'pending') {
          res.status(400).json({ success: false, error: 'Request has already been reviewed' });
          return;
        }

        // 카테고리 생성
        const slug = generateSlug(request.name);
        const category = categoryRepo.create({
          name: request.name,
          description: request.description,
          slug,
          isActive: true,
          requireApproval: false,
          accessLevel: 'all',
          createdBy: user.id,
          organizationId: request.organizationId || undefined,
        });
        const savedCategory = await categoryRepo.save(category);

        // 요청 상태 업데이트
        request.status = 'approved';
        request.reviewComment = req.body.review_comment;
        request.reviewerId = user.id;
        request.reviewerName = user.name || user.email || 'Admin';
        request.reviewedAt = new Date();
        request.createdCategoryId = savedCategory.id;
        request.createdCategorySlug = savedCategory.slug;

        const saved = await requestRepo.save(request);
        res.json({ success: true, data: saved, category: savedCategory });
      } catch (error: any) {
        console.error('Failed to approve category request:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // PATCH /category-requests/:id/reject - 거부
  router.patch(
    '/:id/reject',
    authenticate,
    [param('id').isUUID(), body('review_comment').optional().isString(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const user = (req as any).user;
        const request = await requestRepo.findOne({ where: { id: req.params.id } });

        if (!request) {
          res.status(404).json({ success: false, error: 'Request not found' });
          return;
        }
        if (request.status !== 'pending') {
          res.status(400).json({ success: false, error: 'Request has already been reviewed' });
          return;
        }

        request.status = 'rejected';
        request.reviewComment = req.body.review_comment;
        request.reviewerId = user.id;
        request.reviewerName = user.name || user.email || 'Admin';
        request.reviewedAt = new Date();

        const saved = await requestRepo.save(request);
        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to reject category request:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  return router;
}
