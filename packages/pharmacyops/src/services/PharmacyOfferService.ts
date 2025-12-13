/**
 * PharmacyOfferService
 *
 * 약국용 도매 Offer 조회 서비스
 * pharmaceutical-core의 PharmaOffer를 래핑
 *
 * @package @o4o/pharmacyops
 */

import { Injectable } from '@nestjs/common';
import type {
  PharmacyOfferDto,
  PharmacyOfferListItemDto,
} from '../dto/index.js';

export interface OfferSearchParams {
  productId?: string;
  supplierId?: string;
  supplierType?: 'wholesaler' | 'manufacturer';
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  hasColdChain?: boolean;
  maxLeadTime?: number;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'leadTime' | 'stockQuantity' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface OfferSearchResult {
  items: PharmacyOfferListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PharmacyOfferService {
  /**
   * Offer 목록 조회
   * active 상태만 조회
   */
  async list(params: OfferSearchParams): Promise<OfferSearchResult> {
    const { page = 1, limit = 20 } = params;

    // TODO: Implement with pharmaceutical-core PharmaOfferService
    // - status: 'active' 필터 적용
    // - 약국에 공개된 offer만 조회

    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * Offer 상세 조회
   */
  async detail(offerId: string): Promise<PharmacyOfferDto | null> {
    // TODO: Implement with pharmaceutical-core
    return null;
  }

  /**
   * 상품별 Offer 목록 조회
   */
  async listByProduct(
    productId: string,
    params?: OfferSearchParams,
  ): Promise<OfferSearchResult> {
    return this.list({ ...params, productId });
  }

  /**
   * 공급자별 Offer 목록 조회
   */
  async listBySupplier(
    supplierId: string,
    params?: OfferSearchParams,
  ): Promise<OfferSearchResult> {
    return this.list({ ...params, supplierId });
  }

  /**
   * 최저가 Offer 조회
   */
  async findLowestPriceOffer(productId: string): Promise<PharmacyOfferDto | null> {
    // TODO: Implement lowest price search
    return null;
  }

  /**
   * 당일/익일 배송 가능 Offer 조회
   */
  async listFastDeliveryOffers(
    productId: string,
    deliveryType: 'sameDay' | 'nextDay',
  ): Promise<PharmacyOfferListItemDto[]> {
    // TODO: Implement fast delivery filter
    return [];
  }

  /**
   * 콜드체인 가능 Offer 조회
   */
  async listColdChainOffers(productId: string): Promise<PharmacyOfferListItemDto[]> {
    // TODO: Implement cold chain filter
    return [];
  }

  /**
   * Offer 가격 비교
   */
  async comparePrices(
    productId: string,
    quantity: number,
  ): Promise<
    Array<{
      offer: PharmacyOfferListItemDto;
      unitPrice: number;
      totalPrice: number;
      discountApplied: boolean;
    }>
  > {
    // TODO: Implement price comparison with bulk discount calculation
    return [];
  }
}
