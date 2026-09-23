/**
 * Public Product API - Categories, Brands, Images, Library Search
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from './client.js';
import type { AdminMaster } from './admin.js';

// WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
export interface MasterSearchResult {
  id: string;
  /**
   * WO-O4O-COSMETICS-SUPPLIER-PRODUCT-REGISTER-AND-EDIT-BROWSER-SMOKE-V1:
   * 서버는 barcode 가 없는 master(화장품 32,674 전량 포함)를 null 로 반환한다. 타입을 실제 응답에 맞춘다.
   */
  barcode: string | null;
  /** 서버 응답 필드명은 `name` 이다(marketingName 은 응답에 없다). */
  name: string;
  regulatoryName: string;
  /** 등록 화면 유형 prefill 용 — 서버 additive 필드 */
  regulatoryType?: string | null;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
}

export interface MasterSearchResponse {
  data: MasterSearchResult[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  isRegulated: boolean;
  children: CategoryTreeItem[];
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  type: 'thumbnail' | 'detail' | 'content';
}

export const productApi = {
  async getCategories(): Promise<CategoryTreeItem[]> {
    try {
      const response = await api.get('/neture/categories');
      return response.data.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch categories:', error);
      return [];
    }
  },

  async getBrands(): Promise<BrandItem[]> {
    try {
      const response = await api.get('/neture/brands');
      return response.data.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch brands:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await api.get(`/neture/masters/barcode/${encodeURIComponent(barcode)}`);
      return response.data.data || null;
    } catch (error) {
      console.warn('[Product API] Failed to fetch master by barcode:', error);
      if ((error as any)?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.7:
   *   Master 단건 조회 — 기존 GET /neture/products/library/:id (requireAuth · 공급자도 호출 가능) 재사용.
   *   from-master 화면의 새로고침·직접 진입 hydration 용. 응답을 MasterSearchResult 로 정규화한다.
   *   404 → null (존재하지 않는 masterId). 그 외 오류는 throw (조회 실패를 '없음'으로 오인하지 않게).
   */
  async getMasterById(masterId: string): Promise<MasterSearchResult | null> {
    try {
      const response = await api.get(`/neture/products/library/${encodeURIComponent(masterId)}`);
      const d = response.data?.data;
      if (!d) return null;
      const images: Array<{ imageUrl: string; isPrimary: boolean }> = Array.isArray(d.images) ? d.images : [];
      const primary = images.find((img) => img.isPrimary) ?? images[0] ?? null;
      return {
        id: d.id,
        barcode: d.barcode ?? null,
        name: d.name ?? d.regulatoryName ?? '',
        regulatoryName: d.regulatoryName ?? '',
        regulatoryType: d.regulatoryType ?? null,
        manufacturerName: d.manufacturerName ?? '',
        specification: d.specification ?? null,
        category: d.category ? { id: d.category.id, name: d.category.name } : null,
        brand: d.brand ? { id: d.brand.id, name: d.brand.name } : null,
        primaryImageUrl: primary?.imageUrl ?? null,
      };
    } catch (error) {
      if ((error as any)?.response?.status === 404) return null;
      console.warn('[Product API] Failed to fetch master by id:', error);
      throw error;
    }
  },

  async getProductImages(masterId: string): Promise<ProductImage[]> {
    try {
      const response = await api.get(`/neture/products/${masterId}/images`);
      return response.data.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch product images:', error);
      return [];
    }
  },

  async uploadProductImage(
    masterId: string,
    file: File,
    type: 'thumbnail' | 'detail' | 'content' = 'detail'
  ): Promise<{ success: boolean; data?: ProductImage; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      const response = await api.post(`/neture/products/${masterId}/images`, formData, {
        timeout: 30000,
        // WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
        //   axios 인스턴스 기본 헤더가 'application/json' 이라 FormData 에도 그대로 실려
        //   서버가 multipart 본문을 JSON 으로 파싱해 400 이 났다.
        //   undefined 로 지우면 브라우저가 boundary 를 포함한 multipart 헤더를 만든다.
        headers: { 'Content-Type': undefined },
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  /** WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 공용 미디어 라이브러리 URL로 상품 이미지 등록 */
  async registerImageFromUrl(
    masterId: string,
    imageUrl: string,
    type: 'thumbnail' | 'detail' | 'content' = 'detail'
  ): Promise<{ success: boolean; data?: ProductImage; error?: string }> {
    try {
      const response = await api.post(`/neture/products/${masterId}/images/from-url`, { imageUrl, type });
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async setPrimaryImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      await api.patch(`/neture/products/images/${imageId}/primary`, { masterId });
      return true;
    } catch {
      return false;
    }
  },

  async deleteProductImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      await api.delete(`/neture/products/images/${imageId}`, {
        data: { masterId },
      });
      return true;
    } catch {
      return false;
    }
  },

  // WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
  async searchMasters(params: {
    q?: string;
    categoryId?: string;
    brandId?: string;
    page?: number;
    limit?: number;
  }): Promise<MasterSearchResponse> {
    try {
      const sp = new URLSearchParams();
      if (params.q) sp.set('q', params.q);
      if (params.categoryId) sp.set('categoryId', params.categoryId);
      if (params.brandId) sp.set('brandId', params.brandId);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await api.get(`/neture/products/library/search${qs}`);
      const result = response.data;
      return {
        data: result.data || [],
        meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.warn('[Product API] Failed to search masters:', error);
      throw error;
    }
  },

  // WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §E-1 (2026-09-23):
  //   AI 태그 클라이언트 6종(regenerate·suggest·get·manual·manual/batch·delete) 제거.
  //   공급자 표면이 유일한 소비처였고, 이 경로는 product_masters.tags 동기화로 이어졌다.
  //   backend /products/:id/ai-tags/* 는 운영자·매장 축을 위해 유지된다(§F 로 supplier write 는 deny).
};
