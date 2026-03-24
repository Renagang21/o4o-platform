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
  barcode: string;
  marketingName: string;
  regulatoryName: string;
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
      return null;
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
      });
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
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },
};
