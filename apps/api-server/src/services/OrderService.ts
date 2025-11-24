import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, OrderItem, Address, OrderSummary } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { OrderEvent, OrderEventType, OrderEventPayload } from '../entities/OrderEvent.js';
import { User } from '../entities/User.js';
import { Cart } from '../entities/Cart.js';
import { CartItem } from '../entities/CartItem.js';
import { Partner, PartnerStatus } from '../entities/Partner.js';
import { PartnerCommission, CommissionStatus } from '../entities/PartnerCommission.js';
import { Product } from '../entities/Product.js';
import { CommissionCalculator } from './CommissionCalculator.js';
import { notificationService } from './NotificationService.js';
import logger from '../utils/logger.js';
import { invalidateOrderRelatedCaches } from '../utils/cache-invalidation.js';

export interface CreateOrderRequest {
  items?: OrderItem[];
  billingAddress: Address;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
  customerNotes?: string;
  coupons?: string[];
  discountCodes?: string[];
  referralCode?: string; // Partner referral code
}

export interface CreateOrderFromCartRequest {
  cartId: string;
  billingAddress: Address;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
  customerNotes?: string;
  referralCode?: string; // Partner referral code
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  buyerType?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'orderDate' | 'totalAmount' | 'status' | 'buyerName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class OrderService {
  private orderRepository: Repository<Order>;
  private orderEventRepository: Repository<OrderEvent>;
  private userRepository: Repository<User>;
  private cartRepository: Repository<Cart>;
  private cartItemRepository: Repository<CartItem>;
  private partnerRepository: Repository<Partner>;
  private partnerCommissionRepository: Repository<PartnerCommission>;
  private productRepository: Repository<Product>;
  private commissionCalculator: CommissionCalculator;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.orderEventRepository = AppDataSource.getRepository(OrderEvent);
    this.userRepository = AppDataSource.getRepository(User);
    this.cartRepository = AppDataSource.getRepository(Cart);
    this.cartItemRepository = AppDataSource.getRepository(CartItem);
    this.partnerRepository = AppDataSource.getRepository(Partner);
    this.partnerCommissionRepository = AppDataSource.getRepository(PartnerCommission);
    this.productRepository = AppDataSource.getRepository(Product);
    this.commissionCalculator = new CommissionCalculator();
  }

  /**
   * Create order from items directly
   */
  async createOrder(buyerId: string, request: CreateOrderRequest): Promise<Order> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get buyer information
      const buyer = await this.userRepository.findOne({ where: { id: buyerId } });
      if (!buyer) {
        throw new Error('Buyer not found');
      }

      // Validate items if provided
      if (!request.items || request.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      // Calculate order summary
      const summary = this.calculateOrderSummary(request.items);

      // Phase PD-2: Calculate commission for each order item
      // Commission is calculated and stored at order creation time (immutable)
      for (const item of request.items) {
        if (!item.sellerId) {
          logger.warn(`[PD-2] Order item missing sellerId: ${item.productId}`, {
            productName: item.productName
          });
          continue;
        }

        const commissionResult = await this.commissionCalculator.calculateForItem(
          item.productId,
          item.sellerId,
          item.unitPrice,
          item.quantity
        );

        // Store commission info in order item (immutable)
        item.commissionType = commissionResult.type;
        item.commissionRate = commissionResult.rate;
        item.commissionAmount = commissionResult.amount;

        logger.debug(`[PD-2] Commission calculated for order item`, {
          productId: item.productId,
          productName: item.productName,
          sellerId: item.sellerId,
          type: commissionResult.type,
          rate: commissionResult.rate,
          amount: commissionResult.amount,
          source: commissionResult.source
        });
      }

      // Create order
      const order = new Order();
      order.orderNumber = this.generateOrderNumber();
      order.buyerId = buyerId;
      order.buyerType = buyer.role;
      order.buyerName = buyer.name;
      order.buyerEmail = buyer.email;
      // R-8-6: JSONB items field removed - items now stored only in OrderItem entities
      order.summary = summary;
      order.billingAddress = request.billingAddress;
      order.shippingAddress = request.shippingAddress;
      order.paymentMethod = request.paymentMethod;
      order.notes = request.notes;
      order.customerNotes = request.customerNotes;
      order.status = OrderStatus.PENDING;
      order.paymentStatus = PaymentStatus.PENDING;

      const savedOrder = await queryRunner.manager.save(Order, order);

      // R-8-6: Create OrderItem entities (single source of truth)
      await this.createOrderItemEntities(queryRunner.manager, savedOrder, request.items);
      logger.debug(`[R-8-6] Created ${request.items.length} OrderItem entities for order ${savedOrder.orderNumber}`);

      // Create ORDER_CREATED event
      await this.createOrderEvent(
        queryRunner.manager,
        savedOrder.id,
        OrderEventType.ORDER_CREATED,
        {
          message: `Order created by ${buyer.name}`,
          actorId: buyerId,
          actorName: buyer.name,
          actorRole: buyer.role,
          source: 'web'
        }
      );

      await queryRunner.commitTransaction();

      logger.info(`Order created: ${savedOrder.orderNumber}`, {
        orderId: savedOrder.id,
        buyerId,
        total: savedOrder.summary.total
      });

      // R-8-7: Invalidate caches for affected sellers and suppliers
      // Extract seller and supplier IDs from order items
      const sellerIds = new Set<string>();
      const supplierIds = new Set<string>();
      for (const item of request.items) {
        if (item.sellerId) sellerIds.add(item.sellerId);
        if (item.supplierId) supplierIds.add(item.supplierId);
      }
      invalidateOrderRelatedCaches(Array.from(sellerIds), Array.from(supplierIds)).catch((err) => {
        logger.error('[R-8-7] Failed to invalidate caches after order creation:', err);
      });

      // Phase PD-7: Send order.new notifications to sellers and suppliers
      this.sendOrderNotifications(savedOrder).catch((err) => {
        logger.error('Failed to send order notifications:', err);
      });

      return savedOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to create order:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create order from cart
   */
  async createOrderFromCart(buyerId: string, request: CreateOrderFromCartRequest): Promise<Order> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get cart with items
      const cart = await this.cartRepository.findOne({
        where: { userId: buyerId },
        relations: ['items', 'items.product']
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty or not found');
      }

      // Convert cart items to order items
      // R-8-5: Ensure presentation fields consistency (productImage, productBrand, variationName)
      const orderItems: OrderItem[] = cart.items.map((cartItem: CartItem) => ({
        id: cartItem.id,
        productId: cartItem.productId,
        productName: cartItem.product?.name || 'Unknown Product',
        productSku: cartItem.product?.sku || '',
        // R-8-5: Presentation fields (SSOT: Product entity + CartItem)
        productImage: cartItem.product?.getMainImage() || '',
        productBrand: cartItem.product?.brand,
        variationName: cartItem.variationName, // R-8-5: Added missing field
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice || 0,
        totalPrice: (cartItem.unitPrice || 0) * cartItem.quantity,
        supplierId: cartItem.product?.supplierId || '',
        supplierName: cartItem.product?.supplierName || '',
        // Phase 3: Add seller info (default to empty if not available from cart)
        sellerId: '',
        sellerName: '',
        attributes: cartItem.attributes
      }));

      // Create order using the items
      const order = await this.createOrder(buyerId, {
        items: orderItems,
        billingAddress: request.billingAddress,
        shippingAddress: request.shippingAddress,
        paymentMethod: request.paymentMethod,
        notes: request.notes,
        customerNotes: request.customerNotes
      });

      // Clear cart after successful order creation
      await queryRunner.manager.remove(CartItem, cart.items);
      await queryRunner.manager.remove(Cart, cart);

      await queryRunner.commitTransaction();

      logger.info(`Order created from cart: ${order.orderNumber}`, {
        orderId: order.id,
        buyerId,
        cartId: request.cartId
      });

      // Phase PD-7: Send order.new notifications to sellers and suppliers
      this.sendOrderNotifications(order).catch((err) => {
        logger.error('Failed to send order notifications:', err);
      });

      return order;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to create order from cart:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer');

    // Apply filters
    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.paymentStatus) {
      query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    }

    if (filters.buyerType) {
      query.andWhere('order.buyerType = :buyerType', { buyerType: filters.buyerType });
    }

    if (filters.dateFrom) {
      query.andWhere('order.orderDate >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('order.orderDate <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.minAmount) {
      query.andWhere('CAST(order.summary->>\'total\' AS DECIMAL) >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount) {
      query.andWhere('CAST(order.summary->>\'total\' AS DECIMAL) <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.search) {
      query.andWhere(
        '(order.orderNumber ILIKE :search OR order.buyerName ILIKE :search OR order.buyerEmail ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'orderDate';
    const sortOrder = filters.sortOrder || 'desc';
    
    switch (sortBy) {
      case 'totalAmount':
        query.orderBy('CAST(order.summary->>\'total\' AS DECIMAL)', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'status':
        query.orderBy('order.status', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'buyerName':
        query.orderBy('order.buyerName', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      default:
        query.orderBy('order.orderDate', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    query.skip(offset).take(limit);

    const [orders, total] = await query.getManyAndCount();

    return { orders, total };
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string, buyerId?: string): Promise<Order> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .where('order.id = :orderId', { orderId });

    if (buyerId) {
      query.andWhere('order.buyerId = :buyerId', { buyerId });
    }

    const order = await query.getOne();
    
    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Update order status (Phase 5: with event tracking)
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    options?: {
      actorId?: string;
      actorName?: string;
      actorRole?: string;
      message?: string;
      source?: string;
    }
  ): Promise<Order> {
    // R-8-6: Load order with itemsRelation for seller notifications
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['itemsRelation']
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if transition is allowed
    this.validateStatusTransition(order.status, status);

    const prevStatus = order.status;
    order.status = status;

    // Update timestamp based on status
    switch (status) {
      case OrderStatus.CONFIRMED:
        order.confirmedDate = new Date();
        break;
      case OrderStatus.SHIPPED:
        order.shippingDate = new Date();
        break;
      case OrderStatus.DELIVERED:
        order.deliveryDate = new Date();
        break;
      case OrderStatus.CANCELLED:
        order.cancelledDate = new Date();
        break;
    }

    const savedOrder = await this.orderRepository.save(order);

    // R-8-7: Invalidate caches for affected sellers and suppliers when status changes
    const sellerIds = new Set<string>();
    const supplierIds = new Set<string>();
    if (order.itemsRelation) {
      for (const item of order.itemsRelation) {
        if (item.sellerId) sellerIds.add(item.sellerId);
        if (item.supplierId) supplierIds.add(item.supplierId);
      }
      invalidateOrderRelatedCaches(Array.from(sellerIds), Array.from(supplierIds)).catch((err) => {
        logger.error('[R-8-7] Failed to invalidate caches after status update:', err);
      });
    }

    // Create status change event
    await this.createOrderEvent(
      this.orderEventRepository.manager,
      orderId,
      OrderEventType.STATUS_CHANGE,
      {
        prevStatus,
        newStatus: status,
        message: options?.message || `Status changed from ${prevStatus} to ${status}`,
        actorId: options?.actorId,
        actorName: options?.actorName,
        actorRole: options?.actorRole,
        source: options?.source || 'admin'
      }
    );

    logger.info(`Order status updated: ${order.orderNumber}`, {
      orderId,
      prevStatus,
      newStatus: status
    });

    // CI-2.1: Send notifications for order status change
    // Only send if status actually changed
    if (prevStatus !== status) {
      // Notify buyer
      await notificationService.createNotification({
        userId: order.buyerId,
        type: 'order.status_changed',
        title: '주문 상태가 변경되었습니다',
        message: `주문번호 ${order.orderNumber}가 '${this.getStatusDisplayName(status)}' 상태가 되었습니다.`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldStatus: prevStatus,
          newStatus: status,
        },
        channel: 'in_app',
      }).catch(err => logger.error('Failed to send order status notification to buyer:', err));

      // R-8-6: Notify sellers (from OrderItem entities)
      const sellerIds = new Set<string>();
      if (order.itemsRelation) {
        order.itemsRelation.forEach(item => {
          if (item.sellerId) {
            sellerIds.add(item.sellerId);
          }
        });
      }

      for (const sellerId of sellerIds) {
        await notificationService.createNotification({
          userId: sellerId,
          type: 'order.status_changed',
          title: '주문 상태가 변경되었습니다',
          message: `주문번호 ${order.orderNumber}가 '${this.getStatusDisplayName(status)}' 상태가 되었습니다.`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            oldStatus: prevStatus,
            newStatus: status,
          },
          channel: 'in_app',
        }).catch(err => logger.error(`Failed to send order status notification to seller ${sellerId}:`, err));
      }
    }

    return savedOrder;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    
    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === PaymentStatus.COMPLETED) {
      order.paymentDate = new Date();
      // Auto-confirm order when payment is completed
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CONFIRMED;
        order.confirmedDate = new Date();
      }
    }

    const savedOrder = await this.orderRepository.save(order);

    logger.info(`Payment status updated: ${order.orderNumber}`, {
      orderId,
      newPaymentStatus: paymentStatus
    });

    return savedOrder;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    // R-8-7: Load order with itemsRelation for cache invalidation
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['itemsRelation']
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.canBeCancelled()) {
      throw new Error('Order cannot be cancelled in current status');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledDate = new Date();
    order.cancellationReason = reason;

    const savedOrder = await this.orderRepository.save(order);

    // R-8-7: Invalidate caches for affected sellers and suppliers
    const sellerIds = new Set<string>();
    const supplierIds = new Set<string>();
    if (order.itemsRelation) {
      for (const item of order.itemsRelation) {
        if (item.sellerId) sellerIds.add(item.sellerId);
        if (item.supplierId) supplierIds.add(item.supplierId);
      }
      invalidateOrderRelatedCaches(Array.from(sellerIds), Array.from(supplierIds)).catch((err) => {
        logger.error('[R-8-7] Failed to invalidate caches after order cancellation:', err);
      });
    }

    logger.info(`Order cancelled: ${order.orderNumber}`, {
      orderId,
      reason
    });

    return savedOrder;
  }

  /**
   * Request refund
   */
  async requestRefund(orderId: string, reason: string, amount?: number): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.canBeRefunded()) {
      throw new Error('Order cannot be refunded');
    }

    order.returnReason = reason;
    order.refundAmount = amount || order.summary.total;
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.refundDate = new Date();

    const savedOrder = await this.orderRepository.save(order);

    logger.info(`Refund requested: ${order.orderNumber}`, {
      orderId,
      refundAmount: order.refundAmount,
      reason
    });

    return savedOrder;
  }

  /**
   * Get order statistics
   */
  async getOrderStats(buyerId?: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    recentOrders: Order[];
  }> {
    const query = this.orderRepository.createQueryBuilder('order');

    if (buyerId) {
      query.where('order.buyerId = :buyerId', { buyerId });
    }

    const [orders, totalOrders] = await query.getManyAndCount();

    const totalSpent = orders.reduce((sum, order) => sum + order.summary.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const recentOrdersQuery = this.orderRepository.createQueryBuilder('order')
      .orderBy('order.orderDate', 'DESC')
      .take(5);

    if (buyerId) {
      recentOrdersQuery.where('order.buyerId = :buyerId', { buyerId });
    }

    const recentOrders = await recentOrdersQuery.getMany();

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      recentOrders
    };
  }

  // Private helper methods
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD${dateStr}${timeStr}${randomStr}`;
  }

  private calculateOrderSummary(items: OrderItem[]): OrderSummary {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // TODO: Implement proper discount, shipping, and tax calculation
    const discount = 0;
    const shipping = subtotal > 50000 ? 0 : 3000; // Free shipping over 50,000 KRW
    const tax = Math.round(subtotal * 0.1); // 10% tax
    const total = subtotal + shipping + tax - discount;

    return {
      subtotal,
      discount,
      shipping,
      tax,
      total
    };
  }

  /**
   * Create partner commissions for order (문서 #66: 주문 완료 시 커미션 생성)
   *
   * R-8-6: Load order items from OrderItem entities
   */
  async createPartnerCommissions(order: Order, referralCode?: string): Promise<PartnerCommission[]> {
    if (!referralCode) {
      return [];
    }

    try {
      // 파트너 찾기
      const partner = await this.partnerRepository.findOne({
        where: { referralCode, isActive: true, status: PartnerStatus.ACTIVE },
        relations: ['seller']
      });

      if (!partner) {
        logger.warn(`Partner not found for referral code: ${referralCode}`);
        return [];
      }

      // R-8-6: Load order with items if not already loaded
      if (!order.itemsRelation) {
        const orderWithItems = await this.orderRepository.findOne({
          where: { id: order.id },
          relations: ['itemsRelation']
        });
        if (!orderWithItems || !orderWithItems.itemsRelation) {
          logger.warn(`No order items found for order ${order.id}`);
          return [];
        }
        order.itemsRelation = orderWithItems.itemsRelation;
      }

      const commissions: PartnerCommission[] = [];

      // 각 주문 항목에 대해 커미션 생성 (from OrderItem entities)
      for (const item of order.itemsRelation) {
        // 제품 정보 조회
        const product = await this.productRepository.findOne({
          where: { id: item.productId }
        });

        if (!product) {
          logger.warn(`Product not found: ${item.productId}`);
          continue;
        }

        // 커미션 계산 (문서 #66: 공급자가 설정한 단일 비율)
        const commissionRate = product.partnerCommissionRate || 5; // 기본 5%
        const { commission } = PartnerCommission.calculateCommission(
          item.unitPrice,
          item.quantity,
          commissionRate
        );

        // 커미션 엔티티 생성
        const partnerCommission = this.partnerCommissionRepository.create({
          partnerId: partner.id,
          orderId: order.id,
          productId: item.productId,
          sellerId: partner.sellerId,
          orderAmount: item.totalPrice,
          productPrice: item.unitPrice,
          quantity: item.quantity,
          commissionRate: commissionRate,
          commissionAmount: commission,
          referralCode: referralCode,
          status: CommissionStatus.PENDING,
          convertedAt: new Date()
        });

        const savedCommission = await this.partnerCommissionRepository.save(partnerCommission);
        commissions.push(savedCommission);

        // 파트너 성과 업데이트
        await this.updatePartnerPerformance(partner, item.totalPrice, commission);
      }

      logger.info(`Created ${commissions.length} partner commissions for order ${order.orderNumber}`);
      
      return commissions;

    } catch (error) {
      logger.error('Error creating partner commissions:', error);
      throw error;
    }
  }

  /**
   * Update partner performance metrics
   */
  private async updatePartnerPerformance(partner: Partner, orderValue: number, commission: number): Promise<void> {
    try {
      partner.recordOrder(orderValue, commission);
      await this.partnerRepository.save(partner);

      logger.info(`Partner performance updated: ${partner.id}`);

    } catch (error) {
      logger.error('Error updating partner performance:', error);
    }
  }

  /**
   * Confirm partner commissions (문서 #66: 반품 기간 경과 후 커미션 확정)
   */
  async confirmPartnerCommissions(orderId: string): Promise<void> {
    try {
      const commissions = await this.partnerCommissionRepository.find({
        where: { orderId, status: CommissionStatus.PENDING }
      });

      for (const commission of commissions) {
        commission.confirm();
        await this.partnerCommissionRepository.save(commission);
      }

      logger.info(`Confirmed ${commissions.length} partner commissions for order ${orderId}`);

    } catch (error) {
      logger.error('Error confirming partner commissions:', error);
      throw error;
    }
  }

  /**
   * Cancel partner commissions (주문 취소/반품 시)
   */
  async cancelPartnerCommissions(orderId: string, reason: string): Promise<void> {
    try {
      const commissions = await this.partnerCommissionRepository.find({
        where: { orderId }
      });

      for (const commission of commissions) {
        if (commission.canCancel()) {
          commission.cancel(reason);
          await this.partnerCommissionRepository.save(commission);
        }
      }

      logger.info(`Cancelled ${commissions.length} partner commissions for order ${orderId}`);

    } catch (error) {
      logger.error('Error cancelling partner commissions:', error);
      throw error;
    }
  }

  /**
   * Get partner commissions for order
   */
  async getOrderCommissions(orderId: string): Promise<PartnerCommission[]> {
    try {
      return await this.partnerCommissionRepository.find({
        where: { orderId },
        relations: ['partner', 'product', 'seller']
      });

    } catch (error) {
      logger.error('Error fetching order commissions:', error);
      throw error;
    }
  }

  /**
   * Track referral click (파트너 링크 클릭 시)
   */
  async trackReferralClick(referralCode: string, metadata?: any): Promise<boolean> {
    try {
      const partner = await this.partnerRepository.findOne({
        where: { referralCode, isActive: true, status: PartnerStatus.ACTIVE }
      });

      if (!partner) {
        return false;
      }

      // 클릭 추적
      partner.recordClick();
      await this.partnerRepository.save(partner);

      logger.info(`Referral click tracked: ${referralCode}`, metadata);

      return true;

    } catch (error) {
      logger.error('Error tracking referral click:', error);
      return false;
    }
  }

  /**
   * Phase PD-4: Get orders for a specific seller
   * Returns only orders where the seller sold products
   *
   * R-8-6: Use JOIN on OrderItem entity instead of JSONB query
   */
  async getOrdersForSeller(sellerId: string, filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    try {
      // R-8-6: Get all orders that contain items from this seller (via OrderItem entity)
      const query = this.orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.buyer', 'buyer')
        .innerJoin('order.itemsRelation', 'orderItem')
        .where('orderItem.sellerId = :sellerId', { sellerId })
        .distinct(true); // Avoid duplicates when order has multiple items from same seller

      // Apply filters (same as getOrders)
      if (filters.status) {
        query.andWhere('order.status = :status', { status: filters.status });
      }

      if (filters.paymentStatus) {
        query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
      }

      if (filters.dateFrom) {
        query.andWhere('order.orderDate >= :dateFrom', { dateFrom: filters.dateFrom });
      }

      if (filters.dateTo) {
        query.andWhere('order.orderDate <= :dateTo', { dateTo: filters.dateTo });
      }

      if (filters.search) {
        query.andWhere(
          '(order.orderNumber ILIKE :search OR order.buyerName ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Sorting
      const sortBy = filters.sortBy || 'orderDate';
      const sortOrder = (filters.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

      switch (sortBy) {
        case 'totalAmount':
          query.orderBy('CAST(order.summary->>\'total\' AS DECIMAL)', sortOrder);
          break;
        case 'status':
          query.orderBy('order.status', sortOrder);
          break;
        case 'buyerName':
          query.orderBy('order.buyerName', sortOrder);
          break;
        default:
          query.orderBy('order.orderDate', sortOrder);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      query.skip(offset).take(limit);

      const [orders, total] = await query.getManyAndCount();

      logger.debug(`[PD-4] Retrieved ${orders.length} orders for seller ${sellerId}`);

      return { orders, total };
    } catch (error) {
      logger.error('[PD-4] Error fetching seller orders:', error);
      throw error;
    }
  }

  /**
   * Phase PD-4: Get orders for a specific supplier
   * Returns only orders where the supplier's products were purchased
   *
   * R-8-6: Use JOIN on OrderItem entity instead of JSONB query
   */
  async getOrdersForSupplier(supplierId: string, filters: OrderFilters = {}): Promise<{ orders: Order[], total: number }> {
    try {
      // R-8-6: Get all orders that contain products from this supplier (via OrderItem entity)
      const query = this.orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.buyer', 'buyer')
        .innerJoin('order.itemsRelation', 'orderItem')
        .where('orderItem.supplierId = :supplierId', { supplierId })
        .distinct(true); // Avoid duplicates when order has multiple items from same supplier

      // Apply filters
      if (filters.status) {
        query.andWhere('order.status = :status', { status: filters.status });
      }

      if (filters.paymentStatus) {
        query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
      }

      if (filters.dateFrom) {
        query.andWhere('order.orderDate >= :dateFrom', { dateFrom: filters.dateFrom });
      }

      if (filters.dateTo) {
        query.andWhere('order.orderDate <= :dateTo', { dateTo: filters.dateTo });
      }

      if (filters.search) {
        query.andWhere(
          '(order.orderNumber ILIKE :search OR order.buyerName ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Sorting
      const sortBy = filters.sortBy || 'orderDate';
      const sortOrder = (filters.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

      switch (sortBy) {
        case 'totalAmount':
          query.orderBy('CAST(order.summary->>\'total\' AS DECIMAL)', sortOrder);
          break;
        case 'status':
          query.orderBy('order.status', sortOrder);
          break;
        case 'buyerName':
          query.orderBy('order.buyerName', sortOrder);
          break;
        default:
          query.orderBy('order.orderDate', sortOrder);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      query.skip(offset).take(limit);

      const [orders, total] = await query.getManyAndCount();

      logger.debug(`[PD-4] Retrieved ${orders.length} orders for supplier ${supplierId}`);

      return { orders, total };
    } catch (error) {
      logger.error('[PD-4] Error fetching supplier orders:', error);
      throw error;
    }
  }

  /**
   * Update shipping information (Phase 5)
   */
  async updateOrderShipping(
    orderId: string,
    shippingInfo: {
      shippingCarrier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
    },
    options?: {
      actorId?: string;
      actorName?: string;
      actorRole?: string;
      message?: string;
      source?: string;
    }
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update shipping fields
    if (shippingInfo.shippingCarrier !== undefined) {
      order.shippingCarrier = shippingInfo.shippingCarrier;
    }
    if (shippingInfo.trackingNumber !== undefined) {
      order.trackingNumber = shippingInfo.trackingNumber;
    }
    if (shippingInfo.trackingUrl !== undefined) {
      order.trackingUrl = shippingInfo.trackingUrl;
    }

    const savedOrder = await this.orderRepository.save(order);

    // Create shipping update event
    await this.createOrderEvent(
      this.orderEventRepository.manager,
      orderId,
      OrderEventType.SHIPPING_UPDATE,
      {
        message: options?.message || 'Shipping information updated',
        actorId: options?.actorId,
        actorName: options?.actorName,
        actorRole: options?.actorRole,
        source: options?.source || 'admin',
        payload: shippingInfo
      }
    );

    logger.info(`Shipping information updated: ${order.orderNumber}`, {
      orderId,
      shippingInfo
    });

    return savedOrder;
  }

  /**
   * Get order with events (Phase 5)
   */
  async getOrderWithEvents(orderId: string, buyerId?: string): Promise<Order> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.events', 'events')
      .where('order.id = :orderId', { orderId });

    if (buyerId) {
      query.andWhere('order.buyerId = :buyerId', { buyerId });
    }

    // Order events by creation time
    query.orderBy('events.createdAt', 'ASC');

    const order = await query.getOne();

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  /**
   * Create order event (helper method - Phase 5)
   */
  private async createOrderEvent(
    manager: any,
    orderId: string,
    type: OrderEventType,
    data: {
      prevStatus?: OrderStatus | string;
      newStatus?: OrderStatus | string;
      message?: string;
      actorId?: string;
      actorName?: string;
      actorRole?: string;
      source?: string;
      payload?: OrderEventPayload;
    }
  ): Promise<OrderEvent> {
    const event = this.orderEventRepository.create({
      orderId,
      type,
      prevStatus: data.prevStatus,
      newStatus: data.newStatus,
      message: data.message,
      actorId: data.actorId,
      actorName: data.actorName,
      actorRole: data.actorRole,
      source: data.source || 'system',
      payload: data.payload
    });

    return await manager.save(OrderEvent, event);
  }

  /**
   * Validate status transition (helper method - Phase 5)
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    // Terminal statuses cannot be changed
    const terminalStatuses = [OrderStatus.CANCELLED, OrderStatus.RETURNED];
    if (terminalStatuses.includes(currentStatus)) {
      throw new Error(`Cannot change status from ${currentStatus}`);
    }

    // Delivered orders can only be returned
    if (currentStatus === OrderStatus.DELIVERED && newStatus !== OrderStatus.RETURNED) {
      throw new Error('Delivered orders can only be returned');
    }

    // Add more business rules as needed
  }

  /**
   * Get display name for order status (helper method - CI-2.1)
   */
  private getStatusDisplayName(status: OrderStatus): string {
    const statusNames: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: '대기중',
      [OrderStatus.CONFIRMED]: '확정',
      [OrderStatus.PROCESSING]: '처리중',
      [OrderStatus.SHIPPED]: '배송중',
      [OrderStatus.DELIVERED]: '배송완료',
      [OrderStatus.CANCELLED]: '취소됨',
      [OrderStatus.RETURNED]: '반품됨',
    };
    return statusNames[status] || status;
  }

  /**
   * Send order.new notifications (Phase PD-7)
   * Notifies sellers and suppliers when a new order is created
   *
   * R-8-6: Load order items from OrderItem entities
   */
  private async sendOrderNotifications(order: Order): Promise<void> {
    try {
      // R-8-6: Load order with items if not already loaded
      if (!order.itemsRelation) {
        const orderWithItems = await this.orderRepository.findOne({
          where: { id: order.id },
          relations: ['itemsRelation']
        });
        if (!orderWithItems || !orderWithItems.itemsRelation) {
          logger.warn(`[PD-7] No order items found for order ${order.id}`);
          return;
        }
        order.itemsRelation = orderWithItems.itemsRelation;
      }

      // Collect unique seller and supplier IDs
      const sellerIds = new Set<string>();
      const supplierIds = new Set<string>();

      for (const item of order.itemsRelation) {
        if (item.sellerId) {
          sellerIds.add(item.sellerId);
        }
        if (item.supplierId) {
          supplierIds.add(item.supplierId);
        }
      }

      // Send notifications to sellers
      for (const sellerId of sellerIds) {
        const sellerItems = order.itemsRelation.filter(item => item.sellerId === sellerId);
        const itemCount = sellerItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = sellerItems.reduce((sum, item) => sum + item.totalPrice, 0);

        await notificationService.createNotification({
          userId: sellerId,
          type: 'order.new',
          title: '새로운 주문이 접수되었습니다',
          message: `주문번호 ${order.orderNumber} - ${itemCount}개 상품, ${totalAmount.toLocaleString()}원`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            itemCount,
            totalAmount,
            buyerName: order.buyerName,
          },
          channel: 'in_app',
        });

        logger.info('[PD-7] Order notification sent to seller', {
          sellerId,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      }

      // Send notifications to suppliers
      for (const supplierId of supplierIds) {
        const supplierItems = order.itemsRelation.filter(item => item.supplierId === supplierId);
        const itemCount = supplierItems.reduce((sum, item) => sum + item.quantity, 0);
        const supplierAmount = supplierItems.reduce((sum, item) => {
          return sum + (item.basePriceSnapshot || item.unitPrice) * item.quantity;
        }, 0);

        await notificationService.createNotification({
          userId: supplierId,
          type: 'order.new',
          title: '새로운 공급 주문이 접수되었습니다',
          message: `주문번호 ${order.orderNumber} - ${itemCount}개 상품, 공급 금액 ${supplierAmount.toLocaleString()}원`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            itemCount,
            supplierAmount,
            buyerName: order.buyerName,
          },
          channel: 'in_app',
        });

        logger.info('[PD-7] Order notification sent to supplier', {
          supplierId,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      }
    } catch (error) {
      // Log error but don't throw - notifications are not critical
      logger.error('[PD-7] Error sending order notifications:', error);
    }
  }

  /**
   * R-8-3-1: Create OrderItem entities from JSONB items (Dual-write helper)
   *
   * Creates relational OrderItem entities alongside JSONB storage
   * for better query performance and dashboard aggregations
   *
   * @param manager - Transaction manager (ensures atomicity with order creation)
   * @param order - The saved order entity
   * @param items - OrderItem interfaces from request (with commission data)
   */
  private async createOrderItemEntities(
    manager: any,
    order: Order,
    items: OrderItem[]
  ): Promise<void> {
    for (const item of items) {
      const orderItemEntity = new OrderItemEntity();

      // Order reference
      orderItemEntity.orderId = order.id;

      // Product information (snapshot)
      orderItemEntity.productId = item.productId;
      orderItemEntity.productName = item.productName;
      orderItemEntity.productSku = item.productSku;

      // R-8-4: Frontend presentation fields
      orderItemEntity.productImage = item.productImage;
      orderItemEntity.productBrand = item.productBrand;
      orderItemEntity.variationName = item.variationName;

      orderItemEntity.quantity = item.quantity;
      orderItemEntity.unitPrice = item.unitPrice;
      orderItemEntity.totalPrice = item.totalPrice;

      // Supplier information
      orderItemEntity.supplierId = item.supplierId;
      orderItemEntity.supplierName = item.supplierName;

      // Seller information
      orderItemEntity.sellerId = item.sellerId;
      orderItemEntity.sellerName = item.sellerName;
      orderItemEntity.sellerProductId = item.sellerProductId;

      // Pricing snapshots (immutable)
      orderItemEntity.basePriceSnapshot = item.basePriceSnapshot;
      orderItemEntity.salePriceSnapshot = item.salePriceSnapshot;
      orderItemEntity.marginAmountSnapshot = item.marginAmountSnapshot;

      // Commission information (immutable, calculated at order creation)
      orderItemEntity.commissionType = item.commissionType;
      orderItemEntity.commissionRate = item.commissionRate;
      orderItemEntity.commissionAmount = item.commissionAmount;

      // Flexible metadata
      orderItemEntity.attributes = item.attributes;
      orderItemEntity.notes = item.notes;

      // Save within transaction
      await manager.save(OrderItemEntity, orderItemEntity);
    }
  }
}