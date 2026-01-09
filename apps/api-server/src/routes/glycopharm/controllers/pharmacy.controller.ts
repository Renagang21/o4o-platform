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
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmOrder } from '../entities/glycopharm-order.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

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
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
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
          .where('product.pharmacyId = :pharmacyId', { pharmacyId: pharmacy.id });

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
          thumbnailUrl: p.image_url,
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
   */
  router.get(
    '/orders',
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
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
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
        const status = req.query.status as string;
        const search = req.query.search as string;

        // Build query
        const orderRepo = dataSource.getRepository(GlycopharmOrder);
        const queryBuilder = orderRepo
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.items', 'items')
          .where('order.pharmacyId = :pharmacyId', { pharmacyId: pharmacy.id });

        // Apply filters
        if (status) {
          queryBuilder.andWhere('order.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(order.orderNumber ILIKE :search OR order.customerName ILIKE :search)',
            { search: `%${search}%` }
          );
        }

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const orders = await queryBuilder
          .orderBy('order.createdAt', 'DESC')
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .getMany();

        // Map to response format
        const items = orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerId: o.userId || '',
          customerName: o.customerName,
          customerPhone: o.customerPhone || '',
          items: o.items?.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            productImage: undefined,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
          })) || [],
          subtotal: Number(o.totalAmount) - Number(o.shippingFee || 0),
          shippingFee: Number(o.shippingFee || 0),
          totalAmount: Number(o.totalAmount),
          status: o.status,
          shippingAddress: o.shippingAddress || {
            recipient: o.customerName,
            phone: o.customerPhone || '',
            zipCode: '',
            address1: '',
          },
          trackingNumber: o.trackingNumber,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
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
   */
  router.get(
    '/customers',
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
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.json({
            success: true,
            data: {
              items: [],
              total: 0,
              page: 1,
              pageSize: 50,
              totalPages: 0,
            },
          });
          return;
        }

        // Get query params
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 50;

        // Get unique customers from orders
        const orderRepo = dataSource.getRepository(GlycopharmOrder);
        const customersData = await orderRepo
          .createQueryBuilder('order')
          .select('order.userId', 'userId')
          .addSelect('order.customerName', 'name')
          .addSelect('order.customerPhone', 'phone')
          .addSelect('COUNT(order.id)', 'totalOrders')
          .addSelect('SUM(order.totalAmount)', 'totalSpent')
          .addSelect('MAX(order.createdAt)', 'lastOrderAt')
          .where('order.pharmacyId = :pharmacyId', { pharmacyId: pharmacy.id })
          .andWhere('order.userId IS NOT NULL')
          .groupBy('order.userId')
          .addGroupBy('order.customerName')
          .addGroupBy('order.customerPhone')
          .orderBy('MAX(order.createdAt)', 'DESC')
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .getRawMany();

        // Get total count
        const totalResult = await orderRepo
          .createQueryBuilder('order')
          .select('COUNT(DISTINCT order.userId)', 'count')
          .where('order.pharmacyId = :pharmacyId', { pharmacyId: pharmacy.id })
          .andWhere('order.userId IS NOT NULL')
          .getRawOne();

        const total = parseInt(totalResult?.count || '0');

        const items = customersData.map((c) => ({
          id: c.userId || c.name,
          name: c.name || '알 수 없음',
          phone: c.phone || '',
          email: undefined,
          diabetesType: undefined,
          lastOrderAt: c.lastOrderAt,
          totalOrders: parseInt(c.totalOrders || '0'),
          totalSpent: parseFloat(c.totalSpent || '0'),
          status: 'active' as const,
          createdAt: c.lastOrderAt,
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
 */
export function createB2BController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

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

        // For now, return empty array as B2B products need separate implementation
        // This prevents 404 errors while the feature is being developed
        res.json({
          success: true,
          data: [],
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
