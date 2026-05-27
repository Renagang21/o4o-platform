/**
 * GlycoPharm Forum API
 *
 * WO-O4O-GLYCOPHARM-FORUM-API-CANONICAL-V1
 * WO-O4O-FORUM-CANONICAL-SPRINT2-CLEANUP-V1 — @o4o/types/forum SSOT 정렬
 *
 * Canonical endpoint: /api/v1/forum/* (common forum API)
 */

import { api } from '@/lib/apiClient';

// ─── Types — @o4o/types/forum SSOT ─────────────────────────────────────────────

import type {
  ForumPostResponse,
  ForumPostType,
  ForumCategoryResponse,
  ForumCommentResponse,
  ForumAuthorResponse,
  ForumPaginationInfo,
} from '@o4o/types/forum';

export type {
  ForumPostResponse,
  ForumPostType,
  ForumCategoryResponse,
  ForumCommentResponse,
  ForumAuthorResponse,
  ForumPaginationInfo,
};

// Backward-compatible aliases used throughout web-glycopharm
export type ForumPost = ForumPostResponse;
export type ForumPostDetail = ForumPostResponse;
export type ForumCategory = ForumCategoryResponse;
export type ForumComment = ForumCommentResponse;
export type ForumPostAuthor = ForumAuthorResponse;

export function getAuthorName(post: { author?: ForumAuthorResponse | null }): string {
  return post.author?.nickname || post.author?.name || '익명';
}

/** Normalize Forum post content (Block[] | string) to plain text. */
export function extractTextContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block?.content && (block.type === 'paragraph' || block.type === 'heading')) {
          return String(block.content);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function fetchForumPosts(params: {
  limit?: number;
  category?: string;
  sort?: string;
  isPinned?: boolean;
} = {}): Promise<{ success: boolean; data: ForumPost[] }> {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);
  if (params.isPinned !== undefined) query.set('isPinned', String(params.isPinned));
  const response = await api.get(`/forum/posts?${query}`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
}

export async function fetchPopularForums(limit: number = 6): Promise<{ success: boolean; data: ForumCategory[] }> {
  const response = await api.get(`/forum/categories/popular?limit=${limit}`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
}

export async function fetchForumPost(id: string): Promise<{ success: boolean; data: ForumPostDetail | null }> {
  const response = await api.get(`/forum/posts/${id}`);
  const data = response.data;
  if (data?.data) return { success: true, data: data.data };
  return { success: true, data: data || null };
}

export async function fetchPostComments(postId: string): Promise<{ success: boolean; data: ForumComment[] }> {
  const response = await api.get(`/forum/posts/${postId}/comments`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
}

// WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: categoryId 제거 (KPA Canonical 정렬)
export async function createForumPost(payload: {
  title: string;
  type: string;
  content: string;
}): Promise<{ success: boolean; data?: { id: string }; id?: string; error?: string }> {
  const response = await api.post('/forum/posts', payload);
  return response.data;
}

// ─── Owner Category Management ─────────────────────────────────────────────────
// WO-O4O-GLYCOPHARM-FORUM-DASHBOARD-V1
// Canonical endpoints: /api/v1/forum/categories/{mine,/owner,/delete-request}

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
    const response = await api.get('/forum/category-requests/my?serviceCode=glycopharm');
    return response.data;
  } catch (error) {
    console.error('Error fetching my forum requests:', error);
    return { success: false, data: [] };
  }
}

// ============================================================================
// Forum Membership API — WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1
// Common endpoint: /api/v1/forum/categories/:id/...
// ============================================================================

export interface ForumJoinRequest {
  id: string;
  user_id: string;
  requester_id: string;
  requester_name: string | null;
  requester_email: string | null;
  user_display_name: string | null;
  user_name: string | null;
  user_email: string | null;
  status: string;
  message: string | null;
  created_at: string;
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
    api.get<{ success: boolean; data: ForumJoinRequest[] }>(
      `/forum/categories/${forumId}/join-requests`,
    ),

  approveJoin: (forumId: string, requestId: string) =>
    api.post<{ success: boolean; data: any }>(
      `/forum/categories/${forumId}/join-requests/${requestId}/approve`,
    ),

  rejectJoin: (forumId: string, requestId: string, reviewComment?: string) =>
    api.post<{ success: boolean; data: any }>(
      `/forum/categories/${forumId}/join-requests/${requestId}/reject`,
      { reviewComment },
    ),

  getMembers: (forumId: string) =>
    api.get<{ success: boolean; data: ForumMember[] }>(
      `/forum/categories/${forumId}/members`,
    ),

  removeMember: (forumId: string, userId: string) =>
    api.delete<{ success: boolean; data: any }>(
      `/forum/categories/${forumId}/members/${userId}`,
    ),

  requestJoin: (forumId: string) =>
    api.post<{ success: boolean; data: any }>(
      `/forum/categories/${forumId}/join-requests`,
    ),

  getMembershipStatus: (forumId: string) =>
    api.get<{ success: boolean; data: { isMember: boolean; role: string | null; pendingRequest: boolean } }>(
      `/forum/categories/${forumId}/membership-status`,
    ),
};
