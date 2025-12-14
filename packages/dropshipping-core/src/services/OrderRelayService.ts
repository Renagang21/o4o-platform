/**
 * OrderRelayService
 *
 * 주문 relay 전체 로직 처리
 *
 * ## E-commerce Core 연계 (Phase 3)
 *
 * Dropshipping Core는 E-commerce Core의 `OrderType === 'dropshipping'`인
 * 주문만 처리합니다.
 *
 * ### 연계 흐름
 *
 * ```
 * EcommerceOrder (orderType: 'dropshipping')
 *        ↓
 *        ↓ ecommerceOrderId (FK)
 *        ↓
 * OrderRelay (Dropshipping 특화 Relay 정보)
 *        ↓
 * SellerListing → SupplierOffer
 * ```
 *
 * ### 핵심 연계 메서드
 *
 * - `createOrder({ ecommerceOrderId })`: EcommerceOrder와 연결된 OrderRelay 생성
 * - `findByEcommerceOrderId()`: EcommerceOrder ID로 관련 OrderRelay 목록 조회
 *
 * ### 역할 분담
 *
 * | 책임 영역         | E-commerce Core | Dropshipping Core |
 * |------------------|-----------------|-------------------|
 * | 판매 원장         | ✓               |                   |
 * | 결제 처리         | ✓               |                   |
 * | 공급자 Relay      |                 | ✓                 |
 * | 배송 추적         |                 | ✓                 |
 * | 판매자-공급자 정산 |                 | ✓                 |
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRelay, OrderRelayStatus } from '../entities/OrderRelay.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrderRelayService {
  constructor(
    @InjectRepository(OrderRelay)
    private readonly orderRepository: Repository<OrderRelay>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 주문 생성
   */
  async createOrder(data: Partial<OrderRelay>): Promise<OrderRelay> {
    const orderNumber = this.generateOrderNumber();
    const order = this.orderRepository.create({
      ...data,
      orderNumber,
      status: OrderRelayStatus.PENDING,
    });
    const savedOrder = await this.orderRepository.save(order);

    // 이벤트 발행
    this.eventEmitter.emit('order.created', savedOrder);

    return savedOrder;
  }

  /**
   * 주문 조회
   */
  async findById(id: string): Promise<OrderRelay | null> {
    return await this.orderRepository.findOne({
      where: { id },
      relations: ['listing', 'listing.seller', 'listing.offer'],
    });
  }

  /**
   * 주문 번호로 조회
   */
  async findByOrderNumber(orderNumber: string): Promise<OrderRelay | null> {
    return await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['listing'],
    });
  }

  /**
   * E-commerce Order ID로 조회
   * - E-commerce Core의 EcommerceOrder와 연결된 OrderRelay 목록 반환
   */
  async findByEcommerceOrderId(ecommerceOrderId: string): Promise<OrderRelay[]> {
    return await this.orderRepository.find({
      where: { ecommerceOrderId },
      relations: ['listing', 'listing.seller', 'listing.offer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 주문 목록 조회
   */
  async findAll(filters?: {
    status?: OrderRelayStatus;
    listingId?: string;
  }): Promise<OrderRelay[]> {
    const query = this.orderRepository.createQueryBuilder('order');

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.listingId) {
      query.andWhere('order.listingId = :listingId', {
        listingId: filters.listingId,
      });
    }

    return await query
      .leftJoinAndSelect('order.listing', 'listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 주문을 공급자에게 relay
   */
  async relayToSupplier(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.RELAYED;
    order.relayedAt = new Date();
    const savedOrder = await this.orderRepository.save(order);

    // 이벤트 발행
    this.eventEmitter.emit('order.relay.dispatched', savedOrder);

    return savedOrder;
  }

  /**
   * 공급자가 주문 확인
   */
  async confirmOrder(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.CONFIRMED;
    order.confirmedAt = new Date();
    return await this.orderRepository.save(order);
  }

  /**
   * 주문 출고 처리
   */
  async shipOrder(id: string, shippingInfo?: Record<string, any>): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.SHIPPED;
    order.shippedAt = new Date();
    if (shippingInfo) {
      order.shippingInfo = shippingInfo;
    }
    return await this.orderRepository.save(order);
  }

  /**
   * 주문 배송 완료 처리
   */
  async deliverOrder(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.DELIVERED;
    order.deliveredAt = new Date();
    const savedOrder = await this.orderRepository.save(order);

    // 이벤트 발행
    this.eventEmitter.emit('order.relay.fulfilled', savedOrder);

    return savedOrder;
  }

  /**
   * 주문 취소
   */
  async cancelOrder(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.CANCELLED;
    return await this.orderRepository.save(order);
  }

  /**
   * 주문 환불
   */
  async refundOrder(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.REFUNDED;
    return await this.orderRepository.save(order);
  }

  /**
   * 주문 번호 생성
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }
}
