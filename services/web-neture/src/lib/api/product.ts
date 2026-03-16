/**
 * Public Product API - Categories, Brands, Images, Library Search
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
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
}

export const productApi = {
  async getCategories(): Promise<CategoryTreeItem[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/categories`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch categories:', error);
      return [];
    }
  },

  async getBrands(): Promise<BrandItem[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/brands`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch brands:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/masters/barcode/${encodeURIComponent(barcode)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Product API] Failed to fetch master by barcode:', error);
      return null;
    }
  },

  async getProductImages(masterId: string): Promise<ProductImage[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/${masterId}/images`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Product API] Failed to fetch product images:', error);
      return [];
    }
  },

  async uploadProductImage(masterId: string, file: File): Promise<{ success: boolean; data?: ProductImage; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/${masterId}/images`,
        { method: 'POST', credentials: 'include', body: formData },
        30000,
      );
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async setPrimaryImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/images/${imageId}/primary`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ masterId }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  async deleteProductImage(imageId: string, masterId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/images/${imageId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ masterId }),
        },
      );
      return response.ok;
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

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/products/library/search${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      const result = await response.json();
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
