import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  ForumCategory, 
  CategoryFormData, 
  CategoryFilters 
} from '@o4o/forum-types';

// 카테고리 목록 조회
export function useCategories(filters?: CategoryFilters) {
  return useQuery<ForumCategory[]>({
    queryKey: ['forum-categories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      
      const response = await authClient.api.get(`/api/forum/categories?${params}`);
      return response.data;
    },
  });
}

// 단일 카테고리 조회
export function useCategory(slug: string) {
  return useQuery<ForumCategory>({
    queryKey: ['forum-category', slug],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/forum/categories/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
}

// 카테고리 생성 (관리자용)
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation<ForumCategory, Error, CategoryFormData>({
    mutationFn: async (data) => {
      const response = await authClient.api.post('/api/forum/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
    },
  });
}

// 카테고리 수정 (관리자용)
export function useUpdateCategory(categoryId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<ForumCategory, Error, Partial<CategoryFormData>>({
    mutationFn: async (data) => {
      const response = await authClient.api.patch(
        `/api/forum/categories/${categoryId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
      queryClient.invalidateQueries({ queryKey: ['forum-category', data.slug] });
    },
  });
}

// 카테고리 삭제 (관리자용)
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (categoryId) => {
      await authClient.api.delete(`/api/forum/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
    },
  });
}