import { authClient } from '@o4o/auth-client';
import { Product, ProductFilters, ProductsResponse, EcommerceApiResponse, ReviewsResponse } from '@o4o/types/ecommerce';

export const productsApi = {
  // Get all products with filters
  getProducts: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const response = await authClient.api.get<ProductsResponse>('/products', {
      params: filters
    });
    return response.data;
  },

  // Get single product
  getProduct: async (id: string): Promise<Product> => {
    const response = await authClient.api.get<Product>(`/products/${id}`);
    return response.data;
  },

  // Get product by slug
  getProductBySlug: async (slug: string): Promise<Product> => {
    const response = await authClient.api.get<Product>(`/products/slug/${slug}`);
    return response.data;
  },

  // Search products
  searchProducts: async (query: string): Promise<Product[]> => {
    const response = await authClient.api.get<Product[]>('/products/search', {
      params: { q: query }
    });
    return response.data;
  },

  // Get related products
  getRelatedProducts: async (productId: string, limit: number = 4): Promise<Product[]> => {
    const response = await authClient.api.get<Product[]>(`/products/${productId}/related`, {
      params: { limit }
    });
    return response.data;
  },

  // Get featured products
  getFeaturedProducts: async (limit: number = 8): Promise<Product[]> => {
    const response = await authClient.api.get<Product[]>('/products/featured', {
      params: { limit }
    });
    return response.data;
  },

  // Get products by category
  getProductsByCategory: async (categorySlug: string, filters?: ProductFilters): Promise<ProductsResponse> => {
    const response = await authClient.api.get<ProductsResponse>(`/categories/${categorySlug}/products`, {
      params: filters
    });
    return response.data;
  },

  // Create product review
  createReview: async (productId: string, data: {
    rating: number;
    comment: string;
    images?: string[];
  }): Promise<EcommerceApiResponse<{ id: string }>> => {
    const response = await authClient.api.post<EcommerceApiResponse<{ id: string }>>(`/products/${productId}/reviews`, data);
    return response.data;
  },

  // Get product reviews
  getReviews: async (productId: string, page: number = 1, limit: number = 10): Promise<ReviewsResponse> => {
    const response = await authClient.api.get<ReviewsResponse>(`/products/${productId}/reviews`, {
      params: { page, limit }
    });
    return response.data;
  }
};