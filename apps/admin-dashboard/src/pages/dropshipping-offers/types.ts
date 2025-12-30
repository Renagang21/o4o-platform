/**
 * Offer Types
 *
 * OpenAPI 계약 기반 타입 정의
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export type OfferStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface OfferSummary {
  id: string;
  name: string;
  description?: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfferDetail extends OfferSummary {
  // Add detail-specific fields here
  metadata?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface OfferListResponse {
  data: OfferSummary[];
  meta: PaginationMeta;
}

export interface OfferDetailResponse {
  data: OfferDetail;
}
