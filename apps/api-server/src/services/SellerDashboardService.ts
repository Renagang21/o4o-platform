/**
 * SellerDashboardService
 * Phase PD-1: Partner Dashboard v1 - Seller metrics and commission tracking
 * R-6-2: Updated with standard DTO and range service
 * R-8: Refactored to use SettlementReadService for commission reading
 *
 * Provides seller-specific statistics, orders, and commission calculations
 */

import AppDataSource from '../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../entities/Order.js';
import { Between, In } from 'typeorm';
import logger from '../utils/logger.js';
import {
  SellerDashboardSummaryDto,
  DashboardMetaDto,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';
import { SettlementReadService } from './SettlementReadService.js';

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

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export class SellerDashboardService {
  private orderRepository = AppDataSource.getRepository(Order);
  private settlementReadService = new SettlementReadService();

  /**
   * Get dashboard summary for a seller
   * Aggregates orders where at least one item belongs to the seller
   * R-6-2: Updated to use standard DTO and support both old and new query formats
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

      // Filter orders that contain seller's items and calculate metrics
      let totalOrders = 0;
      let totalSalesAmount = 0;
      let totalItems = 0;
      let totalCommissionAmount = 0;

      for (const order of orders) {
        const sellerItems = order.items.filter(
          (item: OrderItem) => item.sellerId === sellerId
        );

        if (sellerItems.length > 0) {
          totalOrders++;

          // Calculate seller's portion of this order
          const sellerOrderAmount = sellerItems.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          );
          totalSalesAmount += sellerOrderAmount;

          // Count items
          const sellerItemCount = sellerItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          totalItems += sellerItemCount;

          // Phase PD-2: Use actual commission amount from order items
          // Commission is calculated and stored at order creation time
          const orderCommissionAmount = sellerItems.reduce(
            (sum, item) => sum + (item.commissionAmount || 0),
            0
          );
          totalCommissionAmount += orderCommissionAmount;
        }
      }

      const avgOrderAmount = totalOrders > 0 ? totalSalesAmount / totalOrders : 0;

      // R-6-2: Return standard DTO with legacy fields for backward compatibility
      return {
        totalOrders,
        totalRevenue: Math.round(totalSalesAmount), // Standard field
        averageOrderValue: Math.round(avgOrderAmount), // Standard field
        totalItems,
        totalCommission: Math.round(totalCommissionAmount),
        // Legacy fields (backward compatibility)
        totalSalesAmount: Math.round(totalSalesAmount),
        avgOrderAmount: Math.round(avgOrderAmount),
        totalCommissionAmount: Math.round(totalCommissionAmount),
        orderCount: totalOrders,
        salesAmount: Math.round(totalSalesAmount),
        sellerAmount: Math.round(totalSalesAmount)
      };
    } catch (error) {
      logger.error('[SellerDashboardService] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get orders for a seller with pagination
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

      // Filter orders with seller's items
      const sellerOrders: SellerOrderSummary[] = [];

      for (const order of allOrders) {
        const sellerItems = order.items.filter(
          (item: OrderItem) => item.sellerId === sellerId
        );

        if (sellerItems.length > 0) {
          const sellerAmount = sellerItems.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          );

          // Phase PD-2: Use actual commission amount from order items
          const commissionAmount = sellerItems.reduce(
            (sum, item) => sum + (item.commissionAmount || 0),
            0
          );

          sellerOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            buyerName: order.buyerName,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.calculateTotal(),
            sellerAmount: Math.round(sellerAmount),
            commissionAmount: Math.round(commissionAmount),
            itemCount: sellerItems.reduce((sum, item) => sum + item.quantity, 0)
          });
        }
      }

      // Apply pagination
      const total = sellerOrders.length;
      const { page, limit } = pagination;
      const start = (page - 1) * limit;
      const paginatedOrders = sellerOrders.slice(start, start + limit);

      return {
        orders: paginatedOrders,
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
