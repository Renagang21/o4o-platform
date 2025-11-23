/**
 * Customer Order Service
 * R-6-9: Customer order viewing functionality
 *
 * Provides read-only access to orders for customers
 * Security: All queries filtered by buyerId
 */

import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Order, OrderStatus } from '../entities/Order.js';
import type {
  CustomerOrderListItemDto,
  CustomerOrderDetailDto,
  CustomerOrderListQuery,
} from '../dto/customer-orders.dto.js';
import logger from '../utils/logger.js';

export class CustomerOrderService {
  private orderRepository: Repository<Order>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
  }

  /**
   * Get paginated order list for a customer
   * Security: Enforces buyerId filtering
   */
  async getOrdersForCustomer(
    userId: string,
    query: CustomerOrderListQuery
  ): Promise<{
    orders: CustomerOrderListItemDto[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    try {
      // Parse query parameters with defaults
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const status = query.status && query.status !== 'all' ? query.status : undefined;
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';

      // Build where clause
      const where: any = {
        buyerId: userId, // SECURITY: Always filter by authenticated user
      };

      // Status filter
      if (status) {
        where.status = status;
      }

      // Date range filter
      if (query.startDate && query.endDate) {
        where.orderDate = Between(new Date(query.startDate), new Date(query.endDate));
      } else if (query.startDate) {
        where.orderDate = MoreThanOrEqual(new Date(query.startDate));
      } else if (query.endDate) {
        where.orderDate = LessThanOrEqual(new Date(query.endDate));
      }

      // Execute query with pagination
      const [orders, totalItems] = await this.orderRepository.findAndCount({
        where,
        order: {
          [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Transform to DTOs
      const orderDtos: CustomerOrderListItemDto[] = orders.map((order) =>
        this.transformToListItemDto(order)
      );

      // Calculate pagination
      const totalPages = Math.ceil(totalItems / limit);

      return {
        orders: orderDtos,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to get orders for customer:', {
        userId,
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get detailed order information for a customer
   * Security: Enforces buyerId filtering
   */
  async getOrderDetailForCustomer(
    userId: string,
    orderId: string
  ): Promise<CustomerOrderDetailDto | null> {
    try {
      // Find order with relations
      const order = await this.orderRepository.findOne({
        where: {
          id: orderId,
          buyerId: userId, // SECURITY: Always filter by authenticated user
        },
        relations: ['buyer', 'events'],
      });

      if (!order) {
        return null;
      }

      // Transform to DTO
      return this.transformToDetailDto(order);
    } catch (error) {
      logger.error('Failed to get order detail for customer:', {
        userId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Transform Order entity to CustomerOrderListItemDto
   */
  private transformToListItemDto(order: Order): CustomerOrderListItemDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.orderDate.toISOString(),
      status: order.status as any,
      totalAmount: order.summary.total,
      currency: order.currency,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus as any,
      isCancellable: order.canBeCancelled(),
      isReturnable: order.canBeRefunded(),
    };
  }

  /**
   * Transform Order entity to CustomerOrderDetailDto
   */
  private transformToDetailDto(order: Order): CustomerOrderDetailDto {
    // Build status timeline from order timestamps
    const timeline: Array<{ status: string; timestamp: string; label: string }> = [];

    if (order.orderDate) {
      timeline.push({
        status: 'pending',
        timestamp: order.orderDate.toISOString(),
        label: '주문 접수',
      });
    }

    if (order.paymentDate || order.paidAt) {
      timeline.push({
        status: 'paid',
        timestamp: (order.paidAt || order.paymentDate)!.toISOString(),
        label: '결제 완료',
      });
    }

    if (order.confirmedDate) {
      timeline.push({
        status: 'confirmed',
        timestamp: order.confirmedDate.toISOString(),
        label: '주문 확인',
      });
    }

    if (order.shippingDate) {
      timeline.push({
        status: 'shipped',
        timestamp: order.shippingDate.toISOString(),
        label: '배송 시작',
      });
    }

    if (order.deliveryDate) {
      timeline.push({
        status: 'delivered',
        timestamp: order.deliveryDate.toISOString(),
        label: '배송 완료',
      });
    }

    if (order.cancelledDate) {
      timeline.push({
        status: 'cancelled',
        timestamp: order.cancelledDate.toISOString(),
        label: '주문 취소',
      });
    }

    if (order.refundDate) {
      timeline.push({
        status: 'refunded',
        timestamp: order.refundDate.toISOString(),
        label: '환불 완료',
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.orderDate.toISOString(),
      status: order.status as any,

      buyer: {
        id: order.buyerId,
        name: order.buyerName,
        email: order.buyerEmail,
      },

      shippingAddress: {
        recipientName: order.shippingAddress.recipientName,
        phone: order.shippingAddress.phone,
        email: order.shippingAddress.email,
        zipCode: order.shippingAddress.zipCode,
        address: order.shippingAddress.address,
        detailAddress: order.shippingAddress.detailAddress,
        city: order.shippingAddress.city,
        country: order.shippingAddress.country,
        deliveryRequest: order.shippingAddress.deliveryRequest,
      },

      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        productImage: item.productImage,
        productBrand: item.productBrand,
        variationName: item.variationName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
      })),

      summary: {
        subtotal: order.summary.subtotal,
        discount: order.summary.discount,
        shipping: order.summary.shipping,
        tax: order.summary.tax,
        total: order.summary.total,
      },

      currency: order.currency,

      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus as any,
      paymentProvider: order.paymentProvider,
      paidAt: order.paidAt?.toISOString(),

      shippingMethod: order.shippingMethod || undefined,
      shippingCarrier: order.shippingCarrier || undefined,
      trackingNumber: order.trackingNumber || undefined,
      trackingUrl: order.trackingUrl || undefined,

      statusTimeline: timeline,

      customerNotes: order.customerNotes || undefined,

      cancellationReason: order.cancellationReason || undefined,
      returnReason: order.returnReason || undefined,
      refundAmount: order.refundAmount ? Number(order.refundAmount) : undefined,
      refundDate: order.refundDate?.toISOString(),

      isCancellable: order.canBeCancelled(),
      isReturnable: order.canBeRefunded(),
    };
  }
}

// Export singleton instance
export const customerOrderService = new CustomerOrderService();
