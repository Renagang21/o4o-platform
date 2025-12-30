/**
 * Product Admin Types
 *
 * OpenAPI 계약 기반 타입 정의
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export type ProductStatus = 'draft' | 'visible' | 'hidden' | 'sold_out';

export interface CreateProductRequest {
  name: string;
  brand_id: string;
  line_id?: string;
  description?: string;
  base_price: number;
  sale_price?: number;
}

export interface UpdateProductRequest {
  name?: string;
  brand_id?: string;
  line_id?: string;
  description?: string;
  base_price?: number;
  sale_price?: number;
}

export interface UpdateStatusRequest {
  status: ProductStatus;
  reason?: string;
}

export interface StatusChangeResponse {
  data: {
    id: string;
    status: ProductStatus;
    previous_status: ProductStatus;
    changed_at: string;
    changed_by?: string;
  };
}
