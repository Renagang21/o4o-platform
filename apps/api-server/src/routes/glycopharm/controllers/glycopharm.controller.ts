/**
 * Glycopharm Controller
 *
 * Phase B-1: Glycopharm API Implementation
 * API endpoints for pharmacies and products
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { GlycopharmService } from '../services/glycopharm.service.js';
import { FeaturedProductsService } from '../services/featured-products.service.js';
import {
  ListPharmaciesQueryDto,
  ListProductsQueryDto,
  CreatePharmacyRequestDto,
  UpdatePharmacyRequestDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from '../dto/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  next();
};

export function createGlycopharmController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();
  const service = new GlycopharmService(dataSource);
  const featuredService = new FeaturedProductsService(dataSource);

  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  /**
   * GET /pharmacies - List active pharmacies (public)
   */
  router.get('/pharmacies', async (req: Request, res: Response): Promise<void> => {
    try {
      const queryDto: ListPharmaciesQueryDto = {
        status: 'active',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const result = await service.listPharmacies(queryDto);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list pharmacies:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /products - List active products (public)
   */
  router.get('/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const queryDto: ListProductsQueryDto = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        pharmacy_id: req.query.pharmacy_id as string,
        category: req.query.category as any,
        q: req.query.q as string,
        sort: (req.query.sort as any) || 'created_at',
        order: (req.query.order as any) || 'desc',
      };

      const result = await service.listPublicProducts(queryDto);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to list products:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /products/:id - Get product detail (public)
   */
  router.get(
    '/products/:id',
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const product = await service.getProductById(req.params.id);
        if (!product) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Product not found' },
          });
          return;
        }

        // Only return active products in public API
        if (product.status !== 'active') {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Product not found' },
          });
          return;
        }

        res.json({ data: product });
      } catch (error: any) {
        console.error('Failed to get product:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES - Pharmacies
  // ============================================================================

  /**
   * GET /admin/pharmacies - List all pharmacies (admin)
   */
  router.get(
    '/admin/pharmacies',
    requireAuth,
    requireScope('glycopharm:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const queryDto: ListPharmaciesQueryDto = {
          status: req.query.status as any,
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const result = await service.listPharmacies(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list pharmacies:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /admin/pharmacies - Create pharmacy (admin)
   */
  router.post(
    '/admin/pharmacies',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('code').isString().notEmpty().withMessage('Code is required'),
      body('address').optional().isString(),
      body('phone').optional().isString(),
      body('email').optional().isEmail(),
      body('owner_name').optional().isString(),
      body('business_number').optional().isString(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: CreatePharmacyRequestDto = req.body;
        const pharmacy = await service.createPharmacy(
          dto,
          req.user?.id,
          req.user?.name || req.user?.email
        );
        res.status(201).json({ data: pharmacy });
      } catch (error: any) {
        console.error('Failed to create pharmacy:', error);
        if (error.message === 'Pharmacy code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/pharmacies/:id - Get pharmacy detail (admin)
   */
  router.get(
    '/admin/pharmacies/:id',
    requireAuth,
    requireScope('glycopharm:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pharmacy = await service.getPharmacyById(req.params.id);
        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Pharmacy not found' },
          });
          return;
        }
        res.json({ data: pharmacy });
      } catch (error: any) {
        console.error('Failed to get pharmacy:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PUT /admin/pharmacies/:id - Update pharmacy (admin)
   */
  router.put(
    '/admin/pharmacies/:id',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString(),
      body('code').optional().isString(),
      body('address').optional().isString(),
      body('phone').optional().isString(),
      body('email').optional().isEmail(),
      body('owner_name').optional().isString(),
      body('business_number').optional().isString(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const dto: UpdatePharmacyRequestDto = req.body;
        const pharmacy = await service.updatePharmacy(req.params.id, dto);
        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Pharmacy not found' },
          });
          return;
        }
        res.json({ data: pharmacy });
      } catch (error: any) {
        console.error('Failed to update pharmacy:', error);
        if (error.message === 'Pharmacy code already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /admin/pharmacies/:id/status - Update pharmacy status (admin)
   */
  router.patch(
    '/admin/pharmacies/:id/status',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['active', 'inactive', 'suspended']),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pharmacy = await service.updatePharmacyStatus(req.params.id, req.body.status);
        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Pharmacy not found' },
          });
          return;
        }
        res.json({ data: pharmacy });
      } catch (error: any) {
        console.error('Failed to update pharmacy status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES - Products
  // ============================================================================

  /**
   * GET /admin/products - List all products (admin)
   */
  router.get(
    '/admin/products',
    requireAuth,
    requireScope('glycopharm:admin'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const queryDto: ListProductsQueryDto = {
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
          pharmacy_id: req.query.pharmacy_id as string,
          category: req.query.category as any,
          status: req.query.status as any,
          is_featured: req.query.is_featured === 'true' ? true : req.query.is_featured === 'false' ? false : undefined,
          q: req.query.q as string,
          sort: (req.query.sort as any) || 'created_at',
          order: (req.query.order as any) || 'desc',
        };

        const result = await service.listProducts(queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list products:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /admin/products - Create product (admin)
   */
  router.post(
    '/admin/products',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('sku').isString().notEmpty().withMessage('SKU is required'),
      body('pharmacy_id').optional().isUUID(),
      body('category').optional().isIn(['cgm_device', 'test_strip', 'lancet', 'meter', 'accessory', 'other']),
      body('description').optional().isString(),
      body('price').isNumeric().withMessage('Price is required'),
      body('sale_price').optional().isNumeric(),
      body('stock_quantity').optional().isInt(),
      body('manufacturer').optional().isString(),
      body('status').optional().isIn(['draft', 'active', 'inactive', 'discontinued']),
      body('is_featured').optional().isBoolean(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: CreateProductRequestDto = req.body;
        const product = await service.createProduct(
          dto,
          req.user?.id,
          req.user?.name || req.user?.email
        );
        res.status(201).json({ data: product });
      } catch (error: any) {
        console.error('Failed to create product:', error);
        if (error.message === 'Product SKU already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        if (error.message === 'Pharmacy not found') {
          res.status(400).json({
            error: { code: 'BAD_REQUEST', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/products/:id - Get product detail (admin)
   */
  router.get(
    '/admin/products/:id',
    requireAuth,
    requireScope('glycopharm:admin'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const product = await service.getProductById(req.params.id);
        if (!product) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Product not found' },
          });
          return;
        }
        res.json({ data: product });
      } catch (error: any) {
        console.error('Failed to get product:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PUT /admin/products/:id - Update product (admin)
   */
  router.put(
    '/admin/products/:id',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      param('id').isUUID(),
      body('name').optional().isString(),
      body('sku').optional().isString(),
      body('pharmacy_id').optional().isUUID(),
      body('category').optional().isIn(['cgm_device', 'test_strip', 'lancet', 'meter', 'accessory', 'other']),
      body('description').optional().isString(),
      body('price').optional().isNumeric(),
      body('sale_price').optional().isNumeric(),
      body('stock_quantity').optional().isInt(),
      body('manufacturer').optional().isString(),
      body('is_featured').optional().isBoolean(),
      body('sort_order').optional().isInt(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const dto: UpdateProductRequestDto = req.body;
        const product = await service.updateProduct(
          req.params.id,
          dto,
          req.user?.id,
          req.user?.name || req.user?.email
        );
        if (!product) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Product not found' },
          });
          return;
        }
        res.json({ data: product });
      } catch (error: any) {
        console.error('Failed to update product:', error);
        if (error.message === 'Product SKU already exists') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: error.message },
          });
          return;
        }
        if (error.message === 'Pharmacy not found') {
          res.status(400).json({
            error: { code: 'BAD_REQUEST', message: error.message },
          });
          return;
        }
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /admin/products/:id/status - Update product status (admin)
   */
  router.patch(
    '/admin/products/:id/status',
    requireAuth,
    requireScope('glycopharm:admin'),
    [
      param('id').isUUID(),
      body('status').isIn(['draft', 'active', 'inactive', 'discontinued']),
      body('reason').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const product = await service.updateProductStatus(
          req.params.id,
          req.body.status,
          req.body.reason,
          req.user?.id,
          req.user?.name || req.user?.email
        );
        if (!product) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Product not found' },
          });
          return;
        }
        res.json({ data: product });
      } catch (error: any) {
        console.error('Failed to update product status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ============================================================================
  // FEATURED PRODUCTS (OPERATOR)
  // WO-FEATURED-CURATION-API-V1
  // ============================================================================

  /**
   * GET /operator/featured-products - List featured products
   */
  router.get(
    '/operator/featured-products',
    requireAuth,
    requireScope('glycopharm:operator'),
    [
      query('service').isString().notEmpty(),
      query('context').isString().notEmpty(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const service = req.query.service as string;
        const context = req.query.context as string;

        const featuredProducts = await featuredService.listFeaturedProducts(service, context);

        res.json({
          success: true,
          data: featuredProducts,
        });
      } catch (error: any) {
        console.error('Failed to list featured products:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /operator/featured-products - Add product to featured
   */
  router.post(
    '/operator/featured-products',
    requireAuth,
    requireScope('glycopharm:operator'),
    [
      body('service').isString().notEmpty(),
      body('context').isString().notEmpty(),
      body('productId').isUUID(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const featuredProduct = await featuredService.addFeaturedProduct({
          service: req.body.service,
          context: req.body.context,
          productId: req.body.productId,
          userId: req.user?.id,
          userName: req.user?.name || req.user?.email,
        });

        res.status(201).json({
          success: true,
          data: featuredProduct,
        });
      } catch (error: any) {
        console.error('Failed to add featured product:', error);

        if (error.message.includes('이미 Featured로 등록된')) {
          res.status(409).json({
            success: false,
            error: { code: 'ALREADY_EXISTS', message: error.message },
          });
        } else if (error.message.includes('찾을 수 없습니다')) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: error.message },
          });
        } else {
          res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message },
          });
        }
      }
    }
  );

  /**
   * PATCH /operator/featured-products/order - Reorder featured products
   */
  router.patch(
    '/operator/featured-products/order',
    requireAuth,
    requireScope('glycopharm:operator'),
    [
      body('ids').isArray().notEmpty(),
      body('ids.*').isUUID(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        await featuredService.reorderFeaturedProducts(req.body.ids);

        res.json({
          success: true,
          message: '순서가 변경되었습니다',
        });
      } catch (error: any) {
        console.error('Failed to reorder featured products:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /operator/featured-products/:id - Update featured product active status
   */
  router.patch(
    '/operator/featured-products/:id',
    requireAuth,
    requireScope('glycopharm:operator'),
    [
      param('id').isUUID(),
      body('isActive').isBoolean(),
      handleValidationErrors,
    ],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const featuredProduct = await featuredService.updateFeaturedActive(req.params.id, {
          isActive: req.body.isActive,
        });

        if (!featuredProduct) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Featured 상품을 찾을 수 없습니다' },
          });
          return;
        }

        res.json({
          success: true,
          data: featuredProduct,
        });
      } catch (error: any) {
        console.error('Failed to update featured product:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * DELETE /operator/featured-products/:id - Remove product from featured
   */
  router.delete(
    '/operator/featured-products/:id',
    requireAuth,
    requireScope('glycopharm:operator'),
    [param('id').isUUID(), handleValidationErrors],
    async (req: Request, res: Response): Promise<void> => {
      try {
        const success = await featuredService.removeFeaturedProduct(req.params.id);

        if (!success) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Featured 상품을 찾을 수 없습니다' },
          });
          return;
        }

        res.json({
          success: true,
          message: 'Featured에서 제거되었습니다',
        });
      } catch (error: any) {
        console.error('Failed to remove featured product:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
