import { authClient } from '@o4o/auth-client';
import { Category } from '@o4o/types/ecommerce';

export const categoriesApi = {
  // Get all categories
  getCategories: async (parentId?: string): Promise<Category[]> => {
    const response = await authClient.api.get<Category[]>('/categories', {
      params: { parentId }
    });
    return response.data;
  },

  // Get category by ID
  getCategory: async (id: string): Promise<Category> => {
    const response = await authClient.api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  // Get category by slug
  getCategoryBySlug: async (slug: string): Promise<Category> => {
    const response = await authClient.api.get<Category>(`/categories/slug/${slug}`);
    return response.data;
  },

  // Get category tree
  getCategoryTree: async (): Promise<Category[]> => {
    const response = await authClient.api.get<Category[]>('/categories/tree');
    return response.data;
  },

  // Get popular categories
  getPopularCategories: async (limit: number = 8): Promise<Category[]> => {
    const response = await authClient.api.get<Category[]>('/categories/popular', {
      params: { limit }
    });
    return response.data;
  }
};