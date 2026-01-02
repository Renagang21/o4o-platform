/**
 * CosmeticsOrderService
 *
 * Cosmetics 도메인 전용 주문 생성 서비스
 *
 * H2-0: metadata.channel 기반 주문 생성 로직
 * H3-0: Travel Order + TaxRefund Flag Implementation
 * H3-1: Travel 주문 조회·필터링 기능
 *
 * ## 설계 원칙 (H1-2/H2-3 결정 준수)
 * - OrderType = RETAIL 고정
 * - 채널 분기 = metadata.channel ('local' | 'travel')
 * - Cosmetics Product = UUID 참조 + 스냅샷 (FK 없음)
 * - TaxRefund는 Order 단위, Amount 저장 금지 (H2-3)
 * - Travel 전용 필터: guideId, tourSessionId, taxRefund (H3-1)
 *
 * @since H2-0 (2025-01-02)
 * @updated H3-0 (2025-01-02) - TaxRefund validation
 * @updated H3-1 (2025-01-02) - Travel order filtering
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  EcommerceOrderService,
  CreateOrderDto,
  CreateOrderItemDto,
} from './EcommerceOrderService.js';
import { EcommerceOrder, OrderType } from '../entities/EcommerceOrder.entity.js';

// ============================================================================
// Type Definitions (H1-2 확정 스키마)
// ============================================================================

/**
 * 주문 채널
 */
export type OrderChannel = 'local' | 'travel';

/**
 * 수령 방식
 */
export type FulfillmentType = 'pickup' | 'delivery' | 'on-site';

/**
 * 세금환급 정보 (H2-3 확정 스키마)
 *
 * 핵심 원칙:
 * - amount 필드 없음 (정산 시 계산)
 * - eligible은 필수
 * - 외부 연동은 reference만
 */
export interface TaxRefundMeta {
  /** 환급 대상 여부 (필수) */
  eligible: boolean;
  /** 환급 방식 */
  scheme?: 'standard' | 'instant';
  /** 예상 환급 비율 (0~1) */
  estimatedRate?: number;
  /** 환급 사업자 코드 (외부 연동 시) */
  provider?: string;
  /** 외부 시스템 참조 ID */
  referenceId?: string;
  /** 환급 상태 */
  status?: 'pending' | 'requested' | 'completed' | 'rejected';
  /** 신청 시점 */
  requestedAt?: string;
  /** 완료 시점 */
  completedAt?: string;
}

/**
 * Travel 채널 전용 메타데이터
 */
export interface TravelChannelMeta {
  guideId: string;
  guideName?: string;
  tourSessionId?: string;
  tourDate?: string;
  groupSize?: number;
  taxRefund?: TaxRefundMeta;
}

/**
 * Local 채널 전용 메타데이터
 */
export interface LocalChannelMeta {
  sampleExperienced?: boolean;
  reservationId?: string;
}

/**
 * 커미션 추적 메타데이터
 */
export interface CommissionMeta {
  partnerId?: string;
  referralCode?: string;
  rate?: number;
}

/**
 * Cosmetics 주문 메타데이터 표준 스키마
 */
export interface CosmeticsOrderMetadata {
  channel: OrderChannel;
  fulfillment?: FulfillmentType;
  storeId?: string;
  storeName?: string;
  travel?: TravelChannelMeta;
  local?: LocalChannelMeta;
  commission?: CommissionMeta;
}

/**
 * 상품 스냅샷 (OrderItem.metadata에 저장)
 */
export interface ProductSnapshot {
  brandId?: string;
  brandName?: string;
  lineId?: string;
  lineName?: string;
  images?: Array<{ url: string; alt?: string }>;
}

/**
 * Cosmetics 주문 아이템 DTO
 */
export interface CreateCosmeticsOrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  sku?: string;
  options?: Record<string, any>;
  productSnapshot?: ProductSnapshot;
}

/**
 * Cosmetics 주문 생성 DTO
 */
export interface CreateCosmeticsOrderDto {
  buyerId: string;
  sellerId: string;
  items: CreateCosmeticsOrderItemDto[];
  metadata: CosmeticsOrderMetadata;
  shippingAddress?: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
  shippingFee?: number;
  discount?: number;
}

// ============================================================================
// Validation Errors
// ============================================================================

const VALIDATION_ERRORS = {
  CHANNEL_REQUIRED: 'metadata.channel is required',
  INVALID_CHANNEL: 'metadata.channel must be "local" or "travel"',
  TRAVEL_GUIDE_REQUIRED: 'metadata.travel.guideId is required for travel channel',
  LOCAL_HAS_TRAVEL_FIELDS: 'Local channel order cannot have travel-specific fields',
  TRAVEL_HAS_LOCAL_FIELDS: 'Travel channel order cannot have local-specific fields',
  ITEMS_REQUIRED: 'At least one order item is required',
  ITEM_PRODUCT_ID_REQUIRED: 'productId is required for each item',
  ITEM_PRODUCT_NAME_REQUIRED: 'productName is required for each item',
  ITEM_QUANTITY_INVALID: 'quantity must be greater than 0',
  ITEM_UNIT_PRICE_INVALID: 'unitPrice must be greater than or equal to 0',
  // H3-0: TaxRefund validation errors
  TAXREFUND_ELIGIBLE_REQUIRED: 'metadata.travel.taxRefund.eligible is required when taxRefund is provided',
  TAXREFUND_AMOUNT_FORBIDDEN: 'metadata.travel.taxRefund.amount is not allowed (H2-3: Rate-based only)',
  TAXREFUND_INVALID_SCHEME: 'metadata.travel.taxRefund.scheme must be "standard" or "instant"',
  TAXREFUND_INVALID_RATE: 'metadata.travel.taxRefund.estimatedRate must be between 0 and 1',
  TAXREFUND_INVALID_STATUS: 'metadata.travel.taxRefund.status must be one of: pending, requested, completed, rejected',
} as const;

// ============================================================================
// Service Implementation
// ============================================================================

@Injectable()
export class CosmeticsOrderService {
  constructor(private readonly orderService: EcommerceOrderService) {}

  /**
   * Cosmetics 주문 생성
   *
   * H2-0 핵심 로직:
   * 1. metadata.channel 필수 검증
   * 2. 채널별 필드 검증 (Local/Travel)
   * 3. OrderItem 스냅샷 보장
   * 4. OrderType = RETAIL 고정
   */
  async createOrder(dto: CreateCosmeticsOrderDto): Promise<EcommerceOrder> {
    // 1. 공통 검증
    this.validateCommon(dto);

    // 2. 채널별 검증
    if (dto.metadata.channel === 'local') {
      this.validateLocalChannel(dto.metadata);
    } else if (dto.metadata.channel === 'travel') {
      this.validateTravelChannel(dto.metadata);
    }

    // 3. 아이템 검증
    this.validateItems(dto.items);

    // 4. EcommerceOrderService로 위임 (OrderType = RETAIL 고정)
    const orderDto = this.mapToCreateOrderDto(dto);
    return await this.orderService.create(orderDto);
  }

  /**
   * 공통 검증
   */
  private validateCommon(dto: CreateCosmeticsOrderDto): void {
    // channel 필수
    if (!dto.metadata?.channel) {
      throw new BadRequestException(VALIDATION_ERRORS.CHANNEL_REQUIRED);
    }

    // channel 값 검증
    if (!['local', 'travel'].includes(dto.metadata.channel)) {
      throw new BadRequestException(VALIDATION_ERRORS.INVALID_CHANNEL);
    }

    // items 필수
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(VALIDATION_ERRORS.ITEMS_REQUIRED);
    }
  }

  /**
   * Local 채널 검증
   */
  private validateLocalChannel(metadata: CosmeticsOrderMetadata): void {
    // Travel 전용 필드가 있으면 에러
    if (metadata.travel) {
      throw new BadRequestException(VALIDATION_ERRORS.LOCAL_HAS_TRAVEL_FIELDS);
    }
  }

  /**
   * Travel 채널 검증
   */
  private validateTravelChannel(metadata: CosmeticsOrderMetadata): void {
    // guideId 필수
    if (!metadata.travel?.guideId) {
      throw new BadRequestException(VALIDATION_ERRORS.TRAVEL_GUIDE_REQUIRED);
    }

    // Local 전용 필드가 있으면 에러
    if (metadata.local) {
      throw new BadRequestException(VALIDATION_ERRORS.TRAVEL_HAS_LOCAL_FIELDS);
    }

    // H3-0: TaxRefund 검증
    if (metadata.travel.taxRefund) {
      this.validateTaxRefund(metadata.travel.taxRefund);
    }
  }

  /**
   * TaxRefund 검증 (H3-0)
   *
   * H2-3 결정 준수:
   * - eligible 필수
   * - amount 필드 금지
   * - estimatedRate는 0~1 범위
   */
  private validateTaxRefund(taxRefund: TaxRefundMeta & { amount?: number }): void {
    // eligible 필수
    if (typeof taxRefund.eligible !== 'boolean') {
      throw new BadRequestException(VALIDATION_ERRORS.TAXREFUND_ELIGIBLE_REQUIRED);
    }

    // amount 필드 금지 (H2-3: Rate-based only)
    if ('amount' in taxRefund && taxRefund.amount !== undefined) {
      throw new BadRequestException(VALIDATION_ERRORS.TAXREFUND_AMOUNT_FORBIDDEN);
    }

    // scheme 검증
    if (taxRefund.scheme && !['standard', 'instant'].includes(taxRefund.scheme)) {
      throw new BadRequestException(VALIDATION_ERRORS.TAXREFUND_INVALID_SCHEME);
    }

    // estimatedRate 범위 검증
    if (taxRefund.estimatedRate !== undefined) {
      if (typeof taxRefund.estimatedRate !== 'number' ||
          taxRefund.estimatedRate < 0 ||
          taxRefund.estimatedRate > 1) {
        throw new BadRequestException(VALIDATION_ERRORS.TAXREFUND_INVALID_RATE);
      }
    }

    // status 검증
    const validStatuses = ['pending', 'requested', 'completed', 'rejected'];
    if (taxRefund.status && !validStatuses.includes(taxRefund.status)) {
      throw new BadRequestException(VALIDATION_ERRORS.TAXREFUND_INVALID_STATUS);
    }
  }

  /**
   * 아이템 검증
   */
  private validateItems(items: CreateCosmeticsOrderItemDto[]): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.productId) {
        throw new BadRequestException(
          `Item[${i}]: ${VALIDATION_ERRORS.ITEM_PRODUCT_ID_REQUIRED}`
        );
      }

      if (!item.productName) {
        throw new BadRequestException(
          `Item[${i}]: ${VALIDATION_ERRORS.ITEM_PRODUCT_NAME_REQUIRED}`
        );
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException(
          `Item[${i}]: ${VALIDATION_ERRORS.ITEM_QUANTITY_INVALID}`
        );
      }

      if (item.unitPrice === undefined || item.unitPrice < 0) {
        throw new BadRequestException(
          `Item[${i}]: ${VALIDATION_ERRORS.ITEM_UNIT_PRICE_INVALID}`
        );
      }
    }
  }

  /**
   * CreateCosmeticsOrderDto -> CreateOrderDto 변환
   *
   * 핵심:
   * - OrderType = RETAIL 고정
   * - productSnapshot을 item.metadata에 저장
   */
  private mapToCreateOrderDto(dto: CreateCosmeticsOrderDto): CreateOrderDto {
    return {
      buyerId: dto.buyerId,
      sellerId: dto.sellerId,
      orderType: OrderType.RETAIL, // Cosmetics = RETAIL 고정
      shippingAddress: dto.shippingAddress,
      shippingFee: dto.shippingFee,
      discount: dto.discount,
      currency: 'KRW',
      metadata: dto.metadata as Record<string, any>,
      items: dto.items.map((item) => this.mapToOrderItemDto(item)),
    };
  }

  /**
   * CreateCosmeticsOrderItemDto -> CreateOrderItemDto 변환
   *
   * 스냅샷 보장:
   * - productName, unitPrice는 주문 시점 값으로 고정
   * - productSnapshot은 metadata에 저장
   */
  private mapToOrderItemDto(item: CreateCosmeticsOrderItemDto): CreateOrderItemDto {
    return {
      productId: item.productId,
      productName: item.productName, // 스냅샷
      quantity: item.quantity,
      unitPrice: item.unitPrice, // 스냅샷
      discount: item.discount,
      sku: item.sku,
      options: item.options,
      metadata: item.productSnapshot
        ? { productSnapshot: item.productSnapshot }
        : undefined,
    };
  }

  /**
   * 채널별 주문 조회
   */
  async findByChannel(
    channel: OrderChannel,
    filters?: {
      sellerId?: string;
      buyerId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    // metadata.channel로 필터링은 EcommerceOrderQueryService에서 처리
    // 여기서는 RETAIL 타입으로 조회 후 channel 필터링
    const result = await this.orderService.findAll({
      ...filters,
      orderType: OrderType.RETAIL,
    });

    // channel 필터링
    const filteredOrders = result.orders.filter(
      (order) => (order.metadata as CosmeticsOrderMetadata)?.channel === channel
    );

    return {
      orders: filteredOrders,
      total: filteredOrders.length,
    };
  }

  /**
   * Travel 주문 조회 (H3-1)
   *
   * Travel 채널 전용 필터:
   * - guideId: 가이드 ID
   * - tourSessionId: 투어 세션 ID
   * - taxRefundEligible: 환급 대상 여부
   * - taxRefundStatus: 환급 상태
   */
  async findTravelOrders(
    filters: {
      sellerId?: string;
      buyerId?: string;
      guideId?: string;
      tourSessionId?: string;
      taxRefundEligible?: boolean;
      taxRefundStatus?: 'pending' | 'requested' | 'completed' | 'rejected';
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    // RETAIL 타입 + Travel 채널 조회
    const result = await this.orderService.findAll({
      sellerId: filters.sellerId,
      buyerId: filters.buyerId,
      orderType: OrderType.RETAIL,
      limit: filters.limit,
      offset: filters.offset,
    });

    // Travel 채널 + 추가 필터 적용
    const filteredOrders = result.orders.filter((order) => {
      const metadata = order.metadata as CosmeticsOrderMetadata;

      // Travel 채널만
      if (metadata?.channel !== 'travel') {
        return false;
      }

      // Order status 필터
      if (filters.status && order.status !== filters.status) {
        return false;
      }

      // Travel-specific filters
      if (metadata.travel) {
        // Guide ID 필터
        if (filters.guideId && metadata.travel.guideId !== filters.guideId) {
          return false;
        }

        // Tour Session ID 필터
        if (filters.tourSessionId && metadata.travel.tourSessionId !== filters.tourSessionId) {
          return false;
        }

        // Tax Refund Eligible 필터
        if (filters.taxRefundEligible !== undefined) {
          const isEligible = metadata.travel.taxRefund?.eligible === true;
          if (filters.taxRefundEligible !== isEligible) {
            return false;
          }
        }

        // Tax Refund Status 필터
        if (filters.taxRefundStatus) {
          if (metadata.travel.taxRefund?.status !== filters.taxRefundStatus) {
            return false;
          }
        }
      } else {
        // travel 메타데이터가 없는 경우 Travel 전용 필터가 있으면 제외
        if (filters.guideId || filters.tourSessionId ||
            filters.taxRefundEligible !== undefined || filters.taxRefundStatus) {
          return false;
        }
      }

      return true;
    });

    return {
      orders: filteredOrders,
      total: filteredOrders.length,
    };
  }

  /**
   * 환급 대상 주문 조회 (H3-1)
   *
   * 간편 메서드: taxRefundEligible=true인 Travel 주문만 조회
   */
  async findTaxRefundEligibleOrders(
    filters?: {
      sellerId?: string;
      buyerId?: string;
      taxRefundStatus?: 'pending' | 'requested' | 'completed' | 'rejected';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findTravelOrders({
      ...filters,
      taxRefundEligible: true,
    });
  }

  /**
   * 투어 세션별 주문 조회 (H3-1)
   *
   * 간편 메서드: 특정 투어 세션의 모든 주문 조회
   */
  async findOrdersByTourSession(
    tourSessionId: string,
    filters?: {
      sellerId?: string;
      buyerId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findTravelOrders({
      ...filters,
      tourSessionId,
    });
  }

  /**
   * 가이드별 주문 조회 (H3-1)
   *
   * 간편 메서드: 특정 가이드의 모든 Travel 주문 조회
   */
  async findOrdersByGuide(
    guideId: string,
    filters?: {
      sellerId?: string;
      buyerId?: string;
      taxRefundEligible?: boolean;
      taxRefundStatus?: 'pending' | 'requested' | 'completed' | 'rejected';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findTravelOrders({
      ...filters,
      guideId,
    });
  }
}
