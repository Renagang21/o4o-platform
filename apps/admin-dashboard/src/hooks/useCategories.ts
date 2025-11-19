import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  count?: number;
  parent?: Category | null;
  children?: Category[];
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

/**
 * Fetch all categories with product counts
 */
export const useCategories = (): UseQueryResult<CategoriesResponse> => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/categories');
      return response.data as CategoriesResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch single category by ID
 */
export const useCategory = (id: string): UseQueryResult<Category> => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/categories/${id}`);
      return response.data.data as Category;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};
