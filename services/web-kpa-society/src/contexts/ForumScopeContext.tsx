/**
 * ForumScopeContext
 *
 * WO-FORUM-DEMO-SCOPE-ISOLATION-V1
 *
 * Provides forum scope based on route context.
 * - /demo/forum routes → 'demo' scope (uses /demo-forum API)
 * - /forum routes → 'community' scope (uses /forum API)
 *
 * Forum pages use this context to determine which API endpoint to call.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import type {
  ForumCategory,
  ForumPost,
  ForumComment,
  CreatePostRequest,
  PaginatedResponse,
  ApiResponse,
} from '../types';

// ============================================================================
// Types
// ============================================================================

type ForumScope = 'community' | 'demo';

interface ForumApiMethods {
  // Categories
  getCategories: () => Promise<ApiResponse<ForumCategory[]>>;
  getCategory: (id: string) => Promise<ApiResponse<ForumCategory>>;

  // Posts
  getPosts: (params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => Promise<PaginatedResponse<ForumPost>>;
  getPost: (id: string) => Promise<ApiResponse<ForumPost>>;
  createPost: (data: CreatePostRequest) => Promise<ApiResponse<ForumPost>>;
  updatePost: (id: string, data: Partial<CreatePostRequest>) => Promise<ApiResponse<ForumPost>>;
  deletePost: (id: string) => Promise<ApiResponse<void>>;
  likePost: (id: string) => Promise<ApiResponse<{ likeCount: number }>>;

  // Comments
  getComments: (postId: string) => Promise<ApiResponse<ForumComment[]>>;
  createComment: (postId: string, content: string, parentId?: string) => Promise<ApiResponse<ForumComment>>;
  deleteComment: (postId: string, commentId: string) => Promise<ApiResponse<void>>;
}

interface ForumScopeContextValue {
  scope: ForumScope;
  api: ForumApiMethods;
  isDemoMode: boolean;
}

// ============================================================================
// Context
// ============================================================================

const ForumScopeContext = createContext<ForumScopeContextValue | null>(null);

// ============================================================================
// API Factory
// ============================================================================

function createForumApi(basePath: string): ForumApiMethods {
  return {
    // Categories
    getCategories: () =>
      apiClient.get<ApiResponse<ForumCategory[]>>(`${basePath}/categories`),
    getCategory: (id: string) =>
      apiClient.get<ApiResponse<ForumCategory>>(`${basePath}/categories/${id}`),

    // Posts
    getPosts: (params) =>
      apiClient.get<PaginatedResponse<ForumPost>>(`${basePath}/posts`, params),
    getPost: (id: string) =>
      apiClient.get<ApiResponse<ForumPost>>(`${basePath}/posts/${id}`),
    createPost: (data: CreatePostRequest) =>
      apiClient.post<ApiResponse<ForumPost>>(`${basePath}/posts`, data),
    updatePost: (id: string, data: Partial<CreatePostRequest>) =>
      apiClient.put<ApiResponse<ForumPost>>(`${basePath}/posts/${id}`, data),
    deletePost: (id: string) =>
      apiClient.delete<ApiResponse<void>>(`${basePath}/posts/${id}`),
    likePost: (id: string) =>
      apiClient.post<ApiResponse<{ likeCount: number }>>(`${basePath}/posts/${id}/like`),

    // Comments
    getComments: (postId: string) =>
      apiClient.get<ApiResponse<ForumComment[]>>(`${basePath}/posts/${postId}/comments`),
    createComment: (postId: string, content: string, parentId?: string) =>
      apiClient.post<ApiResponse<ForumComment>>(`${basePath}/posts/${postId}/comments`, {
        content,
        parentId,
      }),
    deleteComment: (postId: string, commentId: string) =>
      apiClient.delete<ApiResponse<void>>(`${basePath}/posts/${postId}/comments/${commentId}`),
  };
}

// ============================================================================
// Provider
// ============================================================================

interface ForumScopeProviderProps {
  children: ReactNode;
}

export function ForumScopeProvider({ children }: ForumScopeProviderProps) {
  const location = useLocation();

  const value = useMemo<ForumScopeContextValue>(() => {
    // 항상 community scope 사용 (베타 테스트 - 하드코딩 제거)
    const scope: ForumScope = 'community';
    const basePath = '/forum';

    return {
      scope,
      api: createForumApi(basePath),
      isDemoMode: false,
    };
  }, [location.pathname]);

  return (
    <ForumScopeContext.Provider value={value}>
      {children}
    </ForumScopeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useForumScope(): ForumScopeContextValue {
  const context = useContext(ForumScopeContext);
  if (!context) {
    throw new Error('useForumScope must be used within ForumScopeProvider');
  }
  return context;
}

/**
 * Hook to get the forum API with correct scope
 */
export function useForumApi(): ForumApiMethods {
  const { api } = useForumScope();
  return api;
}
