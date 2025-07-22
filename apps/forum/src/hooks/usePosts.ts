import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  ForumPost, 
  PostFormData, 
  PostFilters,
  LikeResponse 
} from '@o4o/forum-types';
import type { Pagination } from '@o4o/types';

interface PostsResponse {
  posts: ForumPost[];
  pagination: Pagination;
}

// 게시글 목록 조회 (무한 스크롤)
export function useInfinitePosts(filters?: PostFilters) {
  return useInfiniteQuery<PostsResponse>({
    queryKey: ['forum-posts', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', String(pageParam));
      params.append('limit', String(filters?.limit || 20));
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'page' && key !== 'limit') {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, String(value));
            }
          }
        });
      }
      
      const response = await authClient.api.get(`/api/forum/posts?${params}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { current, totalPages } = lastPage.pagination;
      return current < totalPages ? current + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

// 게시글 목록 조회 (페이지네이션)
export function usePosts(filters?: PostFilters) {
  return useQuery<PostsResponse>({
    queryKey: ['forum-posts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, String(value));
            }
          }
        });
      }
      
      const response = await authClient.api.get(`/api/forum/posts?${params}`);
      return response.data;
    },
  });
}

// 단일 게시글 조회
export function usePost(slug: string) {
  return useQuery<ForumPost>({
    queryKey: ['forum-post', slug],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/forum/posts/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
}

// 게시글 생성
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation<ForumPost, Error, PostFormData>({
    mutationFn: async (data) => {
      const response = await authClient.api.post('/api/forum/posts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

// 게시글 수정
export function useUpdatePost(postId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<ForumPost, Error, Partial<PostFormData>>({
    mutationFn: async (data) => {
      const response = await authClient.api.patch(`/api/forum/posts/${postId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', data.slug] });
    },
  });
}

// 게시글 삭제
export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      await authClient.api.delete(`/api/forum/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

// 게시글 좋아요
export function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation<LikeResponse, Error, string>({
    mutationFn: async (postId) => {
      const response = await authClient.api.post(`/api/forum/posts/${postId}/like`);
      return response.data;
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
    },
  });
}

// 내 게시글 목록
export function useMyPosts(filters?: PostFilters) {
  return useQuery<PostsResponse>({
    queryKey: ['my-forum-posts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      
      const response = await authClient.api.get(`/api/forum/my-posts?${params}`);
      return response.data;
    },
  });
}

// 인기 게시글
export function useTrendingPosts(limit: number = 5) {
  return useQuery<ForumPost[]>({
    queryKey: ['trending-posts', limit],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/forum/posts/trending?limit=${limit}`);
      return response.data;
    },
  });
}

// 최근 게시글
export function useRecentPosts(limit: number = 5) {
  return useQuery<ForumPost[]>({
    queryKey: ['recent-posts', limit],
    queryFn: async () => {
      const response = await authClient.api.get(`/api/forum/posts/recent?limit=${limit}`);
      return response.data;
    },
  });
}