/**
 * Forum Category Request Controller
 * 포럼 카테고리 생성 신청 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { ForumCategoryRequest } from '../entities/index.js';
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

export function createForumRequestController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const requestRepo = dataSource.getRepository(ForumCategoryRequest);

  // ============================================================================
  // USER ROUTES
  // ============================================================================

  // POST /forum-requests - 포럼 카테고리 신청
  router.post(
    '/',
    requireAuth,
    [
      body('name').isString().notEmpty().isLength({ min: 2, max: 100 }),
      body('description').isString().notEmpty().isLength({ min: 10 }),
      body('reason').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const request = requestRepo.create({
          name: req.body.name,
          description: req.body.description,
          reason: req.body.reason,
          status: 'pending',
          requester_id: req.user!.id,
          requester_name: req.user!.name || req.user!.email || 'Unknown',
          requester_email: req.user!.email,
        });
        const saved = await requestRepo.save(request);
        res.status(201).json({ data: saved });
      } catch (error: any) {
        console.error('Failed to create forum request:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // GET /forum-requests/my - 내 신청 내역
  router.get('/my', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requests = await requestRepo.find({
        where: { requester_id: req.user!.id },
        order: { created_at: 'DESC' },
      });
      res.json({ data: requests, total: requests.length });
    } catch (error: any) {
      console.error('Failed to list my requests:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  });

  // GET /forum-requests/:id - 신청 상세
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const request = await requestRepo.findOne({ where: { id: req.params.id } });
        if (!request) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
          return;
        }

        // 본인 또는 관리자만 조회 가능
        const isOwner = request.requester_id === req.user!.id;
        const isAdmin = req.user!.roles?.includes('admin') || req.user!.roles?.includes('super_admin');

        if (!isOwner && !isAdmin) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
          return;
        }

        res.json({ data: request });
      } catch (error: any) {
        console.error('Failed to get request:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  // GET /forum-requests/admin/all - 전체 신청 목록 (관리자)
  router.get(
    '/admin/all',
    requireAuth,
    requireScope('glycopharm:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const status = req.query.status as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const qb = requestRepo.createQueryBuilder('r');

        if (status && status !== 'all') {
          qb.where('r.status = :status', { status });
        }

        qb.orderBy('r.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        const [requests, total] = await qb.getManyAndCount();

        res.json({
          data: requests,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      } catch (error: any) {
        console.error('Failed to list all requests:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // GET /forum-requests/admin/pending-count - 대기 중인 신청 수
  router.get(
    '/admin/pending-count',
    requireAuth,
    requireScope('glycopharm:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const count = await requestRepo.count({ where: { status: 'pending' } });
        res.json({ count });
      } catch (error: any) {
        console.error('Failed to count pending requests:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // PATCH /forum-requests/:id/review - 신청 검토 (승인/거절)
  router.patch(
    '/:id/review',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['approved', 'rejected']),
      body('review_comment').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const request = await requestRepo.findOne({ where: { id: req.params.id } });
        if (!request) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Request not found' } });
          return;
        }

        if (request.status !== 'pending') {
          res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Request has already been reviewed' },
          });
          return;
        }

        request.status = req.body.status;
        request.review_comment = req.body.review_comment;
        request.reviewer_id = req.user!.id;
        request.reviewer_name = req.user!.name || req.user!.email || 'Admin';
        request.reviewed_at = new Date();

        // 승인 시 카테고리 생성 로직은 추후 구현
        // 현재는 승인 상태만 변경
        if (req.body.status === 'approved') {
          // TODO: 실제 포럼 카테고리 생성
          request.created_category_slug = request.name
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '-')
            .replace(/-+/g, '-');
        }

        const saved = await requestRepo.save(request);
        res.json({ data: saved });
      } catch (error: any) {
        console.error('Failed to review request:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
