/**
 * Pharmacy Event Receiver
 *
 * PharmacyOps에서 발생하는 이벤트를 수신하여 Partner-Core에 기록합니다.
 *
 * IMPORTANT: PHARMACEUTICAL 제품 이벤트는 수신하지 않습니다.
 * PharmacyOps에서 이미 필터링되어 오지만, 여기서도 이중 검증합니다.
 *
 * @package @o4o/partner-core
 */

import { Repository } from 'typeorm';
import { PartnerConversion, ConversionSource, ConversionStatus } from '../entities/PartnerConversion.entity.js';
import { Partner } from '../entities/Partner.entity.js';
import { executeValidatePartnerVisibility } from '../partner-extension.js';

// PharmacyOps 이벤트 타입 정의 (pharmacyops에서 import 없이 정의)
export interface PharmacyEventPayload {
  type: string;
  pharmacyId: string;
  productId: string;
  productType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PharmacyOrderEventPayload extends PharmacyEventPayload {
  type: 'order.created' | 'order.completed' | 'order.cancelled';
  orderId: string;
  orderNumber: string;
  productName?: string;
  offerId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  sessionId?: string;
}

// 파트너 프로그램 제외 제품 타입
const EXCLUDED_PRODUCT_TYPES = ['pharmaceutical'];

/**
 * 제품 타입이 파트너 프로그램에서 제외되는지 확인
 */
function isExcludedProductType(productType: string): boolean {
  return EXCLUDED_PRODUCT_TYPES.includes(productType.toLowerCase());
}

/**
 * 약국 전환 기록 DTO
 */
export interface CreatePharmacyConversionDto {
  pharmacyId: string;
  orderId: string;
  orderNumber?: string;
  productId: string;
  productType: string;
  orderAmount: number;
  metadata?: Record<string, any>;
}

/**
 * 약국 활동 요약
 */
export interface PharmacyActivitySummary {
  pharmacyId: string;
  totalConversions: number;
  totalOrderAmount: number;
  byProductType: Record<string, { count: number; amount: number }>;
  recentConversions: Array<{
    id: string;
    orderId: string;
    productType: string;
    orderAmount: number;
    createdAt: Date;
  }>;
}

/**
 * PharmacyEventReceiver
 *
 * PharmacyOps 이벤트를 수신하여 Partner-Core 전환으로 기록합니다.
 */
export class PharmacyEventReceiver {
  private isEnabled = false;
  private eventUnsubscribers: (() => void)[] = [];

  constructor(
    private conversionRepository: Repository<PartnerConversion>,
    private partnerRepository: Repository<Partner>,
  ) {}

  /**
   * 이벤트 수신 활성화
   *
   * @param onPartnerEvent PharmacyOps의 onPartnerEvent 함수
   */
  enable(onPartnerEvent: (handler: (event: any) => void) => () => void): void {
    if (this.isEnabled) return;

    // 파트너 이벤트 구독
    const unsubscribe = onPartnerEvent((event) => {
      this.handlePharmacyEvent(event);
    });
    this.eventUnsubscribers.push(unsubscribe);

    this.isEnabled = true;
    console.log('[PharmacyEventReceiver] Enabled');
  }

  /**
   * 이벤트 수신 비활성화
   */
  disable(): void {
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
    this.isEnabled = false;
    console.log('[PharmacyEventReceiver] Disabled');
  }

  /**
   * 약국 이벤트 처리
   */
  private async handlePharmacyEvent(event: PharmacyEventPayload): Promise<void> {
    try {
      // 1. PHARMACEUTICAL 제품 이중 검증 (PharmacyOps에서 이미 필터링됨)
      if (isExcludedProductType(event.productType)) {
        console.log(
          `[PharmacyEventReceiver] Skipping excluded product type: ${event.productType}`
        );
        return;
      }

      // 2. Extension Hook 검증
      const visibilityResult = await executeValidatePartnerVisibility({
        partnerId: 'pharmacy', // 약국은 파트너가 아니므로 'pharmacy' 사용
        productType: event.productType,
        targetType: 'pharmacy_event',
        targetId: event.pharmacyId,
        metadata: event.metadata,
      });

      if (!visibilityResult.visible) {
        console.log(
          `[PharmacyEventReceiver] Event blocked by visibility hook: ${visibilityResult.reason}`
        );
        return;
      }

      // 3. 이벤트 타입별 처리
      switch (event.type) {
        case 'order.created':
          await this.handleOrderCreated(event as PharmacyOrderEventPayload);
          break;
        case 'order.completed':
          await this.handleOrderCompleted(event as PharmacyOrderEventPayload);
          break;
        case 'order.cancelled':
          await this.handleOrderCancelled(event as PharmacyOrderEventPayload);
          break;
        // product.viewed, product.clicked는 클릭 기록용으로 별도 처리 가능
        default:
          console.log(`[PharmacyEventReceiver] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('[PharmacyEventReceiver] Error handling event:', error);
    }
  }

  /**
   * 주문 생성 이벤트 처리
   */
  private async handleOrderCreated(event: PharmacyOrderEventPayload): Promise<void> {
    // 중복 체크
    const existing = await this.conversionRepository.findOne({
      where: {
        orderId: event.orderId,
        conversionSource: ConversionSource.PHARMACY,
      },
    });

    if (existing) {
      console.log(`[PharmacyEventReceiver] Duplicate order conversion: ${event.orderId}`);
      return;
    }

    // Pharmacy 전환 생성
    const conversion = this.conversionRepository.create({
      partnerId: 'pharmacy-system', // 약국 시스템용 가상 파트너 ID
      pharmacyId: event.pharmacyId,
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      productType: event.productType,
      orderAmount: event.totalAmount,
      commissionAmount: 0, // 약국 전환은 커미션 없음 (활동 기록용)
      status: ConversionStatus.PENDING,
      conversionSource: ConversionSource.PHARMACY,
      metadata: {
        ...event.metadata,
        productId: event.productId,
        productName: event.productName,
        offerId: event.offerId,
        supplierId: event.supplierId,
        quantity: event.quantity,
        unitPrice: event.unitPrice,
        sessionId: event.sessionId,
      },
    });

    await this.conversionRepository.save(conversion);
    console.log(
      `[PharmacyEventReceiver] Created pharmacy conversion: ${conversion.id} for order ${event.orderId}`
    );
  }

  /**
   * 주문 완료 이벤트 처리
   */
  private async handleOrderCompleted(event: PharmacyOrderEventPayload): Promise<void> {
    const conversion = await this.conversionRepository.findOne({
      where: {
        orderId: event.orderId,
        conversionSource: ConversionSource.PHARMACY,
      },
    });

    if (!conversion) {
      console.log(`[PharmacyEventReceiver] Conversion not found for order: ${event.orderId}`);
      return;
    }

    conversion.status = ConversionStatus.CONFIRMED;
    conversion.confirmedAt = new Date();

    await this.conversionRepository.save(conversion);
    console.log(`[PharmacyEventReceiver] Confirmed pharmacy conversion: ${conversion.id}`);
  }

  /**
   * 주문 취소 이벤트 처리
   */
  private async handleOrderCancelled(event: PharmacyOrderEventPayload): Promise<void> {
    const conversion = await this.conversionRepository.findOne({
      where: {
        orderId: event.orderId,
        conversionSource: ConversionSource.PHARMACY,
      },
    });

    if (!conversion) {
      console.log(`[PharmacyEventReceiver] Conversion not found for order: ${event.orderId}`);
      return;
    }

    conversion.status = ConversionStatus.CANCELLED;
    conversion.cancellationReason = (event.metadata as any)?.reason || 'Cancelled';

    await this.conversionRepository.save(conversion);
    console.log(`[PharmacyEventReceiver] Cancelled pharmacy conversion: ${conversion.id}`);
  }

  /**
   * 약국별 활동 요약 조회
   */
  async getPharmacyActivitySummary(
    pharmacyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PharmacyActivitySummary> {
    const qb = this.conversionRepository.createQueryBuilder('conversion');
    qb.where('conversion.pharmacyId = :pharmacyId', { pharmacyId });
    qb.andWhere('conversion.conversionSource = :source', {
      source: ConversionSource.PHARMACY,
    });

    if (startDate) {
      qb.andWhere('conversion.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    // 전체 통계
    const totalResult = await qb
      .clone()
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'amount')
      .getRawOne();

    // 제품 타입별 통계
    const productTypeStats = await qb
      .clone()
      .select('conversion.productType', 'productType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'amount')
      .groupBy('conversion.productType')
      .getRawMany();

    const byProductType: Record<string, { count: number; amount: number }> = {};
    for (const row of productTypeStats) {
      if (row.productType) {
        byProductType[row.productType] = {
          count: parseInt(row.count, 10),
          amount: parseFloat(row.amount),
        };
      }
    }

    // 최근 전환 목록
    const recentConversions = await qb
      .clone()
      .orderBy('conversion.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      pharmacyId,
      totalConversions: parseInt(totalResult?.count || '0', 10),
      totalOrderAmount: parseFloat(totalResult?.amount || '0'),
      byProductType,
      recentConversions: recentConversions.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        productType: c.productType || 'unknown',
        orderAmount: Number(c.orderAmount),
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * 파트너 관점에서 약국 활동 조회 (PartnerOps UI용)
   */
  async getPharmacyActivitiesForPartner(
    filters: {
      productType?: string;
      startDate?: Date;
      endDate?: Date;
      status?: ConversionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    items: Array<{
      id: string;
      pharmacyId: string;
      orderId: string;
      orderNumber?: string;
      productType?: string;
      orderAmount: number;
      status: ConversionStatus;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, productType, startDate, endDate, status } = filters;

    const qb = this.conversionRepository.createQueryBuilder('conversion');
    qb.where('conversion.conversionSource = :source', {
      source: ConversionSource.PHARMACY,
    });

    // PHARMACEUTICAL 제외 (이중 확인)
    qb.andWhere('conversion.productType NOT IN (:...excluded)', {
      excluded: EXCLUDED_PRODUCT_TYPES,
    });

    if (productType) {
      qb.andWhere('conversion.productType = :productType', { productType });
    }
    if (startDate) {
      qb.andWhere('conversion.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('conversion.createdAt <= :endDate', { endDate });
    }
    if (status) {
      qb.andWhere('conversion.status = :status', { status });
    }

    qb.orderBy('conversion.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((c) => ({
        id: c.id,
        pharmacyId: c.pharmacyId || '',
        orderId: c.orderId,
        orderNumber: c.orderNumber,
        productType: c.productType,
        orderAmount: Number(c.orderAmount),
        status: c.status,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 약국 활동 통계 (PartnerOps 대시보드용)
   */
  async getPharmacyActivityStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalPharmacies: number;
    totalConversions: number;
    totalOrderAmount: number;
    byProductType: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, number>;
  }> {
    const qb = this.conversionRepository.createQueryBuilder('conversion');
    qb.where('conversion.conversionSource = :source', {
      source: ConversionSource.PHARMACY,
    });
    qb.andWhere('conversion.productType NOT IN (:...excluded)', {
      excluded: EXCLUDED_PRODUCT_TYPES,
    });

    if (startDate) {
      qb.andWhere('conversion.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    // 고유 약국 수
    const pharmacyCountResult = await qb
      .clone()
      .select('COUNT(DISTINCT conversion.pharmacyId)', 'count')
      .getRawOne();

    // 전체 통계
    const totalResult = await qb
      .clone()
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'amount')
      .getRawOne();

    // 제품 타입별
    const productTypeStats = await qb
      .clone()
      .select('conversion.productType', 'productType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(conversion.orderAmount), 0)', 'amount')
      .groupBy('conversion.productType')
      .getRawMany();

    const byProductType: Record<string, { count: number; amount: number }> = {};
    for (const row of productTypeStats) {
      if (row.productType) {
        byProductType[row.productType] = {
          count: parseInt(row.count, 10),
          amount: parseFloat(row.amount),
        };
      }
    }

    // 상태별
    const statusStats = await qb
      .clone()
      .select('conversion.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('conversion.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusStats) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      totalPharmacies: parseInt(pharmacyCountResult?.count || '0', 10),
      totalConversions: parseInt(totalResult?.count || '0', 10),
      totalOrderAmount: parseFloat(totalResult?.amount || '0'),
      byProductType,
      byStatus,
    };
  }
}
