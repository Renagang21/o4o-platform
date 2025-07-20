import { authClient } from '@o4o/auth-client';
import { 
  SupplierProfile,
  SupplierPublicProfile,
  SupplierProfileFormData,
  SupplierStats,
  ProductsResponse,
  ProductFilters
} from '@o4o/types';

const API_URL = '/api/v1/suppliers';

export const suppliersApi = {
  // Get public supplier profile by slug
  getPublicProfile: async (slug: string): Promise<SupplierPublicProfile> => {
    const response = await authClient.api.get<SupplierPublicProfile>(`${API_URL}/shop/${slug}`);
    return response.data;
  },

  // Get supplier's public products
  getPublicProducts: async (supplierId: string, filters?: ProductFilters): Promise<ProductsResponse> => {
    const response = await authClient.api.get<ProductsResponse>(`${API_URL}/${supplierId}/products`, {
      params: filters
    });
    return response.data;
  },

  // Get current supplier's profile (authenticated)
  getMyProfile: async (): Promise<SupplierProfile> => {
    const response = await authClient.api.get<SupplierProfile>(`${API_URL}/profile`);
    return response.data;
  },

  // Update supplier profile
  updateProfile: async (data: SupplierProfileFormData): Promise<SupplierProfile> => {
    const response = await authClient.api.put<SupplierProfile>(`${API_URL}/profile`, data);
    return response.data;
  },

  // Upload logo
  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await authClient.api.post<{ url: string }>(`${API_URL}/profile/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  // Upload banner
  uploadBanner: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('banner', file);

    const response = await authClient.api.post<{ url: string }>(`${API_URL}/profile/banner`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  // Get supplier statistics
  getStats: async (): Promise<SupplierStats> => {
    const response = await authClient.api.get<SupplierStats>(`${API_URL}/stats`);
    return response.data;
  },

  // Check if slug is available
  checkSlugAvailability: async (slug: string): Promise<{ available: boolean }> => {
    const response = await authClient.api.get<{ available: boolean }>(`${API_URL}/check-slug/${slug}`);
    return response.data;
  },

  // Generate slug from store name
  generateSlug: async (storeName: string): Promise<{ slug: string }> => {
    const response = await authClient.api.post<{ slug: string }>(`${API_URL}/generate-slug`, { storeName });
    return response.data;
  }
};