/**
 * Forum API 서비스
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

export const forumApi = {
  // 카테고리
  getCategories: () =>
    apiClient.get<ApiResponse<ForumCategory[]>>('/forum/categories'),

  getCategory: (id: string) =>
    apiClient.get<ApiResponse<ForumCategory>>(`/forum/categories/${id}`),

  // 게시글
  getPosts: (params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<ForumPost>>('/forum/posts', params),

  getPost: (id: string) =>
    apiClient.get<ApiResponse<ForumPost>>(`/forum/posts/${id}`),

  createPost: (data: CreatePostRequest) =>
    apiClient.post<ApiResponse<ForumPost>>('/forum/posts', data),

  updatePost: (id: string, data: Partial<CreatePostRequest>) =>
    apiClient.put<ApiResponse<ForumPost>>(`/forum/posts/${id}`, data),

  deletePost: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/forum/posts/${id}`),

  likePost: (id: string) =>
    apiClient.post<ApiResponse<{ likeCount: number }>>(`/forum/posts/${id}/like`),

  // 댓글
  getComments: (postId: string) =>
    apiClient.get<ApiResponse<ForumComment[]>>(`/forum/posts/${postId}/comments`),

  createComment: (postId: string, content: string, parentId?: string) =>
    apiClient.post<ApiResponse<ForumComment>>(`/forum/posts/${postId}/comments`, {
      content,
      parentId,
    }),

  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<ApiResponse<void>>(`/forum/posts/${postId}/comments/${commentId}`),
};
