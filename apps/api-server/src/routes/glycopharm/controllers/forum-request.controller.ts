/**
 * @deprecated WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 * 이 컨트롤러는 레거시입니다.
 * - 사용자 API → /api/v1/forum/category-requests/*
 * - 운영자 API → /api/v1/glycopharm/operator/forum-requests/*
 * 프론트엔드 전환 완료 후 삭제 예정.
 *
 * Forum Category Request Controller (LEGACY)
 * 포럼 카테고리 생성 신청 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { GlycopharmForumCategoryRequest } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';
// ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
import logger from '../../../utils/logger.js';
import { isServiceAdmin } from '../../../utils/role.utils.js';

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

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose Korean characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9가-힣]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, ''); // Trim dashes
}

export function createForumRequestController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const requestRepo = dataSource.getRepository(GlycopharmForumCategoryRequest);
  // categoryRepo removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1

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
        // WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.2: GlycoPharm)
        // Check for glycopharm:admin or platform:admin (legacy roles denied)
        const isAdmin = isServiceAdmin(req.user!.roles || [], 'glycopharm');

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

        let requests: any[] = [];
        let total = 0;

        try {
          const qb = requestRepo.createQueryBuilder('r');

          if (status && status !== 'all') {
            qb.where('r.status = :status', { status });
          }

          qb.orderBy('r.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

          [requests, total] = await qb.getManyAndCount();
        } catch (dbErr: any) {
          // safeQuery: glycopharm_forum_category_requests 테이블 미존재 시 빈 결과 반환
          console.warn('[ForumRequests] Table may not exist, returning empty:', dbErr.message);
        }

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

        // WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: forum_category 제거 — 카테고리 생성 로직 제거됨
        // 이 레거시 컨트롤러는 @deprecated 상태. 신규 요청은 /api/v1/forum/category-requests 사용.
        if (req.body.status === 'approved') {
          request.created_category_slug = generateSlug(request.name);
        }

        const saved = await requestRepo.save(request);

        res.json({
          data: saved,
          category: null,
        });
      } catch (error: any) {
        console.error('Failed to review request:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // POST /forum-requests/admin/create-missing-categories - 기존 승인된 요청의 카테고리 생성
  router.post(
    '/admin/create-missing-categories',
    requireAuth,
    requireScope('glycopharm:admin'),
    async (_req: AuthRequest, res: Response): Promise<void> => {
      // WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1: forum_category 제거 — 이 엔드포인트는 더 이상 동작하지 않음
      res.status(410).json({
        success: false,
        error: 'forum_category 테이블이 제거되었습니다. 이 엔드포인트는 더 이상 지원되지 않습니다.',
        code: 'FORUM_CATEGORY_REMOVED',
      });
    }
  );

  return router;
}
