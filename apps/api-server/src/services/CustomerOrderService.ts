/**
 * Customer Order Service
 * R-6-9: Customer order viewing functionality
 *
 * Provides read-only access to orders for customers
 * Security: All queries filtered by buyerId
 */

import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Order, OrderStatus, PaymentStatus } from '../entities/Order.js';
import { OrderEvent, OrderEventType } from '../entities/OrderEvent.js';
import type {
  CustomerOrderListItemDto,
  CustomerOrderDetailDto,
  CustomerOrderListQuery,
  CustomerOrderActionResponseDto,
  CustomerOrderActionErrorCode,
} from '../dto/customer-orders.dto.js';
import logger from '../utils/logger.js';

// Custom error for order action failures
class OrderActionError extends Error {
  constructor(
    public code: CustomerOrderActionErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OrderActionError';
  }
}

export class CustomerOrderService {
  private orderRepository: Repository<Order>;
  private orderEventRepository: Repository<OrderEvent>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.orderEventRepository = AppDataSource.getRepository(OrderEvent);
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
   * R-7-1: Request order cancellation
   * Security: Enforces buyerId filtering
   */
  async requestCancelOrderForCustomer(
    orderId: string,
    customerId: string
  ): Promise<CustomerOrderActionResponseDto> {
    try {
      // Load order with buyerId check
      const order = await this.loadOrderForCustomerOrThrow(orderId, customerId);

      // Check if already cancelled
      if (order.status === OrderStatus.CANCELLED) {
        throw new OrderActionError(
          'ALREADY_CANCELLED',
          '이미 취소된 주문입니다.'
        );
      }

      // Check if already returned
      if (order.status === OrderStatus.RETURNED) {
        throw new OrderActionError(
          'ALREADY_RETURNED',
          '이미 반품 처리된 주문입니다.'
        );
      }

      // Check if order can be cancelled (business rules)
      if (!order.canBeCancelled()) {
        throw new OrderActionError(
          'INVALID_STATUS',
          '이미 처리 중이거나 배송된 주문은 취소할 수 없습니다.'
        );
      }

      // Check payment status - Phase 1: Only allow cancellation for pending payments
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        throw new OrderActionError(
          'PAYMENT_COMPLETED_CANNOT_CANCEL',
          '결제가 완료된 주문은 온라인에서 취소할 수 없습니다. 고객센터로 문의해주세요.'
        );
      }

      // Save previous status before updating
      const prevStatus = order.status;

      // Update order status
      order.status = OrderStatus.CANCELLED;
      order.cancelledDate = new Date();

      // Create order event
      const event = this.orderEventRepository.create({
        order,
        type: OrderEventType.CANCELLATION,
        message: '고객이 주문을 취소했습니다.',
        actorId: customerId,
        prevStatus,
        newStatus: OrderStatus.CANCELLED,
        source: 'web',
      });

      // Save both in transaction
      await AppDataSource.transaction(async (manager) => {
        await manager.save(Order, order);
        await manager.save(OrderEvent, event);
      });

      logger.info('Order cancelled by customer:', {
        orderId,
        customerId,
        orderNumber: order.orderNumber,
      });

      return {
        orderId: order.id,
        action: 'cancel',
        status: 'cancelled',
        message: '주문이 취소되었습니다.',
      };
    } catch (error) {
      if (error instanceof OrderActionError) {
        throw error;
      }

      logger.error('Failed to cancel order for customer:', {
        orderId,
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new OrderActionError(
        'SERVER_ERROR',
        '주문 취소 처리 중 오류가 발생했습니다.',
        error
      );
    }
  }

  /**
   * R-7-1: Request order return
   * Security: Enforces buyerId filtering
   */
  async requestReturnOrderForCustomer(
    orderId: string,
    customerId: string
  ): Promise<CustomerOrderActionResponseDto> {
    try {
      // Load order with buyerId check
      const order = await this.loadOrderForCustomerOrThrow(orderId, customerId);

      // Check if already cancelled
      if (order.status === OrderStatus.CANCELLED) {
        throw new OrderActionError(
          'ALREADY_CANCELLED',
          '이미 취소된 주문입니다.'
        );
      }

      // Check if already returned
      if (order.status === OrderStatus.RETURNED) {
        throw new OrderActionError(
          'ALREADY_RETURNED',
          '이미 반품 처리된 주문입니다.'
        );
      }

      // Check if order can be returned (only DELIVERED status)
      if (order.status !== OrderStatus.DELIVERED) {
        throw new OrderActionError(
          'INVALID_STATUS',
          '배송이 완료된 주문만 반품을 요청할 수 있습니다.'
        );
      }

      // Update order status to RETURNED (Phase 1: Simple status change)
      order.status = OrderStatus.RETURNED;

      // Create order event (using STATUS_CHANGE for returns in Phase 1)
      const event = this.orderEventRepository.create({
        order,
        type: OrderEventType.STATUS_CHANGE,
        message: '고객이 반품을 요청했습니다.',
        actorId: customerId,
        prevStatus: OrderStatus.DELIVERED,
        newStatus: OrderStatus.RETURNED,
        source: 'web',
      });

      // Save both in transaction
      await AppDataSource.transaction(async (manager) => {
        await manager.save(Order, order);
        await manager.save(OrderEvent, event);
      });

      logger.info('Return requested by customer:', {
        orderId,
        customerId,
        orderNumber: order.orderNumber,
      });

      return {
        orderId: order.id,
        action: 'return',
        status: 'return_requested',
        message: '반품 요청이 접수되었습니다.',
      };
    } catch (error) {
      if (error instanceof OrderActionError) {
        throw error;
      }

      logger.error('Failed to request return for customer:', {
        orderId,
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new OrderActionError(
        'SERVER_ERROR',
        '반품 요청 처리 중 오류가 발생했습니다.',
        error
      );
    }
  }

  /**
   * R-7-1: Helper to load order for customer or throw error
   * Security: Always filters by buyerId
   */
  private async loadOrderForCustomerOrThrow(
    orderId: string,
    customerId: string
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        buyerId: customerId, // SECURITY: Always filter by customer ID
      },
    });

    if (!order) {
      throw new OrderActionError(
        'ORDER_NOT_FOUND',
        '주문을 찾을 수 없거나 접근 권한이 없습니다.'
      );
    }

    return order;
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

// Export singleton instance and error class
export const customerOrderService = new CustomerOrderService();
export { OrderActionError };
