/**
 * useProducts Hook
 * React Query hook for fetching products
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  status: 'active' | 'draft' | 'archived';
  images?: Array<{
    url: string;
    alt?: string;
  }>;
  category?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsFilter {
  category?: string;
  featured?: boolean;
  status?: 'active' | 'draft' | 'archived';
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductResponse {
  success: boolean;
  data: Product;
}

/**
 * Fetch products list with pagination and filters
 */
export const useProducts = (
  page: number = 1,
  limit: number = 12,
  filters?: ProductsFilter
): UseQueryResult<ProductsResponse> => {
  return useQuery({
    queryKey: ['products', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      if (filters?.category) {
        params.set('category', filters.category);
      }
      if (filters?.featured !== undefined) {
        params.set('featured', String(filters.featured));
      }
      if (filters?.status) {
        params.set('status', filters.status);
      }

      const response = await authClient.api.get(`/products?${params.toString()}`);
      return response.data as ProductsResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch single product by ID
 */
export const useProduct = (productId: string): UseQueryResult<ProductResponse> => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await authClient.api.get(`/products/${productId}`);
      return response.data as ProductResponse;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
