/**
 * PharmaOrderService
 *
 * 의약품 B2B 주문 관리 서비스
 *
 * ## E-commerce Core 통합 (Phase 5)
 *
 * 이 서비스는 E-commerce Core와 연계하여 동작합니다.
 *
 * ### 권장 주문 흐름 (TO-BE)
 *
 * ```
 * 1. E-commerce Core에서 EcommerceOrder 생성
 *    - orderType: 'b2b'
 *    - EcommerceOrderService.createOrder()
 *
 * 2. PharmaOrder 생성 시 연결
 *    - ecommerceOrderId: EcommerceOrder.id
 *    - create({ ...data, ecommerceOrderId })
 *
 * 3. 판매 원장(E-commerce Core) + B2B 정보(여기) 조합으로 조회
 * ```
 *
 * ### 주요 연계 포인트
 *
 * | 관심사 | 담당 모듈 |
 * |--------|----------|
 * | 판매 원장 (Source of Truth) | E-commerce Core |
 * | OrderType 결정 | 이 서비스 (항상 'b2b') |
 * | B2B 주문 상세 관리 | 이 서비스 |
 * | 통합 통계 | EcommerceOrderQueryService |
 *
 * ### ecommerceOrderId 사용
 *
 * PharmaOrder.ecommerceOrderId를 통해 E-commerce Core의
 * EcommerceOrder와 연결됩니다. 이 필드가 null인 경우는
 * 레거시 주문 또는 직접 API를 통한 주문입니다.
 *
 * @package @o4o/pharmaceutical-core
 */

import { Repository } from 'typeorm';
import {
  PharmaOrder,
  PharmaOrderStatus,
  PharmaPaymentStatus,
} from '../entities/PharmaOrder.entity.js';
import { PharmaOfferService } from './PharmaOfferService.js';

export interface CreatePharmaOrderDto {
  offerId: string;
  pharmacyId: string;
  quantity: number;
  requestedDeliveryDate?: Date;
  shippingInfo: {
    address: string;
    zipCode: string;
    contactName: string;
    contactPhone: string;
    specialInstructions?: string;
  };
  notes?: string;
  metadata?: Record<string, any>;
  // Phase 5: E-commerce Core 연결
  ecommerceOrderId?: string;
}

export interface UpdatePharmaOrderDto {
  status?: PharmaOrderStatus;
  paymentStatus?: PharmaPaymentStatus;
  trackingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
  notes?: string;
  cancellationReason?: string;
}

export interface PharmaOrderFilter {
  pharmacyId?: string;
  supplierId?: string;
  offerId?: string;
  status?: PharmaOrderStatus;
  paymentStatus?: PharmaPaymentStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class PharmaOrderService {
  constructor(
    private orderRepository: Repository<PharmaOrder>,
    private offerService: PharmaOfferService
  ) {}

  /**
   * 주문 번호 생성
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PHM-${dateStr}-${random}`;
  }

  /**
   * 주문 생성
   */
  async create(data: CreatePharmaOrderDto): Promise<PharmaOrder> {
    // Offer 조회 및 검증
    const offer = await this.offerService.findById(data.offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // 재고 검증
    if (offer.stockQuantity < data.quantity) {
      throw new Error('Insufficient stock');
    }

    // 최소/최대 주문 수량 검증
    if (data.quantity < offer.minOrderQuantity) {
      throw new Error(`Minimum order quantity is ${offer.minOrderQuantity}`);
    }
    if (offer.maxOrderQuantity && data.quantity > offer.maxOrderQuantity) {
      throw new Error(`Maximum order quantity is ${offer.maxOrderQuantity}`);
    }

    // 가격 계산
    let unitPrice = Number(offer.supplierPrice);
    let discountAmount = 0;

    // 대량 구매 할인 적용
    if (
      offer.bulkDiscountRate &&
      offer.bulkDiscountThreshold &&
      data.quantity >= offer.bulkDiscountThreshold
    ) {
      discountAmount =
        unitPrice * data.quantity * (Number(offer.bulkDiscountRate) / 100);
    }

    const totalAmount = unitPrice * data.quantity - discountAmount;

    // 주문 생성
    const order = this.orderRepository.create({
      offerId: data.offerId,
      pharmacyId: data.pharmacyId,
      orderNumber: this.generateOrderNumber(),
      quantity: data.quantity,
      unitPrice,
      discountAmount,
      totalAmount,
      requestedDeliveryDate: data.requestedDeliveryDate,
      shippingInfo: data.shippingInfo,
      notes: data.notes,
      metadata: data.metadata,
      status: PharmaOrderStatus.PENDING,
      paymentStatus: PharmaPaymentStatus.PENDING,
      // Phase 5: E-commerce Core 연결
      ecommerceOrderId: data.ecommerceOrderId,
    });

    const savedOrder = await this.orderRepository.save(order);

    // 재고 차감
    await this.offerService.decreaseStock(data.offerId, data.quantity);

    return savedOrder;
  }

  /**
   * 주문 조회 (ID)
   */
  async findById(id: string): Promise<PharmaOrder | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['offer', 'offer.product'],
    });
  }

  /**
   * 주문 조회 (주문번호)
   */
  async findByOrderNumber(orderNumber: string): Promise<PharmaOrder | null> {
    return this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['offer', 'offer.product'],
    });
  }

  /**
   * E-commerce Order ID로 조회 (Phase 5)
   *
   * E-commerce Core의 EcommerceOrder와 연결된 PharmaOrder를 조회합니다.
   *
   * @param ecommerceOrderId - E-commerce Core의 주문 ID
   */
  async findByEcommerceOrderId(
    ecommerceOrderId: string
  ): Promise<PharmaOrder | null> {
    return this.orderRepository.findOne({
      where: { ecommerceOrderId },
      relations: ['offer', 'offer.product'],
    });
  }

  /**
   * 약국별 주문 목록
   */
  async findByPharmacyId(
    pharmacyId: string,
    filter: Omit<PharmaOrderFilter, 'pharmacyId'> = {}
  ): Promise<{
    items: PharmaOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ ...filter, pharmacyId });
  }

  /**
   * 공급자별 주문 목록
   */
  async findBySupplierId(
    supplierId: string,
    filter: Omit<PharmaOrderFilter, 'supplierId'> = {}
  ): Promise<{
    items: PharmaOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ ...filter, supplierId });
  }

  /**
   * 주문 목록 조회
   */
  async findAll(filter: PharmaOrderFilter = {}): Promise<{
    items: PharmaOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...where } = filter;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.offer', 'offer')
      .leftJoinAndSelect('offer.product', 'product');

    if (where.pharmacyId) {
      qb.andWhere('order.pharmacyId = :pharmacyId', {
        pharmacyId: where.pharmacyId,
      });
    }

    if (where.supplierId) {
      qb.andWhere('offer.supplierId = :supplierId', {
        supplierId: where.supplierId,
      });
    }

    if (where.offerId) {
      qb.andWhere('order.offerId = :offerId', { offerId: where.offerId });
    }

    if (where.status) {
      qb.andWhere('order.status = :status', { status: where.status });
    }

    if (where.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: where.paymentStatus,
      });
    }

    if (where.startDate) {
      qb.andWhere('order.createdAt >= :startDate', {
        startDate: where.startDate,
      });
    }

    if (where.endDate) {
      qb.andWhere('order.createdAt <= :endDate', { endDate: where.endDate });
    }

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 주문 상태 업데이트
   */
  async updateStatus(
    id: string,
    status: PharmaOrderStatus,
    additionalData?: Partial<UpdatePharmaOrderDto>
  ): Promise<PharmaOrder | null> {
    const order = await this.findById(id);
    if (!order) return null;

    order.status = status;

    // 상태별 타임스탬프 업데이트
    const now = new Date();
    switch (status) {
      case PharmaOrderStatus.CONFIRMED:
        order.confirmedAt = now;
        break;
      case PharmaOrderStatus.SHIPPED:
        order.shippedAt = now;
        break;
      case PharmaOrderStatus.DELIVERED:
        order.deliveredAt = now;
        break;
    }

    if (additionalData) {
      if (additionalData.trackingInfo) {
        order.trackingInfo = additionalData.trackingInfo;
      }
      if (additionalData.cancellationReason) {
        order.cancellationReason = additionalData.cancellationReason;
      }
      if (additionalData.notes) {
        order.notes = additionalData.notes;
      }
    }

    return this.orderRepository.save(order);
  }

  /**
   * 결제 상태 업데이트
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PharmaPaymentStatus
  ): Promise<PharmaOrder | null> {
    const order = await this.findById(id);
    if (!order) return null;

    order.paymentStatus = paymentStatus;
    if (paymentStatus === PharmaPaymentStatus.PAID) {
      order.paidAt = new Date();
    }

    return this.orderRepository.save(order);
  }

  /**
   * 주문 취소
   */
  async cancel(id: string, reason: string): Promise<PharmaOrder | null> {
    const order = await this.findById(id);
    if (!order) return null;

    // 이미 배송중이거나 완료된 주문은 취소 불가
    if (
      [
        PharmaOrderStatus.SHIPPED,
        PharmaOrderStatus.IN_TRANSIT,
        PharmaOrderStatus.DELIVERED,
      ].includes(order.status)
    ) {
      throw new Error('Cannot cancel order that is already shipped or delivered');
    }

    // 재고 복구
    await this.offerService.updateStock(
      order.offerId,
      (await this.offerService.findById(order.offerId))!.stockQuantity +
        order.quantity
    );

    return this.updateStatus(id, PharmaOrderStatus.CANCELLED, {
      cancellationReason: reason,
    });
  }

  /**
   * 주문 통계 (약국별)
   */
  async getPharmacyStats(pharmacyId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalAmount: number;
    averageOrderAmount: number;
  }> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .where('order.pharmacyId = :pharmacyId', { pharmacyId });

    const totalOrders = await qb.getCount();

    const pendingOrders = await qb
      .clone()
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          PharmaOrderStatus.PENDING,
          PharmaOrderStatus.CONFIRMED,
          PharmaOrderStatus.PREPARING,
        ],
      })
      .getCount();

    const completedOrders = await qb
      .clone()
      .andWhere('order.status = :status', {
        status: PharmaOrderStatus.DELIVERED,
      })
      .getCount();

    const amountResult = await qb
      .clone()
      .select('SUM(order.totalAmount)', 'total')
      .addSelect('AVG(order.totalAmount)', 'average')
      .getRawOne();

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalAmount: parseFloat(amountResult?.total || '0'),
      averageOrderAmount: parseFloat(amountResult?.average || '0'),
    };
  }
}
