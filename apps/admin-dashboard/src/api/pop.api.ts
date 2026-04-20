/**
 * POP API Client
 *
 * WO-STORE-POP-CREATION-RESTRUCTURE-V1
 *
 * 상품 기반 POP 제작 흐름:
 * - 상품 목록 조회
 * - AI 문구 생성 (pop_short / pop_long)
 * - AI 콘텐츠 조회
 * - PDF 다운로드
 */

import { authClient } from '@o4o/auth-client';

// ============================================
// Types
// ============================================

export interface ProductListItem {
  id: string;
  marketingName: string | null;
  regulatoryName: string | null;
  primaryImageUrl: string | null;
  brandName: string | null;
  categoryName: string | null;
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AiContent {
  id: string;
  productId: string;
  contentType: 'product_description' | 'pop_short' | 'pop_long' | 'qr_description' | 'signage_text';
  content: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PopLayout = 'A4' | 'A5';

// ============================================
// API
// ============================================

export const popApi = {
  /**
   * 상품 목록 조회 (POP 제작용)
   */
  async listProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ProductListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);

    const response = await authClient.api.get<any>(
      `/api/v1/operator/products?${query.toString()}`,
    );

    const data = response.data;

    // Normalize operator products response
    const rawItems: any[] = data?.items || data?.data?.items || data?.data || [];
    const items: ProductListItem[] = rawItems.map((r: any) => ({
      id: r.id,
      marketingName: r.marketingName || r.marketing_name || null,
      regulatoryName: r.regulatoryName || r.regulatory_name || null,
      primaryImageUrl: r.primaryImageUrl || r.primary_image_url || r.imageUrl || null,
      brandName: r.brandName || r.brand_name || null,
      categoryName: r.categoryName || r.category_name || null,
    }));

    return {
      items,
      total: data?.total || data?.data?.total || items.length,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    };
  },

  /**
   * AI 문구 생성 트리거 (fire-and-forget — 결과는 폴링으로 확인)
   */
  async generateAiContent(
    productId: string,
    type: 'pop_short' | 'pop_long',
  ): Promise<void> {
    await authClient.api.post(
      `/api/v1/products/${productId}/ai-contents/generate/${type}`,
      {},
    );
  },

  /**
   * 상품 AI 콘텐츠 전체 조회
   */
  async getAiContents(productId: string): Promise<AiContent[]> {
    const response = await authClient.api.get<any>(
      `/api/v1/products/${productId}/ai-contents`,
    );
    return response.data?.data || [];
  },

  /**
   * PDF URL 반환 (blob 다운로드용)
   */
  getPdfUrl(productId: string, layout: PopLayout, qrUrl?: string): string {
    const base = `/api/v1/products/${productId}/pop/${layout}`;
    const params = new URLSearchParams();
    if (qrUrl) params.set('qrUrl', qrUrl);
    return params.toString() ? `${base}?${params.toString()}` : base;
  },

  /**
   * PDF 다운로드 (Blob)
   */
  async downloadPdf(
    productId: string,
    layout: PopLayout,
    qrUrl?: string,
  ): Promise<Blob> {
    const url = this.getPdfUrl(productId, layout, qrUrl);
    const response = await authClient.api.get<Blob>(url, {
      responseType: 'blob',
    } as any);
    return response.data as unknown as Blob;
  },
};
