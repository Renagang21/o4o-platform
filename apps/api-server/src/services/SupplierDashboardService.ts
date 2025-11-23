/**
 * SupplierDashboardService
 * R-8: Dropshipping Refactor Phase 1 - Supplier metrics and revenue tracking
 *
 * Provides supplier-specific statistics, orders, and revenue calculations
 * Mirrors SellerDashboardService structure for consistency
 */

import AppDataSource from '../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../entities/Order.js';
import { Between, In } from 'typeorm';
import logger from '../utils/logger.js';
import {
  SupplierDashboardSummaryDto,
  DashboardMetaDto,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';

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

  /**
   * Get dashboard summary for a supplier
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

      // Build date filter
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED]),
        orderDate: Between(parsedRange.startDate, parsedRange.endDate)
      };

      // Get all paid orders
      const orders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' }
      });

      // Filter orders that contain supplier's items and calculate metrics
      let totalOrders = 0;
      let totalRevenue = 0;
      let totalItems = 0;

      for (const order of orders) {
        const supplierItems = order.items.filter(
          (item: OrderItem) => item.supplierId === supplierId
        );

        if (supplierItems.length > 0) {
          totalOrders++;

          // Calculate supplier's portion of this order (base price)
          const supplierOrderAmount = supplierItems.reduce(
            (sum, item) => sum + (item.basePriceSnapshot || item.unitPrice) * item.quantity,
            0
          );
          totalRevenue += supplierOrderAmount;

          // Count items
          const supplierItemCount = supplierItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          totalItems += supplierItemCount;
        }
      }

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

      // Build where clause
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED])
      };

      if (status && status.length > 0) {
        where.status = In(status);
      }

      if (dateRange?.from || dateRange?.to) {
        where.orderDate = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      // Get all matching orders
      const allOrders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' }
      });

      // Filter orders with supplier's items
      const supplierOrders: SupplierOrderSummary[] = [];

      for (const order of allOrders) {
        const supplierItems = order.items.filter(
          (item: OrderItem) => item.supplierId === supplierId
        );

        if (supplierItems.length > 0) {
          // Calculate supplier's revenue (base price)
          const supplierAmount = supplierItems.reduce(
            (sum, item) => sum + (item.basePriceSnapshot || item.unitPrice) * item.quantity,
            0
          );

          supplierOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            buyerName: order.buyerName,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.calculateTotal(),
            supplierAmount: Math.round(supplierAmount),
            itemCount: supplierItems.reduce((sum, item) => sum + item.quantity, 0)
          });
        }
      }

      // Apply pagination
      const total = supplierOrders.length;
      const { page, limit } = pagination;
      const start = (page - 1) * limit;
      const paginatedOrders = supplierOrders.slice(start, start + limit);

      return {
        orders: paginatedOrders,
        total
      };
    } catch (error) {
      logger.error('[SupplierDashboardService] Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get revenue details for a supplier
   * Returns revenue breakdown by order
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
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED])
      };

      if (dateRange?.from || dateRange?.to) {
        where.orderDate = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      const orders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' }
      });

      const revenueByOrder = [];
      let totalRevenue = 0;

      for (const order of orders) {
        const supplierItems = order.items.filter(
          (item: OrderItem) => item.supplierId === supplierId
        );

        if (supplierItems.length > 0) {
          const revenueAmount = supplierItems.reduce(
            (sum, item) => sum + (item.basePriceSnapshot || item.unitPrice) * item.quantity,
            0
          );
          totalRevenue += revenueAmount;

          const itemCount = supplierItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );

          revenueByOrder.push({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            revenueAmount: Math.round(revenueAmount),
            itemCount,
            status: order.status
          });
        }
      }

      return {
        totalRevenue: Math.round(totalRevenue),
        revenueByOrder
      };
    } catch (error) {
      logger.error('[SupplierDashboardService] Failed to get revenue details:', error);
      throw error;
    }
  }
}
