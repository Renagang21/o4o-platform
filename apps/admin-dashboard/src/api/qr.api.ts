/**
 * QR API Client
 *
 * WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
 *
 * QR 코드 생성 흐름:
 * - 공급자 상품 직접 선택 → QR 생성 (신규)
 * - 기존 StoreLibraryItem 기반 흐름 유지 (호환)
 */

import { authClient } from '@o4o/auth-client';

// ============================================
// Types
// ============================================

export interface QrSourceProduct {
  id: string;
  name: string;
  brandName: string | null;
  price: number;
  description: string | null;
}

export interface QrSourceProductListResponse {
  items: QrSourceProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface QrCode {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  description: string | null;
  libraryItemId: string | null;
  landingType: string;
  landingTargetId: string | null;
  slug: string;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QrListResponse {
  items: QrCode[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateQrPayload {
  title: string;
  description?: string;
  type?: string;
  landingType: 'product' | 'promotion' | 'page' | 'link';
  /** 공급자 상품 직접 연결 (WO-STORE-QR-PRODUCT-DIRECT-LINK-V1) */
  productId?: string;
  /** 기존 landingTargetId 방식 (호환) */
  landingTargetId?: string;
  libraryItemId?: string;
  slug: string;
}

// ============================================
// API
// ============================================

export const qrApi = {
  /**
   * 공급자 상품 목록 조회 (QR 직접 연결용)
   * WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
   */
  async listSourceProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<QrSourceProductListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);

    const response = await authClient.api.get<any>(
      `/api/v1/pharmacy/qr/source/products?${query.toString()}`,
    );
    const data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    };
  },

  /**
   * 내 QR 코드 목록
   */
  async list(params?: { page?: number; limit?: number }): Promise<QrListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const response = await authClient.api.get<any>(
      `/api/v1/pharmacy/qr?${query.toString()}`,
    );
    const data = response.data?.data;
    return {
      items: data?.items || [],
      total: data?.total || 0,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    };
  },

  /**
   * QR 코드 생성
   */
  async create(payload: CreateQrPayload): Promise<QrCode> {
    const response = await authClient.api.post<any>('/api/v1/pharmacy/qr', payload);
    return response.data?.data;
  },

  /**
   * QR 코드 삭제 (soft-delete)
   */
  async remove(id: string): Promise<void> {
    await authClient.api.delete(`/api/v1/pharmacy/qr/${id}`);
  },

  /**
   * QR 이미지 다운로드 (Blob)
   */
  async downloadImage(id: string, format: 'png' | 'svg' = 'png', size = 256): Promise<Blob> {
    const response = await authClient.api.get<Blob>(
      `/api/v1/pharmacy/qr/${id}/image?format=${format}&size=${size}`,
      { responseType: 'blob' } as any,
    );
    return response.data as unknown as Blob;
  },

  /**
   * QR 전단지 PDF 다운로드 (Blob)
   */
  async downloadFlyer(id: string, template: 1 | 4 | 8 = 1): Promise<Blob> {
    const response = await authClient.api.get<Blob>(
      `/api/v1/pharmacy/qr/${id}/flyer?template=${template}`,
      { responseType: 'blob' } as any,
    );
    return response.data as unknown as Blob;
  },
};
