/**
 * Yaksa Controller
 *
 * Phase A-1: Yaksa API Implementation
 * Express router with all Yaksa endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { YaksaService } from '../services/yaksa.service.js';
import { YaksaPostStatus } from '../entities/yaksa-post.entity.js';
import { YaksaCategoryStatus } from '../entities/yaksa-category.entity.js';
import {
  ErrorResponseDto,
  ListPostsQueryDto,
  CreatePostRequestDto,
  UpdatePostRequestDto,
  UpdatePostStatusRequestDto,
  ListCategoriesQueryDto,
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
  UpdateCategoryStatusRequestDto,
  ListLogsQueryDto,
} from '../dto/index.js';
import type { AuthRequest } from '../../../types/auth.js';

/**
 * Error response helper
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): Response {
  const response: ErrorResponseDto = {
    error: { code, message, details },
  };
  return res.status(statusCode).json(response);
}

/**
 * Validation error helper
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

/**
 * Create Yaksa router
 */
export function createYaksaController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const service = new YaksaService(dataSource);

  // ============================================================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================================================

  /**
   * GET /yaksa/posts
   * List posts with pagination and filters
   */
  router.get(
    '/posts',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('category_id').optional().isUUID(),
      query('status').optional().isIn(['draft', 'published', 'hidden', 'deleted']),
      query('is_pinned').optional().isBoolean().toBoolean(),
      query('is_notice').optional().isBoolean().toBoolean(),
      query('sort').optional().isIn(['created_at', 'updated_at', 'view_count']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListPostsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          category_id: req.query.category_id as string | undefined,
          status: req.query.status as YaksaPostStatus | undefined,
          is_pinned: req.query.is_pinned !== undefined
            ? String(req.query.is_pinned) === 'true'
            : undefined,
          is_notice: req.query.is_notice !== undefined
            ? String(req.query.is_notice) === 'true'
            : undefined,
          sort: req.query.sort as 'created_at' | 'updated_at' | 'view_count' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        // For public API, default to published only
        if (!queryDto.status) {
          queryDto.status = 'published';
        }

        const result = await service.listPosts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Yaksa] List posts error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /yaksa/posts/:id
   * Get single post details
   */
  router.get(
    '/posts/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getPost(req.params.id, true); // increment view
        if (!result) {
          return errorResponse(res, 404, 'YAKSA_001', 'Post not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Get post error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /yaksa/categories
   * List all categories
   */
  router.get(
    '/categories',
    [query('status').optional().isIn(['active', 'inactive'])],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListCategoriesQueryDto = {
          status: req.query.status as YaksaCategoryStatus | undefined,
        };

        // For public API, default to active only
        if (!queryDto.status) {
          queryDto.status = 'active';
        }

        const result = await service.listCategories(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Yaksa] List categories error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  // ============================================================================
  // ADMIN ENDPOINTS (Auth + yaksa:admin scope required)
  // ============================================================================

  /**
   * GET /yaksa/admin/posts
   * List all posts (including draft/hidden) for admin
   */
  router.get(
    '/admin/posts',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('category_id').optional().isUUID(),
      query('status').optional().isIn(['draft', 'published', 'hidden', 'deleted']),
      query('sort').optional().isIn(['created_at', 'updated_at', 'view_count']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListPostsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          category_id: req.query.category_id as string | undefined,
          status: req.query.status as YaksaPostStatus | undefined,
          sort: req.query.sort as 'created_at' | 'updated_at' | 'view_count' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listPosts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Yaksa] Admin list posts error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /yaksa/admin/posts
   * Create new post
   */
  router.post(
    '/admin/posts',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      body('category_id').notEmpty().isUUID(),
      body('title').notEmpty().isString().isLength({ min: 1, max: 255 }),
      body('content').notEmpty().isString(),
      body('status').optional().isIn(['draft', 'published', 'hidden']),
      body('is_pinned').optional().isBoolean(),
      body('is_notice').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name ||
                        authReq.user?.email || authReq.authUser?.email;

        const dto: CreatePostRequestDto = req.body;
        const result = await service.createPost(dto, userId, userName);

        res.status(201).json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Create post error:', error);
        if (error.message === 'CATEGORY_NOT_FOUND') {
          return errorResponse(res, 400, 'YAKSA_002', 'Category not found');
        }
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /yaksa/admin/posts/:id
   * Update post
   */
  router.put(
    '/admin/posts/:id',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      param('id').isUUID(),
      body('category_id').optional().isUUID(),
      body('title').optional().isString().isLength({ min: 1, max: 255 }),
      body('content').optional().isString(),
      body('is_pinned').optional().isBoolean(),
      body('is_notice').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name ||
                        authReq.user?.email || authReq.authUser?.email;

        const dto: UpdatePostRequestDto = req.body;
        const result = await service.updatePost(req.params.id, dto, userId, userName);

        if (!result) {
          return errorResponse(res, 404, 'YAKSA_001', 'Post not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Update post error:', error);
        if (error.message === 'CATEGORY_NOT_FOUND') {
          return errorResponse(res, 400, 'YAKSA_002', 'Category not found');
        }
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /yaksa/admin/posts/:id/status
   * Update post status
   */
  router.patch(
    '/admin/posts/:id/status',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      param('id').isUUID(),
      body('status').notEmpty().isIn(['draft', 'published', 'hidden', 'deleted']),
      body('reason').optional().isString().isLength({ max: 500 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name ||
                        authReq.user?.email || authReq.authUser?.email;

        const dto: UpdatePostStatusRequestDto = req.body;
        const result = await service.updatePostStatus(req.params.id, dto, userId, userName);

        if (!result) {
          return errorResponse(res, 404, 'YAKSA_001', 'Post not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Update post status error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /yaksa/admin/categories
   * List all categories for admin
   */
  router.get(
    '/admin/categories',
    requireAuth,
    requireScope('yaksa:admin'),
    [query('status').optional().isIn(['active', 'inactive'])],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListCategoriesQueryDto = {
          status: req.query.status as YaksaCategoryStatus | undefined,
        };

        const result = await service.listCategories(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Yaksa] Admin list categories error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /yaksa/admin/categories
   * Create new category
   */
  router.post(
    '/admin/categories',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      body('name').notEmpty().isString().isLength({ min: 1, max: 100 }),
      body('slug').notEmpty().isString().isLength({ min: 1, max: 100 })
        .matches(/^[a-z0-9-]+$/),
      body('description').optional().isString(),
      body('sort_order').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;

        const dto: CreateCategoryRequestDto = req.body;
        const result = await service.createCategory(dto, userId);

        res.status(201).json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Create category error:', error);
        if (error.message === 'SLUG_ALREADY_EXISTS') {
          return errorResponse(res, 400, 'YAKSA_003', 'Category slug already exists');
        }
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /yaksa/admin/categories/:id
   * Update category
   */
  router.put(
    '/admin/categories/:id',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ min: 1, max: 100 }),
      body('slug').optional().isString().isLength({ min: 1, max: 100 })
        .matches(/^[a-z0-9-]+$/),
      body('description').optional().isString(),
      body('sort_order').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const dto: UpdateCategoryRequestDto = req.body;
        const result = await service.updateCategory(req.params.id, dto);

        if (!result) {
          return errorResponse(res, 404, 'YAKSA_004', 'Category not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Update category error:', error);
        if (error.message === 'SLUG_ALREADY_EXISTS') {
          return errorResponse(res, 400, 'YAKSA_003', 'Category slug already exists');
        }
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /yaksa/admin/categories/:id/status
   * Update category status
   */
  router.patch(
    '/admin/categories/:id/status',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      param('id').isUUID(),
      body('status').notEmpty().isIn(['active', 'inactive']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const dto: UpdateCategoryStatusRequestDto = req.body;
        const result = await service.updateCategoryStatus(req.params.id, dto);

        if (!result) {
          return errorResponse(res, 404, 'YAKSA_004', 'Category not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Yaksa] Update category status error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /yaksa/admin/logs/posts
   * Get post change logs
   */
  router.get(
    '/admin/logs/posts',
    requireAuth,
    requireScope('yaksa:admin'),
    [
      query('post_id').optional().isUUID(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListLogsQueryDto = {
          post_id: req.query.post_id as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        };

        const result = await service.getPostLogs(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Yaksa] Get post logs error:', error);
        errorResponse(res, 500, 'YAKSA_500', 'Internal server error');
      }
    }
  );

  return router;
}
