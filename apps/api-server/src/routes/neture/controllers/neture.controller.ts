/**
 * Neture Controller
 *
 * Phase D-1: Neture API Server 골격 구축
 * Express router with all Neture endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { NetureService } from '../services/neture.service.js';
import {
  NetureProductStatus,
  NetureProductCategory,
} from '../entities/neture-product.entity.js';
import {
  NeturePartnerType,
  NeturePartnerStatus,
} from '../entities/neture-partner.entity.js';
import {
  ErrorResponseDto,
  ListProductsQueryDto,
  SearchProductsQueryDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
  UpdateProductStatusRequestDto,
  ListPartnersQueryDto,
  CreatePartnerRequestDto,
  UpdatePartnerRequestDto,
  UpdatePartnerStatusRequestDto,
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
 * Create Neture router
 */
export function createNetureController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const service = new NetureService(dataSource);

  // ============================================================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================================================

  /**
   * GET /neture/products
   * List products with pagination and filters
   */
  router.get(
    '/products',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('partner_id').optional().isUUID(),
      query('category').optional().isIn(Object.values(NetureProductCategory)),
      query('status').optional().isIn(Object.values(NetureProductStatus)),
      query('is_featured').optional().isBoolean().toBoolean(),
      query('sort').optional().isIn(['created_at', 'price', 'name', 'view_count']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListProductsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          partner_id: req.query.partner_id as string | undefined,
          category: req.query.category as NetureProductCategory | undefined,
          status: req.query.status as NetureProductStatus | undefined,
          is_featured: req.query.is_featured === 'true' ? true : req.query.is_featured === 'false' ? false : undefined,
          sort: req.query.sort as 'created_at' | 'price' | 'name' | 'view_count' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listProducts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] List products error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/products/search
   * Search products by keyword
   */
  router.get(
    '/products/search',
    [
      query('q').notEmpty().isString().isLength({ min: 2 }),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: SearchProductsQueryDto = {
          q: req.query.q as string,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        };

        const result = await service.searchProducts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] Search products error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/products/:id
   * Get single product details
   */
  router.get(
    '/products/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const product = await service.getProduct(req.params.id, true);
        if (!product) {
          return errorResponse(res, 404, 'NETURE_404', 'Product not found');
        }

        res.json({ data: product });
      } catch (error: any) {
        console.error('[Neture] Get product error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/partners
   * List partners (public)
   */
  router.get(
    '/partners',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('type').optional().isIn(Object.values(NeturePartnerType)),
      query('sort').optional().isIn(['created_at', 'name']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListPartnersQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          type: req.query.type as NeturePartnerType | undefined,
          status: NeturePartnerStatus.ACTIVE, // Public only shows active
          sort: req.query.sort as 'created_at' | 'name' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listPartners(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] List partners error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  // ============================================================================
  // ADMIN ENDPOINTS (Auth Required)
  // ============================================================================

  /**
   * GET /neture/admin/products
   * List all products (admin)
   */
  router.get(
    '/admin/products',
    requireAuth,
    requireScope('neture:read'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('partner_id').optional().isUUID(),
      query('category').optional().isIn(Object.values(NetureProductCategory)),
      query('status').optional().isIn(Object.values(NetureProductStatus)),
      query('is_featured').optional().isBoolean().toBoolean(),
      query('sort').optional().isIn(['created_at', 'price', 'name', 'view_count']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListProductsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          partner_id: req.query.partner_id as string | undefined,
          category: req.query.category as NetureProductCategory | undefined,
          status: req.query.status as NetureProductStatus | undefined,
          is_featured: req.query.is_featured === 'true' ? true : req.query.is_featured === 'false' ? false : undefined,
          sort: req.query.sort as 'created_at' | 'price' | 'name' | 'view_count' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listProducts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] Admin list products error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /neture/admin/products
   * Create new product
   */
  router.post(
    '/admin/products',
    requireAuth,
    requireScope('neture:write'),
    [
      body('name').notEmpty().isString().isLength({ max: 200 }),
      body('partner_id').optional().isUUID(),
      body('subtitle').optional().isString().isLength({ max: 500 }),
      body('description').optional().isString(),
      body('category').optional().isIn(Object.values(NetureProductCategory)),
      body('base_price').isInt({ min: 0 }),
      body('sale_price').optional().isInt({ min: 0 }),
      body('stock').optional().isInt({ min: 0 }),
      body('sku').optional().isString().isLength({ max: 100 }),
      body('images').optional().isArray(),
      body('tags').optional().isArray(),
      body('is_featured').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const createDto: CreateProductRequestDto = req.body;
        const product = await service.createProduct(createDto, userId);

        res.status(201).json({ data: product });
      } catch (error: any) {
        console.error('[Neture] Create product error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /neture/admin/products/:id
   * Update product
   */
  router.put(
    '/admin/products/:id',
    requireAuth,
    requireScope('neture:write'),
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ max: 200 }),
      body('partner_id').optional().isUUID(),
      body('subtitle').optional().isString().isLength({ max: 500 }),
      body('description').optional().isString(),
      body('category').optional().isIn(Object.values(NetureProductCategory)),
      body('base_price').optional().isInt({ min: 0 }),
      body('sale_price').optional().isInt({ min: 0 }),
      body('stock').optional().isInt({ min: 0 }),
      body('sku').optional().isString().isLength({ max: 100 }),
      body('images').optional().isArray(),
      body('tags').optional().isArray(),
      body('is_featured').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const updateDto: UpdateProductRequestDto = req.body;
        const product = await service.updateProduct(req.params.id, updateDto, userId);

        if (!product) {
          return errorResponse(res, 404, 'NETURE_404', 'Product not found');
        }

        res.json({ data: product });
      } catch (error: any) {
        console.error('[Neture] Update product error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /neture/admin/products/:id/status
   * Update product status
   */
  router.patch(
    '/admin/products/:id/status',
    requireAuth,
    requireScope('neture:write'),
    [
      param('id').isUUID(),
      body('status').isIn(Object.values(NetureProductStatus)),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const statusDto: UpdateProductStatusRequestDto = req.body;
        const product = await service.updateProductStatus(req.params.id, statusDto, userId);

        if (!product) {
          return errorResponse(res, 404, 'NETURE_404', 'Product not found');
        }

        res.json({ data: product });
      } catch (error: any) {
        console.error('[Neture] Update product status error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/admin/partners
   * List all partners (admin)
   */
  router.get(
    '/admin/partners',
    requireAuth,
    requireScope('neture:read'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('type').optional().isIn(Object.values(NeturePartnerType)),
      query('status').optional().isIn(Object.values(NeturePartnerStatus)),
      query('sort').optional().isIn(['created_at', 'name']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListPartnersQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          type: req.query.type as NeturePartnerType | undefined,
          status: req.query.status as NeturePartnerStatus | undefined,
          sort: req.query.sort as 'created_at' | 'name' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listPartners(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] Admin list partners error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * POST /neture/admin/partners
   * Create new partner
   */
  router.post(
    '/admin/partners',
    requireAuth,
    requireScope('neture:write'),
    [
      body('name').notEmpty().isString().isLength({ max: 200 }),
      body('business_name').optional().isString().isLength({ max: 200 }),
      body('business_number').optional().isString().isLength({ max: 50 }),
      body('type').optional().isIn(Object.values(NeturePartnerType)),
      body('description').optional().isString(),
      body('logo').optional().isString(),
      body('website').optional().isURL(),
      body('contact').optional().isObject(),
      body('address').optional().isObject(),
      body('user_id').optional().isUUID(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const createDto: CreatePartnerRequestDto = req.body;
        const partner = await service.createPartner(createDto, userId);

        res.status(201).json({ data: partner });
      } catch (error: any) {
        console.error('[Neture] Create partner error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /neture/admin/partners/:id
   * Update partner
   */
  router.put(
    '/admin/partners/:id',
    requireAuth,
    requireScope('neture:write'),
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ max: 200 }),
      body('business_name').optional().isString().isLength({ max: 200 }),
      body('business_number').optional().isString().isLength({ max: 50 }),
      body('type').optional().isIn(Object.values(NeturePartnerType)),
      body('description').optional().isString(),
      body('logo').optional().isString(),
      body('website').optional().isURL(),
      body('contact').optional().isObject(),
      body('address').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const updateDto: UpdatePartnerRequestDto = req.body;
        const partner = await service.updatePartner(req.params.id, updateDto, userId);

        if (!partner) {
          return errorResponse(res, 404, 'NETURE_404', 'Partner not found');
        }

        res.json({ data: partner });
      } catch (error: any) {
        console.error('[Neture] Update partner error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /neture/admin/partners/:id/status
   * Update partner status
   */
  router.patch(
    '/admin/partners/:id/status',
    requireAuth,
    requireScope('neture:write'),
    [
      param('id').isUUID(),
      body('status').isIn(Object.values(NeturePartnerStatus)),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        const statusDto: UpdatePartnerStatusRequestDto = req.body;
        const partner = await service.updatePartnerStatus(req.params.id, statusDto, userId);

        if (!partner) {
          return errorResponse(res, 404, 'NETURE_404', 'Partner not found');
        }

        res.json({ data: partner });
      } catch (error: any) {
        console.error('[Neture] Update partner status error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/admin/logs
   * List product logs (audit)
   */
  router.get(
    '/admin/logs',
    requireAuth,
    requireScope('neture:read'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('product_id').optional().isUUID(),
      query('action').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListLogsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          product_id: req.query.product_id as string | undefined,
          action: req.query.action as any,
        };

        const result = await service.listLogs(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Neture] List logs error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  return router;
}
