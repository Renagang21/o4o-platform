/**
 * Glycopharm Pharmacy Controller
 *
 * Pharmacy-specific API endpoints for:
 * - Products management (my pharmacy's products)
 * - Categories
 * - Orders
 * - Customers
 * - B2B products
 * - Signage contents
 * - Market trials
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
// Orders will be handled via E-commerce Core with OrderType.GLYCOPHARM
import type { AuthRequest } from '../../../types/auth.js';
import { GlycopharmRepository } from '../repositories/glycopharm.repository.js';

type AuthMiddleware = RequestHandler;

// Product categories for blood glucose products
const PRODUCT_CATEGORIES = [
  { id: 'cgm_device', name: 'CGM 기기', description: '연속혈당측정기' },
  { id: 'test_strip', name: '시험지', description: '혈당측정 시험지' },
  { id: 'lancet', name: '란셋', description: '채혈용 란셋' },
  { id: 'meter', name: '혈당측정기', description: '혈당측정기기' },
  { id: 'accessory', name: '액세서리', description: '관련 액세서리' },
  { id: 'other', name: '기타', description: '기타 제품' },
];

export function createPharmacyController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /pharmacy/products
   * Get products for the authenticated user's pharmacy
   */
  router.get(
    '/products',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Find pharmacy owned by user
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          // Return empty list if no pharmacy
          res.json({
            success: true,
            data: {
              items: [],
              total: 0,
              page: 1,
              pageSize: 20,
              totalPages: 0,
            },
          });
          return;
        }

        // Get query params
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const categoryId = req.query.categoryId as string;
        const status = req.query.status as string;
        const search = req.query.search as string;

        // Build query
        const productRepo = dataSource.getRepository(GlycopharmProduct);
        const queryBuilder = productRepo
          .createQueryBuilder('product')
          .where('product.pharmacy_id = :pharmacyId', { pharmacyId: pharmacy.id });

        // Apply filters
        if (categoryId) {
          queryBuilder.andWhere('product.category = :category', { category: categoryId });
        }

        if (status) {
          queryBuilder.andWhere('product.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(product.name ILIKE :search OR product.sku ILIKE :search)',
            { search: `%${search}%` }
          );
        }

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const products = await queryBuilder
          .orderBy('product.created_at', 'DESC')
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getMany();

        // Map to response format
        const items = products.map((p) => ({
          id: p.id,
          name: p.name,
          categoryId: p.category,
          categoryName: PRODUCT_CATEGORIES.find((c) => c.id === p.category)?.name || p.category,
          price: Number(p.price),
          salePrice: p.sale_price ? Number(p.sale_price) : undefined,
          stock: p.stock_quantity || 0,
          status: p.status,
          thumbnailUrl: undefined, // image_url not in entity
          isDropshipping: false,
          supplierId: '',
          supplierName: p.manufacturer || '',
          createdAt: p.created_at.toISOString(),
        }));

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy products:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/categories
   * Get product categories
   */
  router.get(
    '/categories',
    requireAuth,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        res.json({
          success: true,
          data: PRODUCT_CATEGORIES.map((c) => ({
            id: c.id,
            name: c.name,
          })),
        });
      } catch (error: any) {
        console.error('Failed to get categories:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/orders
   * Get orders for the authenticated user's pharmacy
   *
   * NOTE: Phase 4-A - Legacy Order System Deprecated
   * This endpoint returns empty data until E-commerce Core integration is complete.
   * Orders will be handled via E-commerce Core with OrderType.GLYCOPHARM
   */
  router.get(
    '/orders',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;

        // Phase 4-A: Legacy Order System removed
        // Return empty data until E-commerce Core integration
        res.json({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
          _notice: 'Order system migration in progress. Orders will be available via E-commerce Core.',
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy orders:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/customers
   * Get customers for the authenticated user's pharmacy
   *
   * NOTE: Phase 4-A - Legacy Order System Deprecated
   * Customer data was derived from orders. Returns empty until E-commerce Core integration.
   */
  router.get(
    '/customers',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 50;

        // Phase 4-A: Legacy Order System removed
        // Customer data was derived from orders - return empty until E-commerce Core integration
        res.json({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
          _notice: 'Customer data migration in progress. Data will be available via E-commerce Core.',
        });
      } catch (error: any) {
        console.error('Failed to get pharmacy customers:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

/**
 * Create B2B products controller
 *
 * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T1-T2)
 * - Query actual products from database
 * - Filter by status='active' for both franchise and general B2B
 */
export function createB2BController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const repository = new GlycopharmRepository(dataSource);

  /**
   * GET /b2b/products
   * Get B2B products (franchise or general)
   */
  router.get(
    '/products',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const type = req.query.type as string; // 'franchise' or 'general'
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;

        // Query active products from database with type filter
        // franchise → is_featured = true (exclusive products for franchise partners)
        // general → all active products
        const result = await repository.findAllProducts({
          status: 'active',
          is_featured: type === 'franchise' ? true : undefined,
          page,
          limit,
        });

        // Map to B2B product format
        const products = result.data.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          price: Number(product.price),
          discountPrice: product.sale_price ? Number(product.sale_price) : undefined,
          supplierName: product.manufacturer || 'Unknown',
          image: product.images?.[0]?.url,
          stock: product.stock_quantity,
          status: product.status,
          type: type || 'general',
          isRecommended: product.is_featured || false,
        }));

        res.json({
          success: true,
          data: products,
          meta: result.meta,
        });
      } catch (error: any) {
        console.error('Failed to get B2B products:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

/**
 * Create market trials controller
 */
export function createMarketTrialsController(
  _dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /market-trials
   * Get market trial products
   */
  router.get(
    '/',
    requireAuth,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        // Return empty array for now - feature to be implemented
        res.json({
          success: true,
          data: [],
        });
      } catch (error: any) {
        console.error('Failed to get market trials:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
