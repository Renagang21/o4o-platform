/**
 * Forum Category Request Controller
 * 포럼 카테고리 생성 신청 API 엔드포인트
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { GlycopharmForumCategoryRequest } from '../entities/index.js';
import type { AuthRequest } from '../../../types/auth.js';
import { ForumCategory } from '@o4o/forum-core/entities';
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
  const categoryRepo = dataSource.getRepository(ForumCategory);

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

        let createdCategory = null;

        // 승인 시 실제 포럼 카테고리 생성
        if (req.body.status === 'approved') {
          try {
            const slug = generateSlug(request.name);

            // Check if category with same slug already exists
            const existingCategory = await categoryRepo.findOne({ where: { slug } });

            if (existingCategory) {
              // Category already exists - just link it
              request.created_category_slug = slug;
              logger.info(`[Forum Request] Category already exists: ${slug}`);
            } else {
              // Create new forum category
              const category = categoryRepo.create({
                name: request.name,
                description: request.description,
                slug,
                color: '#3B82F6', // Default blue color
                sortOrder: 100, // Default sort order
                isActive: true,
                requireApproval: false,
                accessLevel: 'all',
                createdBy: request.requester_id,
              });

              createdCategory = await categoryRepo.save(category);
              request.created_category_slug = slug;

              logger.info(
                `[Forum Request] Created forum category: ${createdCategory.name} (${createdCategory.slug}) for request ${request.id}`
              );
            }
          } catch (error: any) {
            logger.error(`[Forum Request] Failed to create category: ${error.message}`, error);
            // Continue with approval even if category creation fails
            // Admin can manually create category later
          }
        }

        const saved = await requestRepo.save(request);

        res.json({
          data: saved,
          category: createdCategory ? {
            id: createdCategory.id,
            name: createdCategory.name,
            slug: createdCategory.slug,
          } : null,
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
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        // Find all approved requests without created_category_slug
        const approvedRequests = await requestRepo.find({
          where: { status: 'approved' },
        });

        const results = [];
        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const request of approvedRequests) {
          try {
            // Skip if category already linked
            if (request.created_category_slug) {
              const existingCat = await categoryRepo.findOne({
                where: { slug: request.created_category_slug },
              });
              if (existingCat) {
                results.push({
                  requestId: request.id,
                  requestName: request.name,
                  status: 'skipped',
                  reason: 'Category already exists',
                  categorySlug: request.created_category_slug,
                });
                skipped++;
                continue;
              }
            }

            // Create category
            const slug = generateSlug(request.name);
            const category = categoryRepo.create({
              name: request.name,
              description: request.description,
              slug,
              color: '#3B82F6',
              sortOrder: 100,
              isActive: true,
              requireApproval: false,
              accessLevel: 'all',
              createdBy: request.requester_id,
            });

            const savedCategory = await categoryRepo.save(category);

            // Update request
            request.created_category_slug = slug;
            await requestRepo.save(request);

            results.push({
              requestId: request.id,
              requestName: request.name,
              status: 'created',
              categoryId: savedCategory.id,
              categorySlug: savedCategory.slug,
            });
            created++;

            logger.info(
              `[Forum Request] Created missing category: ${savedCategory.name} (${savedCategory.slug}) for request ${request.id}`
            );
          } catch (error: any) {
            results.push({
              requestId: request.id,
              requestName: request.name,
              status: 'error',
              error: error.message,
            });
            errors++;
            logger.error(`[Forum Request] Failed to create category for request ${request.id}:`, error);
          }
        }

        res.json({
          success: true,
          summary: {
            total: approvedRequests.length,
            created,
            skipped,
            errors,
          },
          results,
        });
      } catch (error: any) {
        console.error('Failed to create missing categories:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
