/**
 * SellerDashboardService
 * Phase PD-1: Partner Dashboard v1 - Seller metrics and commission tracking
 * R-6-2: Updated with standard DTO and range service
 * R-8: Refactored to use SettlementReadService for commission reading
 *
 * Provides seller-specific statistics, orders, and commission calculations
 */

import AppDataSource from '../../../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../../commerce/entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../commerce/entities/OrderItem.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { SellerAuthorization, AuthorizationStatus } from '../entities/SellerAuthorization.js';
import { Between, In } from 'typeorm';
import logger from '../../../utils/logger.js';
import {
  SellerDashboardSummaryDto,
  DashboardMetaDto,
  createDashboardMeta,
  DateRangeFilter,
  PaginationParams
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';
import { SettlementReadService } from '../../commerce/services/SettlementReadService.js';
import { cacheService, CacheKeys, getCacheConfig } from '../../../cache/index.js';

/**
 * @deprecated Use SellerDashboardSummaryDto from dashboard.dto.ts
 * Kept for backward compatibility
 */
export interface SellerDashboardSummary {
  totalOrders: number;
  totalSalesAmount: number;
  totalItems: number;
  totalCommissionAmount: number;
  avgOrderAmount: number;
}

export interface SellerOrderSummary {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  buyerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  sellerAmount: number; // Amount for seller's items only
  commissionAmount: number;
  itemCount: number;
}

// DateRangeFilter and PaginationParams imported from dashboard.dto.ts

export class SellerDashboardService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItemEntity);
  private sellerProductRepository = AppDataSource.getRepository(SellerProduct);
  private sellerAuthorizationRepository = AppDataSource.getRepository(SellerAuthorization);
  private settlementReadService = new SettlementReadService();

  /**
   * Get dashboard summary for a seller
   * R-8-3-2: Refactored to use OrderItem entity instead of JSONB filtering
   * Aggregates orders where at least one item belongs to the seller
   * R-6-2: Updated to use standard DTO and support both old and new query formats
   * R-8-7: Added caching with 60-second TTL
   */
  async getSummaryForSeller(
    sellerId: string,
    dateRange?: DateRangeFilter | ParsedDateRange
  ): Promise<SellerDashboardSummaryDto> {
    try {
      // Convert legacy DateRangeFilter to ParsedDateRange if needed
      let parsedRange: ParsedDateRange;
      if (dateRange && 'range' in dateRange) {
        // Already parsed
        parsedRange = dateRange as ParsedDateRange;
      } else if (dateRange && ('from' in dateRange || 'to' in dateRange)) {
        // Legacy format - convert
        parsedRange = {
          startDate: (dateRange as DateRangeFilter).from || new Date('2020-01-01'),
          endDate: (dateRange as DateRangeFilter).to || new Date(),
          range: 'custom'
        };
      } else {
        // Default to 30 days
        parsedRange = dashboardRangeService.parseDateRange({});
      }

      // R-8-7: Check cache first
      const cacheKey = CacheKeys.SELLER_DASHBOARD_SUMMARY(sellerId);
      const cached = await cacheService.get<SellerDashboardSummaryDto>(cacheKey);
      if (cached) {
        logger.debug(`[SellerDashboardService] Cache HIT for summary: ${sellerId}`);
        return cached;
      }

      // R-8-3-2: Use OrderItem-based query instead of JSONB filtering
      // This significantly improves performance by leveraging database indexes
      const result = await this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('COUNT(DISTINCT order.id)', 'totalOrders')
        .addSelect('SUM(item.totalPrice)', 'totalSalesAmount')
        .addSelect('SUM(item.quantity)', 'totalItems')
        .addSelect('SUM(item.commissionAmount)', 'totalCommissionAmount')
        .where('item.sellerId = :sellerId', { sellerId })
        .andWhere('order.paymentStatus IN (:...statuses)', {
          statuses: [PaymentStatus.COMPLETED]
        })
        .andWhere('order.orderDate BETWEEN :startDate AND :endDate', {
          startDate: parsedRange.startDate,
          endDate: parsedRange.endDate
        })
        .getRawOne();

      // Extract aggregated values from query result
      const totalOrders = parseInt(result?.totalOrders || '0', 10);
      const totalSalesAmount = parseFloat(result?.totalSalesAmount || '0');
      const totalItems = parseInt(result?.totalItems || '0', 10);
      const totalCommissionAmount = parseFloat(result?.totalCommissionAmount || '0');
      const avgOrderAmount = totalOrders > 0 ? totalSalesAmount / totalOrders : 0;

      // Phase B-4 Step 5: Calculate product catalog statistics from SellerProduct table
      const productStats = await this.sellerProductRepository
        .createQueryBuilder('sellerProduct')
        .select('COUNT(*)', 'totalProducts')
        .addSelect('SUM(CASE WHEN sellerProduct.isActive = true THEN 1 ELSE 0 END)', 'activeProducts')
        .addSelect('SUM(CASE WHEN sellerProduct.isActive = false THEN 1 ELSE 0 END)', 'inactiveProducts')
        .addSelect('SUM(sellerProduct.salesCount)', 'totalProductSales')
        .addSelect('SUM(sellerProduct.totalSold)', 'totalUnitsSold')
        .where('sellerProduct.sellerId = :sellerId', { sellerId })
        .getRawOne();

      const totalProducts = parseInt(productStats?.totalProducts || '0', 10);
      const activeProducts = parseInt(productStats?.activeProducts || '0', 10);
      const inactiveProducts = parseInt(productStats?.inactiveProducts || '0', 10);
      const totalProductSales = parseInt(productStats?.totalProductSales || '0', 10);
      const totalUnitsSold = parseInt(productStats?.totalUnitsSold || '0', 10);

      // Phase B-4 Step 5: Calculate authorization statistics from SellerAuthorization table
      const authStats = await this.sellerAuthorizationRepository
        .createQueryBuilder('auth')
        .select('COUNT(*)', 'totalAuthorizations')
        .addSelect('SUM(CASE WHEN auth.status = :requestedStatus THEN 1 ELSE 0 END)', 'pendingAuthorizations')
        .addSelect('SUM(CASE WHEN auth.status = :approvedStatus THEN 1 ELSE 0 END)', 'approvedAuthorizations')
        .addSelect('SUM(CASE WHEN auth.status = :rejectedStatus THEN 1 ELSE 0 END)', 'rejectedAuthorizations')
        .where('auth.sellerId = :sellerId', { sellerId })
        .setParameters({
          requestedStatus: AuthorizationStatus.REQUESTED,
          approvedStatus: AuthorizationStatus.APPROVED,
          rejectedStatus: AuthorizationStatus.REJECTED
        })
        .getRawOne();

      const totalAuthorizations = parseInt(authStats?.totalAuthorizations || '0', 10);
      const pendingAuthorizations = parseInt(authStats?.pendingAuthorizations || '0', 10);
      const approvedAuthorizations = parseInt(authStats?.approvedAuthorizations || '0', 10);
      const rejectedAuthorizations = parseInt(authStats?.rejectedAuthorizations || '0', 10);

      // R-6-2: Return standard DTO with legacy fields for backward compatibility
      const summary: SellerDashboardSummaryDto = {
        totalOrders,
        totalRevenue: Math.round(totalSalesAmount), // Standard field
        averageOrderValue: Math.round(avgOrderAmount), // Standard field
        totalItems,
        totalCommission: Math.round(totalCommissionAmount),
        // Phase B-4 Step 5: Product catalog statistics
        totalProducts,
        activeProducts,
        inactiveProducts,
        totalProductSales,
        totalUnitsSold,
        // Phase B-4 Step 5: Authorization statistics
        totalAuthorizations,
        pendingAuthorizations,
        approvedAuthorizations,
        rejectedAuthorizations,
        // Legacy fields (backward compatibility)
        totalSalesAmount: Math.round(totalSalesAmount),
        avgOrderAmount: Math.round(avgOrderAmount),
        totalCommissionAmount: Math.round(totalCommissionAmount),
        orderCount: totalOrders,
        salesAmount: Math.round(totalSalesAmount),
        sellerAmount: Math.round(totalSalesAmount)
      };

      // R-8-7: Cache the result (60 seconds TTL)
      const config = getCacheConfig();
      await cacheService.set(cacheKey, summary, config.ttl.short);
      logger.debug(`[SellerDashboardService] Cached summary for: ${sellerId}`);

      return summary;
    } catch (error) {
      logger.error('[SellerDashboardService] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get orders for a seller with pagination
   * R-8-3-2: Refactored to use OrderItem entity with database-level pagination
   */
  async getOrdersForSeller(
    sellerId: string,
    filters: {
      dateRange?: DateRangeFilter;
      status?: OrderStatus[];
      pagination: PaginationParams;
    }
  ): Promise<{ orders: SellerOrderSummary[]; total: number }> {
    try {
      const { dateRange, status, pagination } = filters;

      // Build base query to find orders with seller's items
      const baseQuery = this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .where('item.sellerId = :sellerId', { sellerId })
        .andWhere('order.paymentStatus IN (:...statuses)', {
          statuses: [PaymentStatus.COMPLETED]
        });

      // Apply status filter
      if (status && status.length > 0) {
        baseQuery.andWhere('order.status IN (:...orderStatuses)', {
          orderStatuses: status
        });
      }

      // Apply date range filter
      if (dateRange?.from || dateRange?.to) {
        baseQuery.andWhere('order.orderDate BETWEEN :startDate AND :endDate', {
          startDate: dateRange.from || new Date('2020-01-01'),
          endDate: dateRange.to || new Date()
        });
      }

      // R-8-3-2: Get aggregated data per order using GROUP BY
      // This is more efficient than fetching all orders and filtering in memory
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      // Get aggregated order data with seller-specific metrics
      const aggregatedQuery = this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('order.id', 'orderId')
        .addSelect('order.orderNumber', 'orderNumber')
        .addSelect('order.orderDate', 'orderDate')
        .addSelect('order.buyerName', 'buyerName')
        .addSelect('order.status', 'status')
        .addSelect('order.paymentStatus', 'paymentStatus')
        .addSelect('SUM(item.totalPrice)', 'sellerAmount')
        .addSelect('SUM(item.commissionAmount)', 'commissionAmount')
        .addSelect('SUM(item.quantity)', 'itemCount')
        .where('item.sellerId = :sellerId', { sellerId })
        .andWhere('order.paymentStatus IN (:...statuses)', {
          statuses: [PaymentStatus.COMPLETED]
        });

      // Apply same filters as base query
      if (status && status.length > 0) {
        aggregatedQuery.andWhere('order.status IN (:...orderStatuses)', {
          orderStatuses: status
        });
      }

      if (dateRange?.from || dateRange?.to) {
        aggregatedQuery.andWhere('order.orderDate BETWEEN :startDate AND :endDate', {
          startDate: dateRange.from || new Date('2020-01-01'),
          endDate: dateRange.to || new Date()
        });
      }

      // Group by order and apply pagination at database level
      aggregatedQuery
        .groupBy('order.id')
        .addGroupBy('order.orderNumber')
        .addGroupBy('order.orderDate')
        .addGroupBy('order.buyerName')
        .addGroupBy('order.status')
        .addGroupBy('order.paymentStatus')
        .orderBy('order.orderDate', 'DESC')
        .skip(skip)
        .take(limit);

      const results = await aggregatedQuery.getRawMany();

      // Get total count of distinct orders (for pagination)
      const totalQuery = this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('COUNT(DISTINCT order.id)', 'total')
        .where('item.sellerId = :sellerId', { sellerId })
        .andWhere('order.paymentStatus IN (:...statuses)', {
          statuses: [PaymentStatus.COMPLETED]
        });

      if (status && status.length > 0) {
        totalQuery.andWhere('order.status IN (:...orderStatuses)', {
          orderStatuses: status
        });
      }

      if (dateRange?.from || dateRange?.to) {
        totalQuery.andWhere('order.orderDate BETWEEN :startDate AND :endDate', {
          startDate: dateRange.from || new Date('2020-01-01'),
          endDate: dateRange.to || new Date()
        });
      }

      const totalResult = await totalQuery.getRawOne();
      const total = parseInt(totalResult?.total || '0', 10);

      // For totalAmount, we need to get the full order summary
      // We'll fetch the orders to get their calculated totals
      const orderIds = results.map(r => r.orderId);
      const orders = orderIds.length > 0
        ? await this.orderRepository.findByIds(orderIds)
        : [];

      const orderMap = new Map(orders.map(o => [o.id, o]));

      // Map results to SellerOrderSummary DTOs
      const sellerOrders: SellerOrderSummary[] = results.map(result => ({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        orderDate: new Date(result.orderDate),
        buyerName: result.buyerName,
        status: result.status as OrderStatus,
        paymentStatus: result.paymentStatus as PaymentStatus,
        totalAmount: orderMap.get(result.orderId)?.calculateTotal() || 0,
        sellerAmount: Math.round(parseFloat(result.sellerAmount || '0')),
        commissionAmount: Math.round(parseFloat(result.commissionAmount || '0')),
        itemCount: parseInt(result.itemCount || '0', 10)
      }));

      return {
        orders: sellerOrders,
        total
      };
    } catch (error) {
      logger.error('[SellerDashboardService] Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get commission details for a seller
   * R-8: Refactored to use SettlementReadService for centralized reading
   */
  async getCommissionDetailsForSeller(
    sellerId: string,
    dateRange?: DateRangeFilter
  ): Promise<{
    totalCommission: number;
    commissionByOrder: Array<{
      orderNumber: string;
      orderDate: Date;
      salesAmount: number;
      commissionAmount: number;
      commissionRate: number;
      status: OrderStatus;
    }>;
  }> {
    try {
      // R-8: Use SettlementReadService for centralized commission reading
      const summary = await this.settlementReadService.getSellerCommissionSummary(
        sellerId,
        dateRange
      );

      return {
        totalCommission: summary.totalCommission,
        commissionByOrder: summary.commissionByOrder
      };
    } catch (error) {
      logger.error('[SellerDashboardService] Failed to get commission details:', error);
      throw error;
    }
  }
}
