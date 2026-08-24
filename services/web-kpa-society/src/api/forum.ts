/**
 * Forum API 서비스
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §3:
 *   `/demo/*`(지부·분회 데모) 스코프 분기 잔재를 제거했다. KPA-Society 본체는
 *   **항상 커뮤니티 스코프(`/forum`)** 만 쓴다 — scope='community'
 *   (organizationId IS NULL). 분회 업무는 별도 분회 서비스 소관이다.
 *
 * base URL 은 client.ts 가 `/api/v1/kpa` prefix 를 붙이므로 여기서 다시 붙이지 않는다.
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

/** KPA-Society 커뮤니티 스코프 고정 base path */
const FORUM_BASE = '/forum';

export const forumApi = {
  // 포럼 정보 — ForumDetailPage 비공개 포럼 소유자 검증에 필수
  getForum: (id: string) =>
    apiClient.get<ApiResponse<ForumInfo>>(`${FORUM_BASE}/categories/${id}`),

  // 게시글
  getPosts: (params?: {
    forumId?: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    sortBy?: string;
    /**
     * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §10
     * 'me' → 로그인 사용자 본인 글만(내가 쓴 글). 5서비스 공통 query contract.
     */
    author?: 'me';
  }) =>
    apiClient.get<PaginatedResponse<ForumPost>>(`${FORUM_BASE}/posts`, params),

  getPopularTags: (limit?: number) =>
    apiClient.get<ApiResponse<{ tag: string; count: number }[]>>(
      `${FORUM_BASE}/posts/tags/popular`,
      limit ? { limit } : undefined,
    ),

  getPost: (id: string) =>
    apiClient.get<ApiResponse<ForumPost>>(`${FORUM_BASE}/posts/${id}`),

  createPost: (data: CreatePostRequest) =>
    apiClient.post<ApiResponse<ForumPost>>(`${FORUM_BASE}/posts`, data),

  updatePost: (id: string, data: Partial<CreatePostRequest>) =>
    apiClient.put<ApiResponse<ForumPost>>(`${FORUM_BASE}/posts/${id}`, data),

  deletePost: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`${FORUM_BASE}/posts/${id}`),

  likePost: (id: string) =>
    apiClient.post<ApiResponse<{ likeCount: number; isLiked: boolean }>>(`${FORUM_BASE}/posts/${id}/like`),

  // WO-KPA-A-FORUM-NOTICE-PIN-BY-OWNER-V1: forum owner pin/unpin
  pinPost: (id: string, pin: boolean) =>
    apiClient.patch<ApiResponse<{ id: string; isPinned: boolean }>>(`${FORUM_BASE}/posts/${id}/pin`, { pin }),

  // 댓글
  getComments: (postId: string) =>
    apiClient.get<ApiResponse<ForumComment[]>>(`${FORUM_BASE}/posts/${postId}/comments`),

  createComment: (postId: string, content: string, parentId?: string) =>
    apiClient.post<ApiResponse<ForumComment>>(`${FORUM_BASE}/posts/${postId}/comments`, {
      content,
      parentId,
    }),

  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C
  updateComment: (commentId: string, content: string) =>
    apiClient.put<ApiResponse<ForumComment>>(`${FORUM_BASE}/comments/${commentId}`, { content }),

  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<ApiResponse<void>>(`${FORUM_BASE}/posts/${postId}/comments/${commentId}`),

  // 공개 포럼 목록 (WO-O4O-KPA-FORUM-ALL-SEARCH-AND-FILTER-UX-V1)
  getCategories: () =>
    apiClient.get<ApiResponse<ForumInfo[]>>(`${FORUM_BASE}/categories`),

  // Owner routes — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
  getMyForums: () =>
    apiClient.get<ApiResponse<ForumInfo[]>>(`${FORUM_BASE}/categories/mine`),

  updateMyForum: (id: string, data: { name?: string; description?: string; iconEmoji?: string | null; iconUrl?: string | null }) =>
    apiClient.patch<ApiResponse<ForumInfo>>(`${FORUM_BASE}/categories/${id}/owner`, data),

  requestDeleteForum: (id: string, data: { reason?: string }) =>
    apiClient.post<ApiResponse<void>>(`${FORUM_BASE}/categories/${id}/delete-request`, data),
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
      `${FORUM_BASE}/categories/${forumId}/join-requests`,
    ),

  approveJoin: (forumId: string, requestId: string) =>
    apiClient.post<ApiResponse<{ requestId: string; status: string; userId: string }>>(
      `${FORUM_BASE}/categories/${forumId}/members/${requestId}/approve`,
    ),

  rejectJoin: (forumId: string, requestId: string, reviewComment?: string) =>
    apiClient.post<ApiResponse<{ requestId: string; status: string }>>(
      `${FORUM_BASE}/categories/${forumId}/members/${requestId}/reject`,
      { reviewComment },
    ),

  getMembers: (forumId: string) =>
    apiClient.get<ApiResponse<ForumMember[]>>(
      `${FORUM_BASE}/categories/${forumId}/members`,
    ),

  removeMember: (forumId: string, userId: string) =>
    apiClient.delete<ApiResponse<{ removed: boolean; userId: string }>>(
      `${FORUM_BASE}/categories/${forumId}/members/${userId}`,
    ),

  // WO-KPA-A-PRIVATE-FORUM-JOIN-UX-CONNECT-V1: 일반 사용자용
  requestJoin: (forumId: string) =>
    apiClient.post<ApiResponse<any>>(
      `${FORUM_BASE}/categories/${forumId}/join`,
    ),

  getMembershipStatus: (forumId: string) =>
    apiClient.get<ApiResponse<{ isMember: boolean; role: string | null; pendingRequest: boolean }>>(
      `${FORUM_BASE}/categories/${forumId}/membership-status`,
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
