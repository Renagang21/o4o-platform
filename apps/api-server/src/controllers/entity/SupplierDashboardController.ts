import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Supplier } from '../../entities/Supplier.js';
import { Product } from '../../entities/Product.js';
import { OrderStatus } from '../../entities/Order.js';
import {
  SupplierDashboardSummaryDto,
  createDashboardError,
  createDashboardMeta
} from '../../dto/dashboard.dto.js';
import { dashboardRangeService } from '../../services/DashboardRangeService.js';
import { SupplierDashboardService } from '../../services/SupplierDashboardService.js';

/**
 * Supplier Dashboard Controller
 * R-6-2: Updated with standard DTO and range service
 * R-8: Implemented order statistics using SupplierDashboardService
 * Provides dashboard metrics and statistics for suppliers
 */
export class SupplierDashboardController {
  private supplierDashboardService = new SupplierDashboardService();

  /**
   * GET /api/v1/suppliers/dashboard/stats
   * Get supplier dashboard statistics
   * R-6-2: Supports both legacy (period) and new (range) parameters
   *
   * Query params:
   * - New format: ?range=7d (or 30d, 90d, 1y, custom)
   * - Custom range: ?range=custom&start=2025-01-01&end=2025-01-31
   * - Legacy format: ?period=7d|30d|90d|1y (default: 30d)
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      // Find supplier by userId
      const supplierRepo = AppDataSource.getRepository(Supplier);
      const supplier = await supplierRepo.findOne({
        where: { userId }
      });

      if (!supplier && userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(404).json(
          createDashboardError('NOT_FOUND', 'Supplier profile not found')
        );
        return;
      }

      // For admin: can query by supplierId param
      const targetSupplierId = (req.query.supplierId as string) || supplier?.id;

      if (!targetSupplierId) {
        res.status(400).json(
          createDashboardError('INVALID_PARAMS', 'Supplier ID is required')
        );
        return;
      }

      // Authorization check: non-admin can only see own stats
      if (userRole !== 'admin' && userRole !== 'super_admin' && targetSupplierId !== supplier?.id) {
        res.status(403).json(
          createDashboardError('UNAUTHORIZED', 'You do not have permission to view this supplier\'s stats')
        );
        return;
      }

      // R-6-2: Parse date range using standard service
      // Supports both ?period=7d (legacy) and ?range=7d (new)
      const parsedRange = dashboardRangeService.parseDateRange(req.query);

      // Get product statistics
      const productRepo = AppDataSource.getRepository(Product);

      // Total products by status
      const productStats = await productRepo
        .createQueryBuilder('product')
        .select('product.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('product.supplierId = :supplierId', { supplierId: targetSupplierId })
        .groupBy('product.status')
        .getRawMany();

      const totalProducts = productStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      const approvedProducts = productStats.find(s => s.status === 'approved')?.count || 0;
      const pendingProducts = productStats.find(s => s.status === 'pending')?.count || 0;
      const rejectedProducts = productStats.find(s => s.status === 'rejected')?.count || 0;

      // Inventory statistics
      const inventoryStats = await productRepo
        .createQueryBuilder('product')
        .select('COUNT(CASE WHEN product.inventory > 0 AND product.inventory < product.lowStockThreshold THEN 1 END)', 'lowStock')
        .addSelect('COUNT(CASE WHEN product.inventory = 0 THEN 1 END)', 'outOfStock')
        .where('product.supplierId = :supplierId', { supplierId: targetSupplierId })
        .getRawOne();

      const lowStockProducts = parseInt(inventoryStats?.lowStock || '0');
      const outOfStockProducts = parseInt(inventoryStats?.outOfStock || '0');

      // R-8: Revenue statistics using SupplierDashboardService
      const orderSummary = await this.supplierDashboardService.getSummaryForSupplier(
        targetSupplierId,
        parsedRange
      );

      const totalRevenue = orderSummary.totalRevenue;
      const totalProfit = orderSummary.totalProfit || 0;
      const monthlyOrders = orderSummary.totalOrders;
      const avgOrderValue = orderSummary.averageOrderValue;

      // R-6-2: Create metadata
      const meta = createDashboardMeta(
        { range: parsedRange.range },
        parsedRange.startDate,
        parsedRange.endDate
      );

      // R-6-2: Return standard DTO with legacy fields
      const response: SupplierDashboardSummaryDto = {
        // Standard fields
        totalOrders: monthlyOrders,
        totalRevenue,
        averageOrderValue: avgOrderValue,
        totalProducts,
        approvedProducts: parseInt(approvedProducts),
        pendingProducts: parseInt(pendingProducts),
        rejectedProducts: parseInt(rejectedProducts),
        lowStockProducts,
        outOfStockProducts,
        totalProfit,

        // Legacy fields for backward compatibility
        monthlyOrders,
        avgOrderValue,
        period: parsedRange.range,
        startDate: parsedRange.startDate.toISOString(),
        endDate: parsedRange.endDate.toISOString(),
        calculatedAt: meta.calculatedAt
      };

      res.json({
        success: true,
        data: {
          ...response,
          meta
        }
      });
    } catch (error: any) {
      console.error('Error fetching supplier stats:', error);

      // R-6-2: Standard error response
      if (error.success === false) {
        // Already formatted dashboard error
        res.status(400).json(error);
        return;
      }

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to fetch supplier statistics',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/suppliers/dashboard/products
   * Get supplier's products with filtering
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const {
        status,
        lowStock = false,
        outOfStock = false,
        page = 1,
        limit = 20
      } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const supplier = await supplierRepo.findOne({
        where: { userId }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier profile not found'
        });
        return;
      }

      const productRepo = AppDataSource.getRepository(Product);
      const queryBuilder = productRepo.createQueryBuilder('product')
        .where('product.supplierId = :supplierId', { supplierId: supplier.id });

      // Apply filters
      if (status) {
        queryBuilder.andWhere('product.status = :status', { status });
      }

      if (lowStock === 'true' || (lowStock as any) === true) {
        queryBuilder.andWhere('product.inventory > 0 AND product.inventory < product.lowStockThreshold');
      }

      if (outOfStock === 'true' || (outOfStock as any) === true) {
        queryBuilder.andWhere('product.inventory = 0');
      }

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy('product.createdAt', 'DESC')
        .skip(skip)
        .take(limitNum);

      const [products, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products'
      });
    }
  }

  /**
   * GET /api/v1/entity/suppliers/dashboard/orders
   * R-8: Get supplier's orders with pagination
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const {
        status,
        from,
        to,
        page = 1,
        limit = 20
      } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const supplier = await supplierRepo.findOne({
        where: { userId }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier profile not found'
        });
        return;
      }

      // Parse status filter
      const statusFilter = status
        ? (status as string).split(',') as OrderStatus[]
        : undefined;

      // Parse date range
      const dateRange: any = {};
      if (from) {
        dateRange.from = new Date(from as string);
      }
      if (to) {
        dateRange.to = new Date(to as string);
      }

      const result = await this.supplierDashboardService.getOrdersForSupplier(supplier.id, {
        dateRange: Object.keys(dateRange).length > 0 ? dateRange : undefined,
        status: statusFilter,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      });

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            totalPages: Math.ceil(result.total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders'
      });
    }
  }

  /**
   * GET /api/v1/entity/suppliers/dashboard/revenue
   * R-8: Get supplier's revenue details
   */
  async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { from, to } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const supplierRepo = AppDataSource.getRepository(Supplier);
      const supplier = await supplierRepo.findOne({
        where: { userId }
      });

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: 'Supplier profile not found'
        });
        return;
      }

      // Parse date range
      const dateRange: any = {};
      if (from) {
        dateRange.from = new Date(from as string);
      }
      if (to) {
        dateRange.to = new Date(to as string);
      }

      const revenueData = await this.supplierDashboardService.getRevenueDetailsForSupplier(
        supplier.id,
        Object.keys(dateRange).length > 0 ? dateRange : undefined
      );

      res.json({
        success: true,
        data: revenueData
      });
    } catch (error) {
      console.error('Error fetching supplier revenue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue details'
      });
    }
  }
}
