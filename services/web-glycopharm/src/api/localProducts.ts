/**
 * Local Product API Client — Store Display Domain
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * Service-scoped API: /api/v1/glycopharm/store/local-products
 * WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
 *   서비스 중립 경로(`/api/v1/store/local-products`)는 다중 조직 사용자에게 타 서비스
 *   조직을 선택할 수 있어, 같은 My Store 문맥의 handled-products 와 다른 매장을 보게 된다.
 *   서비스 스코프 경로(`/api/v1/glycopharm/store/local-products`)로 이전한다 — 백엔드에서 serviceKey 로 조직을 확정한다.
 * Local Products are Display Domain only — NOT Commerce Objects.
 */

import { api } from '@/lib/apiClient';

// ==================== Types ====================

export type BadgeType = 'none' | 'new' | 'recommend' | 'event';

export interface LocalProduct {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  /**
   * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
   *   매장 상품 상세 설명의 canonical 저장 위치. 목록 응답은 raw SQL snake_case,
   *   POST/PUT 응답은 entity camelCase 이므로 소비처에서 둘 다 수용한다.
   */
  detail_html?: string | null;
  detailHtml?: string | null;
  category: string | null;
  price_display: string | null;
  thumbnail_url: string | null;
  images: string[];
  gallery_images: string[];
  badge_type: BadgeType;
  highlight_flag: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocalProductInput {
  name: string;
  description?: string;
  summary?: string;
  /** WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1: 매장 소유 상세 설명 (부분 업데이트) */
  detailHtml?: string;
  category?: string;
  priceDisplay?: string;
  thumbnailUrl?: string;
  images?: string[];
  galleryImages?: string[];
  badgeType?: BadgeType;
  highlightFlag?: boolean;
  sortOrder?: number;
}

export interface LocalProductListResponse {
  success: boolean;
  data: {
    items: LocalProduct[];
    total: number;
    page: number;
    limit: number;
  };
}

// ==================== CRUD ====================

export async function fetchLocalProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  activeOnly?: string;
  highlightOnly?: string;
}): Promise<{ items: LocalProduct[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.category) qs.set('category', params.category);
  if (params?.activeOnly !== undefined) qs.set('activeOnly', params.activeOnly);
  if (params?.highlightOnly) qs.set('highlightOnly', params.highlightOnly);

  const query = qs.toString();
  const res = await api.get(`/glycopharm/store/local-products${query ? `?${query}` : ''}`);
  return res.data?.data;
}

/**
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1
 * 매장 자체 상품 단건 조회 (organization 격리). canonical POP 화면의 local prefill 전용.
 * 다른 조직 상품·미존재 → 404.
 */
export async function getLocalProduct(id: string): Promise<LocalProduct> {
  const res = await api.get(`/glycopharm/store/local-products/${id}`);
  return res.data?.data;
}

export async function createLocalProduct(
  data: LocalProductInput,
): Promise<LocalProduct> {
  const res = await api.post('/glycopharm/store/local-products', data);
  return res.data?.data;
}

export async function updateLocalProduct(
  id: string,
  data: Partial<LocalProductInput>,
): Promise<LocalProduct> {
  const res = await api.put(`/glycopharm/store/local-products/${id}`, data);
  return res.data?.data;
}

export async function deleteLocalProduct(id: string): Promise<void> {
  await api.delete(`/glycopharm/store/local-products/${id}`);
}
