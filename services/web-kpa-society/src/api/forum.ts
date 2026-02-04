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
 * Other routes → /forum (community scope)
 */
function getForumBasePath(): string {
  if (typeof window !== 'undefined') {
    const isDemoRoute = window.location.pathname.startsWith('/demo/');
    return isDemoRoute ? '/demo-forum' : '/forum';
  }
  return '/forum'; // SSR fallback
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
};
