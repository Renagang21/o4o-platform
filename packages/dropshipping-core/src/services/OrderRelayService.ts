/**
 * OrderRelayService
 *
 * DS-4 준수 주문 Relay 서비스
 *
 * ## 핵심 원칙 (DS-4.1)
 * - OrderRelay는 프로세스 엔티티 (쇼핑몰 아님)
 * - 결제/환불 처리 금지
 * - Ecommerce Core 경유 필수
 * - 모든 상태 변경은 명시적 메서드 + 로그 기록
 *
 * ## 상태 모델 (DS-4.3)
 * pending → relayed → confirmed → shipped → delivered
 *                                    ↓
 *                                 refunded (terminal)
 * pending/relayed/confirmed → cancelled (terminal)
 *
 * ## E-commerce Core 연계
 * - EcommerceOrder가 판매 원장 (Source of Truth)
 * - OrderRelay는 Dropshipping 특화 Relay 정보만 담당
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRelay, OrderRelayStatus } from '../entities/OrderRelay.entity.js';
import { OrderRelayLog, OrderRelayLogAction } from '../entities/OrderRelayLog.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  canTransitionOrderRelay,
  isOrderRelayTerminal,
  getAllowedOrderRelayTransitions,
  canTriggerOrderRelayTransition,
} from '../utils/state-machine.js';

export interface CreateOrderRelayDto {
  listingId: string;
  ecommerceOrderId?: string;
  externalOrderId?: string;
  quantity: number;
  unitPrice: number;
  customerInfo?: Record<string, any>;
  shippingInfo?: Record<string, any>;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface UpdateStatusDto {
  status: OrderRelayStatus;
  reason?: string;
  shippingInfo?: Record<string, any>;
}

export interface ActorInfo {
  actorId: string;
  actorType: 'admin' | 'system' | 'seller' | 'supplier';
}

@Injectable()
export class OrderRelayService {
  constructor(
    @InjectRepository(OrderRelay)
    private readonly orderRepository: Repository<OrderRelay>,
    @InjectRepository(OrderRelayLog)
    private readonly logRepository: Repository<OrderRelayLog>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 주문 Relay 생성 (Admin Trigger)
   *
   * DS-4.1: ecommerceOrderId 또는 externalOrderId 중 하나는 필수
   */
  async create(dto: CreateOrderRelayDto, actor: ActorInfo): Promise<OrderRelay> {
    // 멱등성 체크
    if (dto.idempotencyKey) {
      const existing = await this.orderRepository.findOne({
        where: { metadata: { idempotencyKey: dto.idempotencyKey } as any },
      });
      if (existing) {
        return existing;
      }
    }

    // externalOrderId 중복 체크
    if (dto.externalOrderId) {
      const existing = await this.orderRepository.findOne({
        where: {
          listingId: dto.listingId,
          externalOrderId: dto.externalOrderId,
        },
      });
      if (existing) {
        return existing; // 멱등성: 동일 주문 반환
      }
    }

    const orderNumber = this.generateOrderNumber();
    const totalPrice = dto.quantity * dto.unitPrice;

    const order = this.orderRepository.create({
      listingId: dto.listingId,
      ecommerceOrderId: dto.ecommerceOrderId,
      externalOrderId: dto.externalOrderId,
      orderNumber,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      totalPrice,
      status: OrderRelayStatus.PENDING,
      customerInfo: dto.customerInfo,
      shippingInfo: dto.shippingInfo,
      metadata: {
        ...dto.metadata,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    const savedOrder = await this.orderRepository.save(order);

    // 생성 로그 기록
    await this.createLog(savedOrder.id, {
      action: OrderRelayLogAction.CREATED,
      newStatus: OrderRelayStatus.PENDING,
      actor,
      newData: {
        orderNumber: savedOrder.orderNumber,
        listingId: savedOrder.listingId,
        quantity: savedOrder.quantity,
        totalPrice: savedOrder.totalPrice,
      },
    });

    // 이벤트 발행
    this.eventEmitter.emit('orderRelay.created', savedOrder);

    return savedOrder;
  }

  /**
   * 기존 createOrder 메서드 (하위 호환)
   * @deprecated Use create() instead
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
   */
  async findByEcommerceOrderId(ecommerceOrderId: string): Promise<OrderRelay[]> {
    return await this.orderRepository.find({
      where: { ecommerceOrderId },
      relations: ['listing', 'listing.seller', 'listing.offer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 주문 목록 조회 (Admin)
   */
  async findAll(filters?: {
    status?: OrderRelayStatus;
    listingId?: string;
    sellerId?: string;
    ecommerceOrderId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: OrderRelay[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.listing', 'listing')
      .leftJoinAndSelect('listing.seller', 'seller');

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.listingId) {
      query.andWhere('order.listingId = :listingId', { listingId: filters.listingId });
    }

    if (filters?.sellerId) {
      query.andWhere('listing.sellerId = :sellerId', { sellerId: filters.sellerId });
    }

    if (filters?.ecommerceOrderId) {
      query.andWhere('order.ecommerceOrderId = :ecommerceOrderId', {
        ecommerceOrderId: filters.ecommerceOrderId,
      });
    }

    const [data, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * 상태 변경 (Admin API)
   *
   * DS-4.3: 화이트리스트 기반 전이만 허용
   */
  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    actor: ActorInfo
  ): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new NotFoundException(`OrderRelay not found: ${id}`);
    }

    const currentStatus = order.status;
    const targetStatus = dto.status;

    // 터미널 상태 체크
    if (isOrderRelayTerminal(currentStatus)) {
      throw new BadRequestException(
        `Cannot change status: ${currentStatus} is a terminal state`
      );
    }

    // 상태 전이 가능 여부 체크
    if (!canTransitionOrderRelay(currentStatus, targetStatus)) {
      const allowedTransitions = getAllowedOrderRelayTransitions(currentStatus);
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}. ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // 트리거 권한 체크
    if (!canTriggerOrderRelayTransition(currentStatus, targetStatus, actor.actorType)) {
      throw new BadRequestException(
        `Actor type '${actor.actorType}' is not allowed to trigger ` +
        `transition: ${currentStatus} → ${targetStatus}`
      );
    }

    // 상태별 타임스탬프 업데이트
    const now = new Date();
    switch (targetStatus) {
      case OrderRelayStatus.RELAYED:
        order.relayedAt = now;
        break;
      case OrderRelayStatus.CONFIRMED:
        order.confirmedAt = now;
        break;
      case OrderRelayStatus.SHIPPED:
        order.shippedAt = now;
        if (dto.shippingInfo) {
          order.shippingInfo = { ...order.shippingInfo, ...dto.shippingInfo };
        }
        break;
      case OrderRelayStatus.DELIVERED:
        order.deliveredAt = now;
        break;
    }

    order.status = targetStatus;
    const savedOrder = await this.orderRepository.save(order);

    // 상태 변경 로그 기록
    await this.createLog(savedOrder.id, {
      action: OrderRelayLogAction.STATUS_CHANGED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
      reason: dto.reason,
    });

    // 이벤트 발행
    this.eventEmitter.emit('orderRelay.statusChanged', {
      order: savedOrder,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    });

    return savedOrder;
  }

  /**
   * 로그 조회
   */
  async findLogs(orderRelayId: string): Promise<OrderRelayLog[]> {
    return await this.logRepository.find({
      where: { orderRelayId },
      order: { createdAt: 'DESC' },
    });
  }

  // === Legacy methods for backward compatibility ===

  /**
   * @deprecated Use updateStatus() instead
   */
  async relayToSupplier(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.RELAYED;
    order.relayedAt = new Date();
    const savedOrder = await this.orderRepository.save(order);
    this.eventEmitter.emit('order.relay.dispatched', savedOrder);
    return savedOrder;
  }

  /**
   * @deprecated Use updateStatus() instead
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
   * @deprecated Use updateStatus() instead
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
   * @deprecated Use updateStatus() instead
   */
  async deliverOrder(id: string): Promise<OrderRelay> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderRelayStatus.DELIVERED;
    order.deliveredAt = new Date();
    const savedOrder = await this.orderRepository.save(order);
    this.eventEmitter.emit('order.relay.fulfilled', savedOrder);
    return savedOrder;
  }

  /**
   * @deprecated Use updateStatus() instead
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
   * @deprecated Use updateStatus() instead
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
   * 로그 생성 (내부)
   */
  private async createLog(
    orderRelayId: string,
    data: {
      action: OrderRelayLogAction;
      previousStatus?: OrderRelayStatus;
      newStatus?: OrderRelayStatus;
      actor: ActorInfo;
      reason?: string;
      previousData?: Record<string, any>;
      newData?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<OrderRelayLog> {
    const log = this.logRepository.create({
      orderRelayId,
      action: data.action,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      actor: data.actor.actorId,
      actorType: data.actor.actorType,
      reason: data.reason,
      previousData: data.previousData,
      newData: data.newData,
      metadata: data.metadata,
    });

    return await this.logRepository.save(log);
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
