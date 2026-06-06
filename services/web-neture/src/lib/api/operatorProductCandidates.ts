/**
 * Operator Product Candidate API client — Phase 5
 *
 * WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1
 *
 * Phase 3 backend API (/api/v1/operator/product-candidates) 를 호출한다.
 * 신규 backend 변경 없음 — 기존 운영자 API 사용.
 *
 * 타입은 backend 엔티티(ProductCandidate)와 정렬되며, @o4o/types 미정의이므로 로컬 선언.
 */
import { api } from '../apiClient';

export type ProductCandidateSourceType =
  | 'supplier_web'
  | 'pharmacy_web'
  | 'store_web'
  | 'mobile_draft'
  | 'csv_import'
  | 'xlsx_import'
  | 'operator_import'
  | 'external_api'
  | 'unknown';

export type ProductCandidateStatus =
  | 'pending'
  | 'reviewing'
  | 'matched'
  | 'approved_new_master'
  | 'rejected'
  | 'merged'
  | 'archived';

export type ProductCandidateMatchStatus =
  | 'unmatched'
  | 'exact_identifier_match'
  | 'possible_identifier_match'
  | 'possible_text_match'
  | 'conflict'
  | 'no_match'
  | 'manually_matched';

export interface ProductCandidate {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  sourceType: ProductCandidateSourceType;
  sourceId: string | null;
  sourceLabel: string | null;
  submittedBy: string | null;
  candidateStatus: ProductCandidateStatus;
  matchStatus: ProductCandidateMatchStatus;
  matchedProductMasterId: string | null;
  matchedIdentifierId: string | null;
  confidenceScore: string | null;
  identifierType: string | null;
  identifierValue: string | null;
  normalizedIdentifierValue: string | null;
  candidateName: string | null;
  candidateBrand: string | null;
  candidateManufacturer: string | null;
  candidateCategory: string | null;
  candidateSpec: string | null;
  candidateUnit: string | null;
  candidateImageUrl: string | null;
  candidatePrice: string | null;
  rawPayload: Record<string, unknown> | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCandidateListFilter {
  status?: ProductCandidateStatus;
  matchStatus?: ProductCandidateMatchStatus;
  sourceType?: ProductCandidateSourceType;
  serviceKey?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export interface ProductCandidateListResult {
  items: ProductCandidate[];
  total: number;
}

const BASE = '/operator/product-candidates';

export const operatorProductCandidateApi = {
  /** GET /operator/product-candidates — 후보 목록 (scope 는 backend 가 적용) */
  async list(filter: ProductCandidateListFilter = {}): Promise<ProductCandidateListResult> {
    try {
      const params: Record<string, string | number> = {};
      if (filter.status) params.status = filter.status;
      if (filter.matchStatus) params.matchStatus = filter.matchStatus;
      if (filter.sourceType) params.sourceType = filter.sourceType;
      if (filter.serviceKey) params.serviceKey = filter.serviceKey;
      if (filter.organizationId) params.organizationId = filter.organizationId;
      if (filter.page) params.page = filter.page;
      if (filter.limit) params.limit = filter.limit;
      const res = await api.get(BASE, { params });
      const data = res.data?.data ?? {};
      return { items: data.items ?? [], total: data.total ?? 0 };
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[ProductCandidate API] list failed:', error);
      return { items: [], total: 0 };
    }
  },

  /** GET /operator/product-candidates/:id */
  async get(id: string): Promise<ProductCandidate | null> {
    try {
      const res = await api.get(`${BASE}/${id}`);
      return res.data?.data ?? null;
    } catch (error) {
      console.warn('[ProductCandidate API] get failed:', error);
      return null;
    }
  },

  /** POST /:id/match — Identifier Core 매칭 재시도 */
  async match(id: string): Promise<ProductCandidate | null> {
    const res = await api.post(`${BASE}/${id}/match`);
    return res.data?.data ?? null;
  },

  /** POST /:id/manual-match — 기존 ProductMaster 수동 연결 */
  async manualMatch(id: string, productMasterId: string): Promise<ProductCandidate | null> {
    const res = await api.post(`${BASE}/${id}/manual-match`, { productMasterId });
    return res.data?.data ?? null;
  },

  /** POST /:id/reject */
  async reject(id: string, reason?: string): Promise<ProductCandidate | null> {
    const res = await api.post(`${BASE}/${id}/reject`, { reason });
    return res.data?.data ?? null;
  },

  /** POST /:id/archive */
  async archive(id: string): Promise<ProductCandidate | null> {
    const res = await api.post(`${BASE}/${id}/archive`);
    return res.data?.data ?? null;
  },
};
