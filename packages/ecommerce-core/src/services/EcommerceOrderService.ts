/**
 * EcommerceOrderService
 *
 * 주문 원장 관리 서비스
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EcommerceOrder,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
  ShippingAddress,
} from '../entities/EcommerceOrder.entity.js';
import { EcommerceOrderItem } from '../entities/EcommerceOrderItem.entity.js';

/**
 * 주문 생성 DTO
 */
export interface CreateOrderDto {
  buyerId: string;
  buyerType?: BuyerType;
  sellerId: string;
  sellerType?: SellerType;
  orderType: OrderType;
  shippingAddress?: ShippingAddress;
  externalOrderId?: string;
  items: CreateOrderItemDto[];
  shippingFee?: number;
  discount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  /** 매장 ID (WO-KCOS-STORES-PHASE2) */
  storeId?: string;
  /** 주문 소스: online, in-store, kiosk */
  orderSource?: string;
  /** 비즈니스 채널: local, travel */
  channel?: string;
}

export interface CreateOrderItemDto {
  productId?: string;
  externalProductId?: string;
  productName: string;
  sku?: string;
  options?: Record<string, any>;
  quantity: number;
  unitPrice: number;
  discount?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class EcommerceOrderService {
  constructor(
    @InjectRepository(EcommerceOrder)
    private readonly orderRepository: Repository<EcommerceOrder>,
    @InjectRepository(EcommerceOrderItem)
    private readonly orderItemRepository: Repository<EcommerceOrderItem>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 주문 번호 생성
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * 주문 생성
   */
  async create(dto: CreateOrderDto): Promise<EcommerceOrder> {
    // 금액 계산
    const subtotal = dto.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice - (item.discount || 0);
      return sum + itemSubtotal;
    }, 0);

    const shippingFee = dto.shippingFee || 0;
    const discount = dto.discount || 0;
    const totalAmount = subtotal + shippingFee - discount;

    // 주문 생성
    const order = this.orderRepository.create({
      orderNumber: this.generateOrderNumber(),
      externalOrderId: dto.externalOrderId,
      buyerId: dto.buyerId,
      buyerType: dto.buyerType || BuyerType.USER,
      sellerId: dto.sellerId,
      sellerType: dto.sellerType || SellerType.ORGANIZATION,
      orderType: dto.orderType,
      subtotal,
      shippingFee,
      discount,
      totalAmount,
      currency: dto.currency || 'KRW',
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.CREATED,
      shippingAddress: dto.shippingAddress,
      metadata: dto.metadata,
      storeId: dto.storeId,
      orderSource: dto.orderSource,
      channel: dto.channel,
    });

    const savedOrder = await this.orderRepository.save(order);

    // 주문 항목 생성
    const items = dto.items.map((itemDto) =>
      this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: itemDto.productId,
        externalProductId: itemDto.externalProductId,
        productName: itemDto.productName,
        sku: itemDto.sku,
        options: itemDto.options,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discount: itemDto.discount || 0,
        subtotal: itemDto.quantity * itemDto.unitPrice - (itemDto.discount || 0),
        metadata: itemDto.metadata,
      })
    );

    await this.orderItemRepository.save(items);

    // 이벤트 발행
    this.eventEmitter.emit('order.created', {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      orderType: savedOrder.orderType,
      buyerId: savedOrder.buyerId,
      sellerId: savedOrder.sellerId,
      totalAmount: savedOrder.totalAmount,
      metadata: savedOrder.metadata,
      createdAt: savedOrder.createdAt,
    });

    return savedOrder;
  }

  /**
   * 주문 조회 (ID)
   */
  async findById(id: string): Promise<EcommerceOrder | null> {
    return await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'payments'],
    });
  }

  /**
   * 주문 조회 (주문 번호)
   */
  async findByOrderNumber(orderNumber: string): Promise<EcommerceOrder | null> {
    return await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['items', 'payments'],
    });
  }

  /**
   * 주문 목록 조회
   */
  async findAll(filters?: {
    buyerId?: string;
    sellerId?: string;
    orderType?: OrderType;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: EcommerceOrder[]; total: number }> {
    const query = this.orderRepository.createQueryBuilder('order');

    if (filters?.buyerId) {
      query.andWhere('order.buyerId = :buyerId', { buyerId: filters.buyerId });
    }
    if (filters?.sellerId) {
      query.andWhere('order.sellerId = :sellerId', { sellerId: filters.sellerId });
    }
    if (filters?.orderType) {
      query.andWhere('order.orderType = :orderType', { orderType: filters.orderType });
    }
    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters?.paymentStatus) {
      query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    }

    const total = await query.getCount();

    query
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

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
   * 결제 상태 업데이트
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: string
  ): Promise<EcommerceOrder> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = paymentStatus;
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }

    if (paymentStatus === PaymentStatus.PAID) {
      order.paidAt = new Date();
      order.status = OrderStatus.PAID;

      this.eventEmitter.emit('payment.completed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        paidAt: order.paidAt,
      });
    }

    return await this.orderRepository.save(order);
  }

  /**
   * 주문 상태 업데이트
   */
  async updateStatus(id: string, status: OrderStatus): Promise<EcommerceOrder> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = status;

    if (status === OrderStatus.CONFIRMED) {
      order.confirmedAt = new Date();
      this.eventEmitter.emit('order.confirmed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        confirmedAt: order.confirmedAt,
      });
    } else if (status === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      this.eventEmitter.emit('order.completed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        completedAt: order.completedAt,
      });
    } else if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      this.eventEmitter.emit('order.cancelled', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        cancelledAt: order.cancelledAt,
      });
    }

    return await this.orderRepository.save(order);
  }

  /**
   * 주문 취소
   */
  async cancel(id: string, reason?: string): Promise<EcommerceOrder> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    if (reason) {
      order.metadata = {
        ...order.metadata,
        cancellationReason: reason,
      };
    }

    const savedOrder = await this.orderRepository.save(order);

    this.eventEmitter.emit('order.cancelled', {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      orderType: savedOrder.orderType,
      reason,
      cancelledAt: savedOrder.cancelledAt,
    });

    return savedOrder;
  }
}
