/**
 * SellerDashboardService
 * Phase PD-1: Partner Dashboard v1 - Seller metrics and commission tracking
 *
 * Provides seller-specific statistics, orders, and commission calculations
 */

import AppDataSource from '../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '../entities/Order.js';
import { Between, In } from 'typeorm';
import logger from '../utils/logger.js';

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

  /**
   * Get dashboard summary for a seller
   * Aggregates orders where at least one item belongs to the seller
   */
  async getSummaryForSeller(
    sellerId: string,
    dateRange?: DateRangeFilter
  ): Promise<SellerDashboardSummary> {
    try {
      // Build date filter
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED])
      };

      if (dateRange?.from || dateRange?.to) {
        where.orderDate = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

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

      return {
        totalOrders,
        totalSalesAmount: Math.round(totalSalesAmount),
        totalItems,
        totalCommissionAmount: Math.round(totalCommissionAmount),
        avgOrderAmount: Math.round(avgOrderAmount)
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
   * Returns commission breakdown by order
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

      const commissionByOrder = [];
      let totalCommission = 0;

      for (const order of orders) {
        const sellerItems = order.items.filter(
          (item: OrderItem) => item.sellerId === sellerId
        );

        if (sellerItems.length > 0) {
          const salesAmount = sellerItems.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          );

          // Phase PD-2: Use actual commission amount from order items
          const commissionAmount = sellerItems.reduce(
            (sum, item) => sum + (item.commissionAmount || 0),
            0
          );
          totalCommission += commissionAmount;

          // Calculate weighted average commission rate for display
          // (total commission / total sales amount)
          const effectiveCommissionRate = salesAmount > 0
            ? commissionAmount / salesAmount
            : 0;

          commissionByOrder.push({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            salesAmount: Math.round(salesAmount),
            commissionAmount: Math.round(commissionAmount),
            commissionRate: effectiveCommissionRate,
            status: order.status
          });
        }
      }

      return {
        totalCommission: Math.round(totalCommission),
        commissionByOrder
      };
    } catch (error) {
      logger.error('[SellerDashboardService] Failed to get commission details:', error);
      throw error;
    }
  }
}
