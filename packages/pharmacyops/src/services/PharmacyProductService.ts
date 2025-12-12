/**
 * PharmacyProductService
 *
 * 약국용 의약품 조회 서비스
 * pharmaceutical-core의 PharmaProduct를 래핑
 *
 * @package @o4o/pharmacyops
 */

import { Injectable } from '@nestjs/common';
import type {
  PharmacyProductDto,
  PharmacyProductListItemDto,
} from '../dto/index.js';

export interface ProductSearchParams {
  query?: string;
  category?: 'otc' | 'etc' | 'quasi_drug';
  therapeuticCategory?: string;
  manufacturer?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductSearchResult {
  items: PharmacyProductListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PharmacyProductService {
  /**
   * 의약품 목록 조회
   * productType: PHARMACEUTICAL 만 필터링
   */
  async list(params: ProductSearchParams): Promise<ProductSearchResult> {
    const { page = 1, limit = 20 } = params;

    // TODO: Implement with pharmaceutical-core PharmaProductService
    // - productType: 'PHARMACEUTICAL' 필터 적용
    // - 약국에 공개된 상품만 조회

    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * 의약품 상세 조회
   */
  async detail(productId: string): Promise<PharmacyProductDto | null> {
    // TODO: Implement with pharmaceutical-core
    return null;
  }

  /**
   * 의약품 코드로 조회
   */
  async findByDrugCode(drugCode: string): Promise<PharmacyProductDto | null> {
    // TODO: Implement drug code search
    return null;
  }

  /**
   * 품목허가번호로 조회
   */
  async findByPermitNumber(
    permitNumber: string,
  ): Promise<PharmacyProductDto | null> {
    // TODO: Implement permit number search
    return null;
  }

  /**
   * 성분명으로 검색
   */
  async searchByIngredient(
    ingredientName: string,
    params?: ProductSearchParams,
  ): Promise<ProductSearchResult> {
    const { page = 1, limit = 20 } = params || {};

    // TODO: Implement ingredient search
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * 치료 카테고리별 조회
   */
  async listByTherapeuticCategory(
    category: string,
    params?: ProductSearchParams,
  ): Promise<ProductSearchResult> {
    const { page = 1, limit = 20 } = params || {};

    // TODO: Implement category filter
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}
