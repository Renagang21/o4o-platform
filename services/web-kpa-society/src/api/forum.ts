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
  ForumInfo,
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
  // 포럼 정보 — ForumDetailPage 비공개 포럼 소유자 검증에 필수
  getForum: (id: string) =>
    apiClient.get<ApiResponse<ForumInfo>>(`${getForumBasePath()}/categories/${id}`),

  // 게시글
  getPosts: (params?: {
    forumId?: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    sortBy?: string;
  }) =>
    apiClient.get<PaginatedResponse<ForumPost>>(`${getForumBasePath()}/posts`, params),

  getPopularTags: (limit?: number) =>
    apiClient.get<ApiResponse<{ tag: string; count: number }[]>>(
      `${getForumBasePath()}/posts/tags/popular`,
      limit ? { limit } : undefined,
    ),

  getPost: (id: string) =>
    apiClient.get<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts/${id}`),

  createPost: (data: CreatePostRequest) =>
    apiClient.post<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts`, data),

  updatePost: (id: string, data: Partial<CreatePostRequest>) =>
    apiClient.put<ApiResponse<ForumPost>>(`${getForumBasePath()}/posts/${id}`, data),

  deletePost: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`${getForumBasePath()}/posts/${id}`),

  likePost: (id: string) =>
    apiClient.post<ApiResponse<{ likeCount: number; isLiked: boolean }>>(`${getForumBasePath()}/posts/${id}/like`),

  // WO-KPA-A-FORUM-NOTICE-PIN-BY-OWNER-V1: forum owner pin/unpin
  pinPost: (id: string, pin: boolean) =>
    apiClient.patch<ApiResponse<{ id: string; isPinned: boolean }>>(`${getForumBasePath()}/posts/${id}/pin`, { pin }),

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
  getMyForums: () =>
    apiClient.get<ApiResponse<ForumInfo[]>>(`${getForumBasePath()}/categories/mine`),

  updateMyForum: (id: string, data: { name?: string; description?: string; iconEmoji?: string | null; iconUrl?: string | null }) =>
    apiClient.patch<ApiResponse<ForumInfo>>(`${getForumBasePath()}/categories/${id}/owner`, data),

  requestDeleteForum: (id: string, data: { reason?: string }) =>
    apiClient.post<ApiResponse<void>>(`${getForumBasePath()}/categories/${id}/delete-request`, data),
};

// ============================================================================
// Forum Membership API — WO-KPA-A-FORUM-OWNER-MEMBER-MANAGEMENT-UI-V1
// Owner-facing membership management for closed forums
// ============================================================================

export interface ForumJoinRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  status: string;
  created_at: string;
  user_display_name: string | null;
}

export interface ForumMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user_name: string | null;
  user_email: string | null;
}

export const forumMembershipApi = {
  getJoinRequests: (forumId: string) =>
    apiClient.get<ApiResponse<ForumJoinRequest[]>>(
      `${getForumBasePath()}/categories/${forumId}/join-requests`,
    ),

  approveJoin: (forumId: string, requestId: string) =>
    apiClient.post<ApiResponse<{ requestId: string; status: string; userId: string }>>(
      `${getForumBasePath()}/categories/${forumId}/members/${requestId}/approve`,
    ),

  rejectJoin: (forumId: string, requestId: string, reviewComment?: string) =>
    apiClient.post<ApiResponse<{ requestId: string; status: string }>>(
      `${getForumBasePath()}/categories/${forumId}/members/${requestId}/reject`,
      { reviewComment },
    ),

  getMembers: (forumId: string) =>
    apiClient.get<ApiResponse<ForumMember[]>>(
      `${getForumBasePath()}/categories/${forumId}/members`,
    ),

  removeMember: (forumId: string, userId: string) =>
    apiClient.delete<ApiResponse<{ removed: boolean; userId: string }>>(
      `${getForumBasePath()}/categories/${forumId}/members/${userId}`,
    ),

  // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1: 일반 사용자용
  requestJoin: (forumId: string) =>
    apiClient.post<ApiResponse<any>>(
      `${getForumBasePath()}/categories/${forumId}/join`,
    ),

  getMembershipStatus: (forumId: string) =>
    apiClient.get<ApiResponse<{ isMember: boolean; role: string | null; pendingRequest: boolean }>>(
      `${getForumBasePath()}/categories/${forumId}/membership-status`,
    ),
};

// ============================================================================
// Category Request API — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
// Uses authClient.api (base: /api/v1) for common forum endpoints
// ============================================================================
import { authClient } from '../contexts/AuthContext';

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

  create: async (data: { name: string; description: string; reason?: string; forumType?: string; tags?: string[] }): Promise<{ success: boolean; data?: any; error?: string }> => {
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

// ============================================================================
// Operator Forum API — WO-O4O-KPA-A-FORUM-ALIGNMENT-V1
// Common /api/v1/forum/operator/* endpoints (serviceCode=kpa-society)
// ============================================================================

const OPERATOR_BASE = '/forum/operator';
const SVC = 'serviceCode=kpa-society';

export const forumOperatorApi = {
  getRequests: async (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams({ serviceCode: 'kpa-society' });
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/requests?${query}`);
      return res.data;
    } catch {
      return { success: false, data: [], total: 0 };
    }
  },

  getPendingCount: async () => {
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/requests/pending-count?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: { count: 0 } };
    }
  },

  getRequestDetail: async (id: string) => {
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/requests/${id}?${SVC}`);
      return res.data;
    } catch {
      return { success: false, error: 'Failed to load detail' };
    }
  },

  review: async (id: string, data: { action: 'approve' | 'reject' | 'revision'; reviewComment?: string }) => {
    const res = await authClient.api.patch(`${OPERATOR_BASE}/requests/${id}/review?${SVC}`, data);
    return res.data;
  },

  // WO-FORUM-CREATION-STATE-MACHINE-AND-ORPHAN-ZERO-V1
  createForum: async (id: string) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/requests/${id}/create?${SVC}`, {});
    return res.data;
  },

  recreateForum: async (id: string) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/requests/${id}/recreate?${SVC}`, {});
    return res.data;
  },

  // WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1
  getCategories: async () => {
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/categories?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: [], count: 0 };
    }
  },

  updateCategory: async (id: string, data: { name?: string; description?: string; tags?: string[] }) => {
    const res = await authClient.api.patch(`${OPERATOR_BASE}/categories/${id}?${SVC}`, data);
    return res.data;
  },

  directDeactivate: async (id: string, data: { reason: string }) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/categories/${id}/deactivate?${SVC}`, data);
    return res.data;
  },

  activate: async (id: string) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/categories/${id}/activate?${SVC}`, {});
    return res.data;
  },

  // WO-KPA-A-OPERATOR-FORUM-HARD-DELETE-SAFE-GUARD-V1
  getDeleteCheck: async (id: string) => {
    const res = await authClient.api.get(`${OPERATOR_BASE}/categories/${id}/delete-check?${SVC}`);
    return res.data;
  },

  hardDelete: async (id: string, data: { reason: string }) => {
    const res = await authClient.api.delete(`${OPERATOR_BASE}/categories/${id}/hard?${SVC}`, { data });
    return res.data;
  },

  getDeleteRequests: async (params?: { status?: string }) => {
    const query = new URLSearchParams({ serviceCode: 'kpa-society' });
    if (params?.status) query.set('status', params.status);
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/delete-requests?${query}`);
      return res.data;
    } catch {
      return { success: true, data: [], count: 0 };
    }
  },

  getDeletePendingCount: async () => {
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/delete-requests/pending-count?${SVC}`);
      return res.data;
    } catch {
      return { success: true, data: { count: 0 } };
    }
  },

  approveDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/delete-requests/${id}/approve?${SVC}`, data || {});
    return res.data;
  },

  rejectDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/delete-requests/${id}/reject?${SVC}`, data || {});
    return res.data;
  },

  // V3 Batch
  batchApproveDelete: async (ids: string[], reviewComment?: string) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/delete-requests/batch-approve?${SVC}`, { ids, reviewComment });
    return res.data;
  },
  batchRejectDelete: async (ids: string[], reviewComment?: string) => {
    const res = await authClient.api.post(`${OPERATOR_BASE}/delete-requests/batch-reject?${SVC}`, { ids, reviewComment });
    return res.data;
  },
};

// ============================================================================
// Forum Analytics API — WO-O4O-KPA-A-FORUM-ALIGNMENT-V1
// ============================================================================

export const forumAnalyticsApi = {
  getSummary: async () => {
    try {
      const res = await authClient.api.get(`${OPERATOR_BASE}/analytics/summary?${SVC}`);
      return res.data;
    } catch {
      return { success: false, data: null };
    }
  },

  getTrend: async (days?: number) => {
    try {
      const query = new URLSearchParams({ serviceCode: 'kpa-society' });
      if (days) query.set('days', days.toString());
      const res = await authClient.api.get(`${OPERATOR_BASE}/analytics/trend?${query}`);
      return res.data;
    } catch {
      return { success: false, data: { daily: [] } };
    }
  },

  getActivity: async (limit?: number) => {
    try {
      const query = new URLSearchParams({ serviceCode: 'kpa-society' });
      if (limit) query.set('limit', limit.toString());
      const res = await authClient.api.get(`${OPERATOR_BASE}/analytics/activity?${query}`);
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
  },
};
