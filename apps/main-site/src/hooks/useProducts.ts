import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/config/axios';
import { Product, ProductFilters } from '@/types/ecommerce';
import { PaginatedResponse, ApiResponse } from '@/types';

// Get products list
export const useProducts = (
  page = 1,
  limit = 20,
  filters: ProductFilters = {}
) => {
  return useQuery({
    queryKey: ['products', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await axiosInstance.get<PaginatedResponse<Product>>(
        `/api/v1/public/products?${params}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single product
export const useProduct = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiResponse<Product>>(
        `/api/v1/public/products/${productId}`
      );
      return response.data;
    },
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// Get featured products
export const useFeaturedProducts = (limit = 8) => {
  return useQuery({
    queryKey: ['featured-products', limit],
    queryFn: async () => {
      const response = await axiosInstance.get<PaginatedResponse<Product>>(
        `/api/v1/public/products?featured=true&limit=${limit}`
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get products by category
export const useProductsByCategory = (
  categorySlug: string,
  page = 1,
  limit = 20
) => {
  return useQuery({
    queryKey: ['products-by-category', categorySlug, page, limit],
    queryFn: async () => {
      const response = await axiosInstance.get<PaginatedResponse<Product>>(
        `/api/v1/public/products?category=${categorySlug}&page=${page}&limit=${limit}`
      );
      return response.data;
    },
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000,
  });
};

// Search products
export const useProductSearch = (
  searchTerm: string,
  page = 1,
  limit = 20
) => {
  return useQuery({
    queryKey: ['product-search', searchTerm, page, limit],
    queryFn: async () => {
      const response = await axiosInstance.get<PaginatedResponse<Product>>(
        `/api/v1/public/products?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`
      );
      return response.data;
    },
    enabled: searchTerm.length > 2, // Only search with 3+ characters
    staleTime: 3 * 60 * 1000,
  });
};