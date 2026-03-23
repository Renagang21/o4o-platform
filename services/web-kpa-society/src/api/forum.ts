/**
 * Forum API 서비스
 *
 * WO-FORUM-DEMO-SCOPE-ISOLATION-V1
 *
 * API base path는 현재 라우트에 따라 결정됨:
 * - /demo/* 경로 → /demo-forum API (데모 스코프, 빈 결과 반환)
 * - 그 외 경로 → /forum API (커뮤니티 스코프)
 */

import { apiClient } from './client';
import type {
  ForumCategory,
  ForumPost,
  ForumComment,
  CreatePostRequest,
  PaginatedResponse,
  ApiResponse,
} from '../types';

/**
 * Get forum API base path based on current route
 * /demo/* routes → /demo-forum (demo scope, returns empty)
 * Other routes → /forum (community scope, KPA 커뮤니티 글만)
 *
 * WO-FORUM-SCOPE-FIX: KPA-Society는 항상 /forum 사용
 * - /forum: scope='community' → organizationId IS NULL 글만
 * - API base URL already includes /api/v1/kpa prefix in client.ts
 *
 * Note: client.ts already adds /api/v1/kpa prefix, so we don't add /kpa/ here
 */
function getForumBasePath(): string {
  // 항상 community scope 사용 (베타 테스트 - 하드코딩 제거)
  return '/forum';
}

export const forumApi = {
  // 카테고리
  getCategories: () =>
    apiClient.get<ApiResponse<ForumCategory[]>>(`${getForumBasePath()}/categories`),

  getCategory: (id: string) =>
    apiClient.get<ApiResponse<ForumCategory>>(`${getForumBasePath()}/categories/${id}`),

  // 게시글
  getPosts: (params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<ForumPost>>(`${getForumBasePath()}/posts`, params),

  getPost: (id: string) =>
    apiClient.get<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts/${id}`),

  createPost: (data: CreatePostRequest) =>
    apiClient.post<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts`, data),

  updatePost: (id: string, data: Partial<CreatePostRequest>) =>
    apiClient.put<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts/${id}`, data),

  deletePost: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`${getForumBasePath()}/posts/${id}`),

  likePost: (id: string) =>
    apiClient.post<ApiResponse<{ likeCount: number }>>(`${getForumBasePath()}/posts/${id}/like`),

  // 댓글
  getComments: (postId: string) =>
    apiClient.get<ApiResponse<ForumComment[]>>(`${getForumBasePath()}/posts/${postId}/comments`),

  createComment: (postId: string, content: string, parentId?: string) =>
    apiClient.post<ApiResponse<ForumComment>>(`${getForumBasePath()}/posts/${postId}/comments`, {
      content,
      parentId,
    }),

  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<ApiResponse<void>>(`${getForumBasePath()}/posts/${postId}/comments/${commentId}`),

  // Owner routes — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
  getMyCategories: () =>
    apiClient.get<ApiResponse<ForumCategory[]>>(`${getForumBasePath()}/categories/mine`),

  updateMyCategory: (id: string, data: { name?: string; description?: string; iconEmoji?: string | null; iconUrl?: string | null }) =>
    apiClient.patch<ApiResponse<ForumCategory>>(`${getForumBasePath()}/categories/${id}/owner`, data),

  requestDeleteCategory: (id: string, data: { reason?: string }) =>
    apiClient.post<ApiResponse<void>>(`${getForumBasePath()}/categories/${id}/delete-request`, data),
};

// ============================================================================
// Category Request API — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
// Uses authClient.api (base: /api/v1) for common forum endpoints
// ============================================================================
import { authClient } from '@o4o/auth-client';

export const forumRequestApi = {
  getMyRequests: async (): Promise<{ success: boolean; data: any[] }> => {
    try {
      const response = await authClient.api.get('/forum/category-requests/my', {
        params: { serviceCode: 'kpa-society' },
      });
      return response.data;
    } catch {
      return { success: false, data: [] };
    }
  },

  create: async (data: { name: string; description: string; reason?: string }): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const response = await authClient.api.post('/forum/category-requests', {
        ...data,
        serviceCode: 'kpa-society',
      });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || '신청에 실패했습니다.';
      return { success: false, error: msg };
    }
  },
};
