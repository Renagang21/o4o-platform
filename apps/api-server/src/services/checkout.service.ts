/**
 * Checkout Service
 *
 * Phase N-2: 운영 안정화
 *
 * 주문/결제 DB 영속화 서비스
 */

import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../database/connection.js';
import {
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentStatus,
  ShippingAddress,
} from '../entities/checkout/CheckoutOrder.entity.js';
import {
  CheckoutPayment,
  CheckoutPaymentTransactionStatus,
} from '../entities/checkout/CheckoutPayment.entity.js';
import { OrderLog, OrderAction } from '../entities/checkout/OrderLog.entity.js';
import logger from '../utils/logger.js';

/**
 * 주문 아이템
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * 주문 생성 DTO
 */
export interface CreateOrderDto {
  buyerId: string;
  sellerId: string;
  supplierId: string;
  partnerId?: string;
  sellerOrganizationId?: string; // WO-CHECKOUT-ORG-BOUNDARY-FIX-V1
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  metadata?: Record<string, any>;
}

/**
 * 결제 완료 DTO
 */
export interface CompletePaymentDto {
  paymentKey: string;
  method: string;
  cardCompany?: string;
  cardNumber?: string;
  installmentMonths?: number;
  approvedAt: string;
  metadata?: Record<string, any>;
}

/**
 * 환불 DTO
 */
export interface RefundOrderDto {
  reason: string;
  amount?: number;
  performedBy: string;
  performerType: string;
}

class CheckoutService {
  private orderRepository: Repository<CheckoutOrder> | null = null;
  private paymentRepository: Repository<CheckoutPayment> | null = null;
  private logRepository: Repository<OrderLog> | null = null;
  private initialized = false;

  /**
   * 서비스 초기화 (lazy)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      this.orderRepository = AppDataSource.getRepository(CheckoutOrder);
      this.paymentRepository = AppDataSource.getRepository(CheckoutPayment);
      this.logRepository = AppDataSource.getRepository(OrderLog);
      this.initialized = true;

      logger.info('CheckoutService initialized with DB');
    } catch (error) {
      logger.warn('CheckoutService DB initialization failed, using fallback');
      throw error;
    }
  }

  /**
   * 주문 번호 생성
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * 주문 생성
   */
  async createOrder(dto: CreateOrderDto): Promise<CheckoutOrder> {
    await this.ensureInitialized();

    const subtotal = dto.items.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingFee = 0;
    const discount = 0;
    const totalAmount = subtotal + shippingFee - discount;

    const order = this.orderRepository!.create({
      orderNumber: this.generateOrderNumber(),
      buyerId: dto.buyerId,
      sellerId: dto.sellerId,
      supplierId: dto.supplierId,
      partnerId: dto.partnerId,
      sellerOrganizationId: dto.sellerOrganizationId,
      items: dto.items,
      subtotal,
      shippingFee,
      discount,
      totalAmount,
      status: CheckoutOrderStatus.CREATED,
      paymentStatus: CheckoutPaymentStatus.PENDING,
      shippingAddress: dto.shippingAddress ? { ...dto.shippingAddress, phone: dto.shippingAddress.phone?.replace(/\D/g, '') || dto.shippingAddress.phone } : dto.shippingAddress,
      metadata: dto.metadata,
    });

    const savedOrder = await this.orderRepository!.save(order);

    // 로그 기록
    await this.createLog({
      orderId: savedOrder.id,
      action: OrderAction.CREATED,
      newStatus: CheckoutOrderStatus.CREATED,
      performedBy: dto.buyerId,
      performerType: 'consumer',
      message: `주문 생성: ${savedOrder.orderNumber}`,
    });

    logger.info('Order created:', {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      totalAmount,
    });

    return savedOrder;
  }

  /**
   * 결제 레코드 생성
   */
  async createPayment(
    orderId: string,
    amount: number
  ): Promise<CheckoutPayment> {
    await this.ensureInitialized();

    const payment = this.paymentRepository!.create({
      orderId,
      pgProvider: 'toss',
      amount,
      status: CheckoutPaymentTransactionStatus.PENDING,
    });

    const savedPayment = await this.paymentRepository!.save(payment);

    // 로그 기록
    await this.createLog({
      orderId,
      action: OrderAction.PAYMENT_INITIATED,
      performedBy: 'system',
      performerType: 'system',
      message: `결제 시작: ${amount}원`,
    });

    return savedPayment;
  }

  /**
   * 결제 완료 처리
   */
  async completePayment(
    orderId: string,
    dto: CompletePaymentDto
  ): Promise<{ order: CheckoutOrder; payment: CheckoutPayment }> {
    await this.ensureInitialized();

    // 주문 조회
    const order = await this.orderRepository!.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // 결제 레코드 조회
    let payment = await this.paymentRepository!.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      // 결제 레코드가 없으면 생성
      payment = await this.createPayment(orderId, order.totalAmount);
    }

    // 결제 레코드 업데이트
    payment.paymentKey = dto.paymentKey;
    payment.status = CheckoutPaymentTransactionStatus.SUCCESS;
    payment.method = dto.method;
    payment.cardCompany = dto.cardCompany;
    payment.cardNumber = dto.cardNumber;
    payment.installmentMonths = dto.installmentMonths || 0;
    payment.approvedAt = new Date(dto.approvedAt);
    payment.metadata = dto.metadata;

    await this.paymentRepository!.save(payment);

    // 주문 상태 업데이트
    const previousStatus = order.status;
    order.status = CheckoutOrderStatus.PAID;
    order.paymentStatus = CheckoutPaymentStatus.PAID;
    order.paymentMethod = dto.method;
    order.paidAt = new Date(dto.approvedAt);

    await this.orderRepository!.save(order);

    // 로그 기록
    await this.createLog({
      orderId,
      action: OrderAction.PAYMENT_SUCCESS,
      previousStatus,
      newStatus: CheckoutOrderStatus.PAID,
      performedBy: 'system',
      performerType: 'system',
      message: `결제 완료: ${order.totalAmount}원, ${dto.method}`,
      metadata: { paymentKey: dto.paymentKey },
    });

    logger.info('Payment completed:', {
      orderId,
      orderNumber: order.orderNumber,
      paymentKey: dto.paymentKey,
    });

    return { order, payment };
  }

  /**
   * 결제 실패 처리
   */
  async failPayment(orderId: string, reason: string): Promise<void> {
    await this.ensureInitialized();

    const payment = await this.paymentRepository!.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (payment) {
      payment.status = CheckoutPaymentTransactionStatus.FAILED;
      payment.failureReason = reason;
      payment.failedAt = new Date();
      await this.paymentRepository!.save(payment);
    }

    // 로그 기록
    await this.createLog({
      orderId,
      action: OrderAction.PAYMENT_FAILED,
      performedBy: 'system',
      performerType: 'system',
      message: `결제 실패: ${reason}`,
    });
  }

  /**
   * 환불 처리
   */
  async refundOrder(
    orderId: string,
    dto: RefundOrderDto
  ): Promise<{ order: CheckoutOrder; payment: CheckoutPayment }> {
    await this.ensureInitialized();

    const order = await this.orderRepository!.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus !== CheckoutPaymentStatus.PAID) {
      throw new Error('Only paid orders can be refunded');
    }

    const payment = await this.paymentRepository!.findOne({
      where: { orderId, status: CheckoutPaymentTransactionStatus.SUCCESS },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    const previousStatus = order.status;

    // 환불 금액 (전액 또는 부분)
    const refundAmount = dto.amount || order.totalAmount;

    // 결제 레코드 업데이트
    payment.status = CheckoutPaymentTransactionStatus.REFUNDED;
    payment.refundedAmount = refundAmount;
    payment.refundReason = dto.reason;
    payment.refundedAt = new Date();
    await this.paymentRepository!.save(payment);

    // 주문 상태 업데이트
    order.status = CheckoutOrderStatus.REFUNDED;
    order.paymentStatus = CheckoutPaymentStatus.REFUNDED;
    order.refundedAt = new Date();
    await this.orderRepository!.save(order);

    // 로그 기록
    await this.createLog({
      orderId,
      action: OrderAction.REFUNDED,
      previousStatus,
      newStatus: CheckoutOrderStatus.REFUNDED,
      performedBy: dto.performedBy,
      performerType: dto.performerType,
      message: `환불 완료: ${refundAmount}원, 사유: ${dto.reason}`,
      metadata: { refundAmount, reason: dto.reason },
    });

    logger.info('Order refunded:', {
      orderId,
      orderNumber: order.orderNumber,
      refundAmount,
      performedBy: dto.performedBy,
    });

    return { order, payment };
  }

  /**
   * 주문 조회 (ID)
   */
  async findById(id: string): Promise<CheckoutOrder | null> {
    await this.ensureInitialized();
    return await this.orderRepository!.findOne({
      where: { id },
    });
  }

  /**
   * 주문 조회 (주문 번호)
   */
  async findByOrderNumber(orderNumber: string): Promise<CheckoutOrder | null> {
    await this.ensureInitialized();
    return await this.orderRepository!.findOne({
      where: { orderNumber },
    });
  }

  /**
   * 사용자 주문 목록 조회
   */
  async findByBuyerId(buyerId: string): Promise<CheckoutOrder[]> {
    await this.ensureInitialized();
    return await this.orderRepository!.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 모든 주문 조회 (Admin)
   */
  async findAll(filters?: {
    status?: CheckoutOrderStatus;
    paymentStatus?: CheckoutPaymentStatus;
    supplierId?: string;
    partnerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: CheckoutOrder[]; total: number }> {
    await this.ensureInitialized();

    const query = this.orderRepository!.createQueryBuilder('order');

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters?.paymentStatus) {
      query.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: filters.paymentStatus,
      });
    }
    if (filters?.supplierId) {
      query.andWhere('order.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }
    if (filters?.partnerId) {
      query.andWhere('order.partnerId = :partnerId', {
        partnerId: filters.partnerId,
      });
    }

    const total = await query.getCount();

    query.orderBy('order.createdAt', 'DESC');

    if (filters?.limit) {
      query.take(filters.limit);
    }
    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const orders = await query.getMany();

    return { orders, total };
  }

  /**
   * 결제 레코드 조회
   */
  async findPaymentByOrderId(orderId: string): Promise<CheckoutPayment | null> {
    await this.ensureInitialized();
    return await this.paymentRepository!.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 주문 로그 조회
   */
  async getOrderLogs(orderId: string): Promise<OrderLog[]> {
    await this.ensureInitialized();
    return await this.logRepository!.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 로그 생성
   */
  private async createLog(data: {
    orderId: string;
    action: OrderAction;
    previousStatus?: string;
    newStatus?: string;
    performedBy: string;
    performerType: string;
    message?: string;
    metadata?: Record<string, any>;
  }): Promise<OrderLog> {
    const log = this.logRepository!.create(data);
    return await this.logRepository!.save(log);
  }

  /**
   * DB 초기화 여부 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const checkoutService = new CheckoutService();
