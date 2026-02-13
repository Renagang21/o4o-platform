/**
 * Cosmetics Controller
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Express router with all cosmetics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { CosmeticsService } from '../services/cosmetics.service.js';
import { CosmeticsStoreSummaryService } from '../services/cosmetics-store-summary.service.js';
import { CosmeticsProductStatus } from '../entities/index.js';
import {
  ErrorResponseDto,
  ListProductsQueryDto,
  SearchProductsQueryDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
  UpdateStatusRequestDto,
  UpdatePricePolicyRequestDto,
  ListBrandsQueryDto,
  ListLinesQueryDto,
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
 * Create cosmetics router
 */
export function createCosmeticsController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const service = new CosmeticsService(dataSource);
  const storeSummaryService = new CosmeticsStoreSummaryService(dataSource);

  // ============================================================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================================================

  /**
   * GET /cosmetics/products
   * List products with pagination and filters
   */
  router.get(
    '/products',
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('brand_id').optional().isUUID(),
      query('line_id').optional().isUUID(),
      query('status').optional().isIn(['draft', 'visible', 'hidden', 'sold_out']),
      query('sort').optional().isIn(['created_at', 'price', 'name']),
      query('order').optional().isIn(['asc', 'desc']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListProductsQueryDto = {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          brand_id: req.query.brand_id as string | undefined,
          line_id: req.query.line_id as string | undefined,
          status: req.query.status as CosmeticsProductStatus | undefined,
          sort: req.query.sort as 'created_at' | 'price' | 'name' | undefined,
          order: req.query.order as 'asc' | 'desc' | undefined,
        };

        const result = await service.listProducts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Cosmetics] List products error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/products/search
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
        console.error('[Cosmetics] Search products error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/products/:id
   * Get single product details
   */
  router.get(
    '/products/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getProduct(req.params.id);
        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_001', 'Product not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Get product error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/brands
   * List all brands
   */
  router.get(
    '/brands',
    [query('is_active').optional().isBoolean().toBoolean()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListBrandsQueryDto = {
          is_active: req.query.is_active !== undefined
            ? String(req.query.is_active) === 'true'
            : undefined,
        };

        const result = await service.listBrands(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Cosmetics] List brands error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/brands/:id
   * Get single brand with lines
   */
  router.get(
    '/brands/:id',
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getBrand(req.params.id);
        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_002', 'Brand not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Get brand error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/lines
   * List all lines
   */
  router.get(
    '/lines',
    [query('brand_id').optional().isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListLinesQueryDto = {
          brand_id: req.query.brand_id as string | undefined,
        };

        const result = await service.listLines(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Cosmetics] List lines error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  // ============================================================================
  // ADMIN ENDPOINTS (Auth + cosmetics:admin scope required)
  // ============================================================================

  /**
   * POST /cosmetics/admin/products
   * Create new product
   */
  router.post(
    '/admin/products',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      body('name').notEmpty().isString().isLength({ min: 1, max: 200 }),
      body('brand_id').notEmpty().isUUID(),
      body('line_id').optional().isUUID(),
      body('description').optional().isString().isLength({ max: 5000 }),
      body('ingredients').optional().isArray(),
      body('price').notEmpty().isObject(),
      body('price.base').notEmpty().isInt({ min: 0 }),
      body('price.sale').optional({ nullable: true }).isInt({ min: 0 }),
      body('status').optional().isIn(['draft', 'visible', 'hidden', 'sold_out']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name || authReq.user?.email || authReq.authUser?.email;

        const dto: CreateProductRequestDto = req.body;
        const result = await service.createProduct(
          dto,
          userId,
          userName
        );

        res.status(201).json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Create product error:', error);
        if (error.message === 'BRAND_NOT_FOUND') {
          return errorResponse(res, 400, 'COSMETICS_003', 'Brand not found');
        }
        if (error.message === 'LINE_NOT_FOUND') {
          return errorResponse(res, 400, 'COSMETICS_004', 'Line not found');
        }
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /cosmetics/admin/products/:id
   * Update product
   */
  router.put(
    '/admin/products/:id',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString().isLength({ min: 1, max: 200 }),
      body('brand_id').optional().isUUID(),
      body('line_id').optional().isUUID(),
      body('description').optional().isString().isLength({ max: 5000 }),
      body('ingredients').optional().isArray(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name || authReq.user?.email || authReq.authUser?.email;

        const dto: UpdateProductRequestDto = req.body;
        const result = await service.updateProduct(
          req.params.id,
          dto,
          userId,
          userName
        );

        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_001', 'Product not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Update product error:', error);
        if (error.message === 'BRAND_NOT_FOUND') {
          return errorResponse(res, 400, 'COSMETICS_003', 'Brand not found');
        }
        if (error.message === 'LINE_NOT_FOUND') {
          return errorResponse(res, 400, 'COSMETICS_004', 'Line not found');
        }
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * PATCH /cosmetics/admin/products/:id/status
   * Update product status
   */
  router.patch(
    '/admin/products/:id/status',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      param('id').isUUID(),
      body('status').notEmpty().isIn(['draft', 'visible', 'hidden', 'sold_out']),
      body('reason').optional().isString().isLength({ max: 500 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name || authReq.user?.email || authReq.authUser?.email;

        const dto: UpdateStatusRequestDto = req.body;
        const result = await service.updateProductStatus(
          req.params.id,
          dto,
          userId,
          userName
        );

        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_001', 'Product not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Update status error:', error);
        if (error.message === 'INVALID_STATUS_TRANSITION') {
          return errorResponse(res, 400, 'COSMETICS_005', 'Invalid status transition');
        }
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/admin/prices/:productId
   * Get price policy
   */
  router.get(
    '/admin/prices/:productId',
    requireAuth,
    requireScope('cosmetics:admin'),
    [param('productId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getPricePolicy(req.params.productId);
        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_001', 'Product not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Get price policy error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * PUT /cosmetics/admin/prices/:productId
   * Update price policy
   */
  router.put(
    '/admin/prices/:productId',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      param('productId').isUUID(),
      body('base_price').notEmpty().isInt({ min: 0 }),
      body('sale_price').optional({ nullable: true }).isInt({ min: 0 }),
      body('sale_start_at').optional({ nullable: true }).isISO8601(),
      body('sale_end_at').optional({ nullable: true }).isISO8601(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id;
        const userName = authReq.user?.name || authReq.authUser?.name || authReq.user?.email || authReq.authUser?.email;

        const dto: UpdatePricePolicyRequestDto = req.body;
        const result = await service.updatePricePolicy(
          req.params.productId,
          dto,
          userId,
          userName
        );

        if (!result) {
          return errorResponse(res, 404, 'COSMETICS_001', 'Product not found');
        }

        res.json({ data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Update price policy error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/admin/logs/products
   * Get product change logs
   */
  router.get(
    '/admin/logs/products',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      query('product_id').optional().isUUID(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListLogsQueryDto = {
          product_id: req.query.product_id as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        };

        const result = await service.getProductLogs(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Cosmetics] Get product logs error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/admin/logs/prices
   * Get price change logs
   */
  router.get(
    '/admin/logs/prices',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      query('product_id').optional().isUUID(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const queryDto: ListLogsQueryDto = {
          product_id: req.query.product_id as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        };

        const result = await service.getPriceLogs(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('[Cosmetics] Get price logs error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /cosmetics/admin/dashboard/summary
   * Get operator dashboard summary
   *
   * WO-KCOS-STORES-PHASE2: Real store/order data from DB
   */
  router.get(
    '/admin/dashboard/summary',
    requireAuth,
    requireScope('cosmetics:admin'),
    async (_req: Request, res: Response) => {
      try {
        // Get real store/order data from summary service
        const adminSummary = await storeSummaryService.getAdminSummary();

        // Get catalog stats from existing service
        const catalogStats = await service.getOperatorDashboardSummary();

        // Merge: real store/order data + catalog data
        const result = {
          stats: {
            totalStores: adminSummary.totalStores,
            activeOrders: adminSummary.activeOrders,
            monthlyRevenue: adminSummary.monthlyRevenue > 0
              ? `₩${adminSummary.monthlyRevenue.toLocaleString()}`
              : '₩0',
            newSignups: catalogStats.stats.newSignups,
          },
          recentOrders: adminSummary.recentOrders.map((o) => ({
            id: o.id,
            store: o.channel || 'N/A',
            amount: `₩${o.totalAmount.toLocaleString()}`,
            status: o.status,
            time: o.createdAt,
          })),
          recentApplications: catalogStats.recentApplications,
        };

        res.json({ success: true, data: result });
      } catch (error: any) {
        console.error('[Cosmetics] Get dashboard summary error:', error);
        errorResponse(res, 500, 'COSMETICS_500', 'Internal server error');
      }
    }
  );

  return router;
}
