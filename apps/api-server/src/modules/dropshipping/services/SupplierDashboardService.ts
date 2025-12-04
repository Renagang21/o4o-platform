/**
 * SupplierDashboardService
 * R-8: Dropshipping Refactor Phase 1 - Supplier metrics and revenue tracking
 * R-8 Task 3: Refactored to use SettlementReadService for revenue reading
 *
 * Provides supplier-specific statistics, orders, and revenue calculations
 * Mirrors SellerDashboardService structure for consistency
 */

import AppDataSource from '../../../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../../commerce/entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../commerce/entities/OrderItem.js';
import { Between, In } from 'typeorm';
import logger from '../../../utils/logger.js';
import {
  SupplierDashboardSummaryDto,
  DashboardMetaDto,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';
import { SettlementReadService } from '../../commerce/services/SettlementReadService.js';

/**
 * @deprecated Use SupplierDashboardSummaryDto from dashboard.dto.ts
 * Kept for backward compatibility
 */
export interface SupplierDashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  avgOrderAmount: number;
}

export interface SupplierOrderSummary {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  buyerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  supplierAmount: number; // Amount for supplier's items only
  itemCount: number;
}

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export class SupplierDashboardService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItemEntity);
  private settlementReadService = new SettlementReadService();

  /**
   * Get dashboard summary for a supplier
   * R-8-3-2: Refactored to use OrderItem entity instead of JSONB filtering
   * Aggregates orders where at least one item belongs to the supplier
   * R-8: Implements missing supplier order functionality
   */
  async getSummaryForSupplier(
    supplierId: string,
    dateRange?: DateRangeFilter | ParsedDateRange
  ): Promise<SupplierDashboardSummaryDto> {
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

      // R-8-3-2: Use OrderItem-based query instead of JSONB filtering
      // This significantly improves performance by leveraging database indexes
      const result = await this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('COUNT(DISTINCT order.id)', 'totalOrders')
        .addSelect('SUM((item.basePriceSnapshot ?? item.unitPrice) * item.quantity)', 'totalRevenue')
        .addSelect('SUM(item.quantity)', 'totalItems')
        .where('item.supplierId = :supplierId', { supplierId })
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
      const totalRevenue = parseFloat(result?.totalRevenue || '0');
      const totalItems = parseInt(result?.totalItems || '0', 10);
      const avgOrderAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // R-8: Return standard DTO with legacy fields for backward compatibility
      return {
        totalOrders,
        totalRevenue: Math.round(totalRevenue), // Standard field
        averageOrderValue: Math.round(avgOrderAmount), // Standard field
        totalItems,
        // Additional supplier-specific fields
        totalProducts: 0, // TODO: Calculate from Product table
        approvedProducts: 0,
        pendingProducts: 0,
        rejectedProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalProfit: 0, // TODO: Calculate if margin data available
        // Legacy fields (backward compatibility)
        monthlyOrders: totalOrders,
        avgOrderValue: Math.round(avgOrderAmount)
      };
    } catch (error) {
      logger.error('[SupplierDashboardService] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get orders for a supplier with pagination
   * R-8-3-2: Refactored to use OrderItem entity with database-level pagination
   */
  async getOrdersForSupplier(
    supplierId: string,
    filters: {
      dateRange?: DateRangeFilter;
      status?: OrderStatus[];
      pagination: PaginationParams;
    }
  ): Promise<{ orders: SupplierOrderSummary[]; total: number }> {
    try {
      const { dateRange, status, pagination } = filters;

      // R-8-3-2: Get aggregated data per order using GROUP BY
      // This is more efficient than fetching all orders and filtering in memory
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      // Get aggregated order data with supplier-specific metrics
      const aggregatedQuery = this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('order.id', 'orderId')
        .addSelect('order.orderNumber', 'orderNumber')
        .addSelect('order.orderDate', 'orderDate')
        .addSelect('order.buyerName', 'buyerName')
        .addSelect('order.status', 'status')
        .addSelect('order.paymentStatus', 'paymentStatus')
        .addSelect('SUM((item.basePriceSnapshot ?? item.unitPrice) * item.quantity)', 'supplierAmount')
        .addSelect('SUM(item.quantity)', 'itemCount')
        .where('item.supplierId = :supplierId', { supplierId })
        .andWhere('order.paymentStatus IN (:...statuses)', {
          statuses: [PaymentStatus.COMPLETED]
        });

      // Apply status filter
      if (status && status.length > 0) {
        aggregatedQuery.andWhere('order.status IN (:...orderStatuses)', {
          orderStatuses: status
        });
      }

      // Apply date range filter
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
        .where('item.supplierId = :supplierId', { supplierId })
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

      // Map results to SupplierOrderSummary DTOs
      const supplierOrders: SupplierOrderSummary[] = results.map(result => ({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        orderDate: new Date(result.orderDate),
        buyerName: result.buyerName,
        status: result.status as OrderStatus,
        paymentStatus: result.paymentStatus as PaymentStatus,
        totalAmount: orderMap.get(result.orderId)?.calculateTotal() || 0,
        supplierAmount: Math.round(parseFloat(result.supplierAmount || '0')),
        itemCount: parseInt(result.itemCount || '0', 10)
      }));

      return {
        orders: supplierOrders,
        total
      };
    } catch (error) {
      logger.error('[SupplierDashboardService] Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get revenue details for a supplier
   * R-8: Refactored to use SettlementReadService for centralized reading
   */
  async getRevenueDetailsForSupplier(
    supplierId: string,
    dateRange?: DateRangeFilter
  ): Promise<{
    totalRevenue: number;
    revenueByOrder: Array<{
      orderNumber: string;
      orderDate: Date;
      revenueAmount: number;
      itemCount: number;
      status: OrderStatus;
    }>;
  }> {
    try {
      // R-8: Use SettlementReadService for centralized revenue reading
      const summary = await this.settlementReadService.getSupplierCommissionSummary(
        supplierId,
        dateRange
      );

      return {
        totalRevenue: summary.totalRevenue,
        revenueByOrder: summary.revenueByOrder
      };
    } catch (error) {
      logger.error('[SupplierDashboardService] Failed to get revenue details:', error);
      throw error;
    }
  }
}
