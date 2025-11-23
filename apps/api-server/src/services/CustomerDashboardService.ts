/**
 * CustomerDashboardService
 * R-6-4: Customer Dashboard v1 - Customer metrics and order tracking
 *
 * Provides customer-specific statistics and recent orders
 */

import AppDataSource from '../database/data-source.js';
import { Order, OrderStatus, PaymentStatus } from '../entities/Order.js';
import { Between, In } from 'typeorm';
import logger from '../utils/logger.js';
import {
  CustomerDashboardSummaryDto,
  CustomerRecentOrderDto,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';
import { WishlistService } from './WishlistService.js';

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export class CustomerDashboardService {
  private orderRepository = AppDataSource.getRepository(Order);
  private wishlistService = new WishlistService();

  /**
   * Get dashboard summary for a customer
   * Aggregates orders placed by the customer
   * R-6-4: Uses standard DTO and supports date range filtering
   */
  async getSummaryForCustomer(
    userId: string,
    dateRange?: DateRangeFilter | ParsedDateRange
  ): Promise<CustomerDashboardSummaryDto> {
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
        // Default to 90 days
        parsedRange = dashboardRangeService.parseDateRange({ range: '90d' });
      }

      // Build date filter
      const where: any = {
        buyerId: userId,
        orderDate: Between(parsedRange.startDate, parsedRange.endDate)
      };

      // Get all orders for this customer
      const orders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' }
      });

      // Calculate metrics
      let totalOrders = 0;
      let totalSpent = 0;
      let activeOrders = 0;
      let rewardPointOrders = 0; // R-6-5: Orders that earn reward points

      for (const order of orders) {
        totalOrders++;

        // Only count completed/paid orders for total spent
        if (order.paymentStatus === PaymentStatus.COMPLETED) {
          totalSpent += order.calculateTotal();
        }

        // Active orders: confirmed, processing, shipped (not delivered or cancelled)
        if (
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PROCESSING ||
          order.status === OrderStatus.SHIPPED
        ) {
          activeOrders++;
        }

        // R-6-5: Count orders that earn reward points (confirmed, processing, delivered)
        if (
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PROCESSING ||
          order.status === OrderStatus.DELIVERED
        ) {
          rewardPointOrders++;
        }
      }

      // R-6-5: Calculate reward points (10 points per qualifying order)
      const rewardPoints = rewardPointOrders * 10;

      // R-6-5: Get real wishlist count
      const wishlistItems = await this.wishlistService.countWishlistItems(userId);

      return {
        totalOrders,
        totalRevenue: totalSpent,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        totalSpent,
        activeOrders,
        rewardPoints,
        wishlistItems,
      };
    } catch (error) {
      logger.error('[CustomerDashboardService] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get recent orders for a customer
   * R-6-4: Returns recent orders with limited data
   */
  async getRecentOrdersForCustomer(
    userId: string,
    limit: number = 5
  ): Promise<CustomerRecentOrderDto[]> {
    try {
      // Limit max to 10
      const safeLimit = Math.min(limit, 10);

      const orders = await this.orderRepository.find({
        where: { buyerId: userId },
        order: { orderDate: 'DESC' },
        take: safeLimit
      });

      return orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.orderDate.toISOString(),
        status: this.mapOrderStatus(order.status),
        totalAmount: order.calculateTotal(),
        currency: 'KRW',
        itemCount: order.items.length,
        estimatedDelivery: order.status === OrderStatus.SHIPPED
          ? new Date(order.orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() // +3 days
          : undefined
      }));
    } catch (error) {
      logger.error('[CustomerDashboardService] Failed to get recent orders:', error);
      throw error;
    }
  }

  /**
   * Map internal OrderStatus to customer-facing status
   */
  private mapOrderStatus(
    status: OrderStatus
  ): 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' {
    switch (status) {
      case OrderStatus.PENDING:
        return 'pending';
      case OrderStatus.CONFIRMED:
        return 'paid'; // Confirmed = paid in customer view
      case OrderStatus.PROCESSING:
        return 'processing';
      case OrderStatus.SHIPPED:
        return 'shipped';
      case OrderStatus.DELIVERED:
        return 'delivered';
      case OrderStatus.CANCELLED:
      case OrderStatus.RETURNED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}
