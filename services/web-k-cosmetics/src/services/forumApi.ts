/**
 * Forum API Service - K-Cosmetics
 *
 * Based on web-neture/src/services/forumApi.ts
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';

// ============================================================================
// Types — imported from @o4o/types/forum (Single Source of Truth)
// Phase 19-B: Forum Frontend Type & API Contract 정합 리팩토링
// ============================================================================

import type {
  ForumPostResponse,
  ForumPostType,
  ForumCommentResponse,
  ForumAuthorResponse,
  ForumPaginationInfo,
  ForumListResponse,
  ForumSingleResponse,
} from '@o4o/types/forum';

// Re-export shared types
export type { ForumPostResponse, ForumPostType, ForumCommentResponse, ForumAuthorResponse };
export type { ForumPaginationInfo, ForumListResponse, ForumSingleResponse };

// Backward-compatible aliases
export type ForumPost = ForumPostResponse;
export type ForumComment = ForumCommentResponse;
export type PaginationInfo = ForumPaginationInfo;
export type PostType = ForumPostType;
export type PostsResponse = ForumListResponse<ForumPostResponse>;
export type PostResponse = ForumSingleResponse<ForumPostResponse>;
export type CommentsResponse = ForumListResponse<ForumCommentResponse>;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch forum posts with optional filters
 */
export async function fetchForumPosts(params: {
  categoryId?: string;
  page?: number;
  limit?: number;
  isPinned?: boolean;
}): Promise<PostsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/forum/posts?${queryParams}`);
    const data = response.data;

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch posts');
    }

    // Filter pinned if needed
    if (params.isPinned !== undefined) {
      data.data = data.data.filter((p: ForumPost) => p.isPinned === params.isPinned);
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, totalPages: 0 },
      totalCount: 0,
    };
  }
}

/**
 * Fetch pinned posts
 */
export async function fetchPinnedPosts(limit: number = 2): Promise<ForumPost[]> {
  const response = await fetchForumPosts({ isPinned: true, limit });
  return response.data;
}

/**
 * Fetch a single post by ID
 */
export async function fetchForumPostById(postId: string): Promise<PostResponse | null> {
  try {
    const response = await api.get(`/forum/posts/${postId}`);
    const data = response.data;

    if (!data.success) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return null;
  }
}

/**
 * Fetch comments for a post
 */
export async function fetchForumComments(postId: string): Promise<CommentsResponse> {
  try {
    const response = await api.get(`/forum/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, totalPages: 0 },
      totalCount: 0,
    };
  }
}

// ============================================================================
// Popular Forums
// ============================================================================

export interface PopularForum {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  color?: string | null;
  iconUrl?: string | null;
  postCount: number;
  popularScore: number;
  postCount7d: number;
  commentSum7d: number;
  viewSum7d: number;
}

export async function fetchPopularForums(limit: number = 6): Promise<{ success: boolean; data: PopularForum[] }> {
  try {
    const response = await api.get(`/forum/categories/popular?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching popular forums:', error);
    return { success: false, data: [] };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize post type from API response
 */
export function normalizePostType(type: string): ForumPostType {
  const normalized = type.toLowerCase();
  const valid: ForumPostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  if (valid.includes(normalized as ForumPostType)) {
    return normalized as ForumPostType;
  }
  return 'discussion';
}

/**
 * Get author name from post
 */
export function getAuthorName(post: ForumPost): string {
  return (post as any).authorName || post.author?.nickname || post.author?.name || '익명';
}

/**
 * Extract text content from Block[] or string
 */
export function extractTextContent(content: string | object[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block.type === 'paragraph' && block.content) {
          return block.content;
        }
        if (block.type === 'heading' && block.content) {
          return block.content;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

// ============================================================================
// Owner Category Management — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
// ============================================================================

export async function fetchMyCategories(): Promise<{ success: boolean; data: any[] }> {
  try {
    const response = await api.get('/forum/categories/mine');
    return response.data;
  } catch (error) {
    console.error('Error fetching my categories:', error);
    return { success: false, data: [] };
  }
}

export async function updateMyCategory(
  id: string,
  data: { name?: string; description?: string; iconEmoji?: string | null; iconUrl?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.patch(`/forum/categories/${id}/owner`, data);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '저장에 실패했습니다.';
    return { success: false, error: msg };
  }
}

export async function requestDeleteCategory(
  id: string,
  data: { reason?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.post(`/forum/categories/${id}/delete-request`, data);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '삭제 요청에 실패했습니다.';
    return { success: false, error: msg };
  }
}

export async function fetchMyForumRequests(): Promise<{ success: boolean; data: any[] }> {
  try {
    const response = await api.get('/forum/category-requests/my?serviceCode=k-cosmetics');
    return response.data;
  } catch (error) {
    console.error('Error fetching my forum requests:', error);
    return { success: false, data: [] };
  }
}

export async function createForumCategoryRequest(
  data: { name: string; description: string; reason?: string },
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await api.post('/forum/category-requests', {
      ...data,
      serviceCode: 'k-cosmetics',
    });
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '신청에 실패했습니다.';
    return { success: false, error: msg };
  }
}

// ============================================================================
// Operator Forum API — WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
// Common /api/v1/forum/operator/* endpoints (serviceCode=k-cosmetics)
// ============================================================================

const OPERATOR_BASE = '/forum/operator';
const SVC = 'serviceCode=k-cosmetics';

export const forumOperatorApi = {
  getRequests: async (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams({ serviceCode: 'k-cosmetics' });
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    try {
      const res = await api.get(`${OPERATOR_BASE}/requests?${query}`);
      return res.data;
    } catch {
      return { success: false, data: [], total: 0 };
    }
  },

  getPendingCount: async () => {
    try {
      const res = await api.get(`${OPERATOR_BASE}/requests/pending-count?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: { count: 0 } };
    }
  },

  getRequestDetail: async (id: string) => {
    try {
      const res = await api.get(`${OPERATOR_BASE}/requests/${id}?${SVC}`);
      return res.data;
    } catch {
      return { success: false, error: 'Failed to load detail' };
    }
  },

  review: async (id: string, data: { action: 'approve' | 'reject' | 'revision'; reviewComment?: string }) => {
    const res = await api.patch(`${OPERATOR_BASE}/requests/${id}/review?${SVC}`, data);
    return res.data;
  },

  getDeleteRequests: async (params?: { status?: string }) => {
    const query = new URLSearchParams({ serviceCode: 'k-cosmetics' });
    if (params?.status) query.set('status', params.status);
    try {
      const res = await api.get(`${OPERATOR_BASE}/delete-requests?${query}`);
      return res.data;
    } catch {
      return { success: true, data: [], count: 0 };
    }
  },

  getDeletePendingCount: async () => {
    try {
      const res = await api.get(`${OPERATOR_BASE}/delete-requests/pending-count?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: { count: 0 } };
    }
  },

  approveDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await api.post(`${OPERATOR_BASE}/delete-requests/${id}/approve?${SVC}`, data || {});
    return res.data;
  },

  rejectDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await api.post(`${OPERATOR_BASE}/delete-requests/${id}/reject?${SVC}`, data || {});
    return res.data;
  },
};

// ============================================================================
// Forum Analytics API — WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1
// ============================================================================

export const forumAnalyticsApi = {
  getSummary: async () => {
    try {
      const res = await api.get(`${OPERATOR_BASE}/analytics/summary?${SVC}`);
      return res.data;
    } catch {
      return { success: false, data: null };
    }
  },

  getTrend: async (days?: number) => {
    try {
      const query = new URLSearchParams({ serviceCode: 'k-cosmetics' });
      if (days) query.set('days', days.toString());
      const res = await api.get(`${OPERATOR_BASE}/analytics/trend?${query}`);
      return res.data;
    } catch {
      return { success: false, data: { daily: [] } };
    }
  },

  getActivity: async (limit?: number) => {
    try {
      const query = new URLSearchParams({ serviceCode: 'k-cosmetics' });
      if (limit) query.set('limit', limit.toString());
      const res = await api.get(`${OPERATOR_BASE}/analytics/activity?${query}`);
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
  },
};
