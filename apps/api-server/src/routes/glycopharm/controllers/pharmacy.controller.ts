/**
 * Glycopharm Pharmacy Controller
 *
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1:
 * - resolve 직접 호출 제거 → 미들웨어(requirePharmacyContext) 사용
 * - 핸들러는 req.pharmacyId만 참조
 *
 * Pharmacy-specific API endpoints for:
 * - Products management (my pharmacy's products)
 * - Categories
 * - Orders
 * - Customers
 * - B2B products
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
// Orders will be handled via E-commerce Core with OrderType.GLYCOPHARM
import type { PharmacyContextRequest } from '../pharmacy-context.middleware.js';

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
  requireAuth: AuthMiddleware,
  requirePharmacyContext: AuthMiddleware,
): Router {
  const router = Router();

  /**
   * GET /pharmacy/products
   * Get products for the authenticated user's pharmacy
   */
  router.get(
    '/products',
    requireAuth,
    requirePharmacyContext,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const pharmacyId = pcReq.pharmacyId!;

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
          .where('product.pharmacy_id = :pharmacyId', { pharmacyId });

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

  return router;
}

// WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §6:
// createB2BController (GET /api/v1/glycopharm/b2b/products) removed.
// legacy `glycopharm_products` 를 읽던 dead 경로였고 runtime consumer 0 이었다.
// 매장 B2B 상품 조회의 canonical 경로는 `/api/v1/store/commerce/products` ·
// `/api/v1/{service}/pharmacy/products/*` (supplier_product_offers 축)다.

// WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1:
// createMarketTrialsController removed.
// Market Trial is now a platform-common B2B feature at GET /api/market-trial?serviceKey=glycopharm
