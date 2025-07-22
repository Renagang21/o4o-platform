import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  ForumStatistics, 
  CategoryStatistics, 
  UserForumStatistics 
} from '@o4o/forum-types';

// 포럼 전체 통계
export function useForumStats() {
  return useQuery<ForumStatistics>({
    queryKey: ['forum-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/api/forum/stats');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 카테고리별 통계
export function useCategoryStats(categoryId: string) {
  return useQuery<CategoryStatistics>({
    queryKey: ['category-stats', categoryId],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/forum/categories/${categoryId}/stats`);
      return response.data;
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 사용자 포럼 통계
export function useUserForumStats(userId?: string) {
  return useQuery<UserForumStatistics>({
    queryKey: ['user-forum-stats', userId],
    queryFn: async () => {
      const endpoint = userId 
        ? `/api/forum/users/${userId}/stats`
        : '/api/forum/my-stats';
      const response = await authClient.api.get(endpoint);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}