/**
 * Forum API Service - K-Cosmetics
 *
 * Based on web-neture/src/services/forumApi.ts
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';
/**
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
 *
 * 커뮤니티 읽기·쓰기는 서비스 컨텍스트 경로를 사용한다 (서버가 service scope 격리).
 * `/forum/category-requests` · `/forum/operator` · `/forum/admin` 은 자체 serviceCode
 * 권한 계약을 이미 갖고 있어 공통 경로를 그대로 유지한다.
 */
const FORUM_BASE = '/cosmetics/forum';


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
// WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: categoryId 파라미터 제거 (KPA Canonical 정렬)
export async function fetchForumPosts(params: {
  page?: number;
  limit?: number;
  isPinned?: boolean;
}): Promise<PostsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`${FORUM_BASE}/posts?${queryParams}`);
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
    const response = await api.get(`${FORUM_BASE}/posts/${postId}`);
    const data = response.data;

    if (!data.success) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum post:', error);
    if ((error as any)?.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Fetch comments for a post
 */
export async function fetchForumComments(postId: string): Promise<CommentsResponse> {
  try {
    const response = await api.get(`${FORUM_BASE}/posts/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    throw error;
  }
}

// ============================================================================
// Post like (WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C)
//   공통 backend 의 `POST /posts/:id/like` 를 그대로 소비한다. UI 는 공통 ForumLikeButton.
// ============================================================================

export async function toggleForumPostLike(
  postId: string,
): Promise<{ likeCount: number; isLiked: boolean }> {
  const response = await api.post(`${FORUM_BASE}/posts/${postId}/like`);
  const data = response.data?.data ?? response.data;
  return { likeCount: data?.likeCount ?? 0, isLiked: Boolean(data?.isLiked) };
}

// ============================================================================
// Comment write (WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C)
//   공통 backend(service-forum.routes.ts / glycopharm forum router) 의 댓글 쓰기 경로를
//   그대로 소비한다. 권한 판정은 서버가 하고, 클라이언트는 401/403 을 안내로만 바꾼다.
// ============================================================================

export async function createForumComment(postId: string, content: string): Promise<void> {
  await api.post(`${FORUM_BASE}/posts/${postId}/comments`, { content });
}

export async function updateForumComment(commentId: string, content: string): Promise<void> {
  await api.put(`${FORUM_BASE}/comments/${commentId}`, { content });
}

export async function deleteForumComment(commentId: string): Promise<void> {
  await api.delete(`${FORUM_BASE}/comments/${commentId}`);
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
    const response = await api.get(`${FORUM_BASE}/categories/popular?limit=${limit}`);
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

// WO-O4O-FORUM-CANONICAL-SPRINT2-CLEANUP-V1
// WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: categoryId 제거 (KPA Canonical 정렬)
// WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
//   글은 반드시 이 서비스의 forum 에 속해야 한다(미지정 시 서버가 400 FORUM_REQUIRED).
//   PharmacyHub 글쓰기와 같은 축 — 공통 `GET /forum/categories` 를 그대로 소비한다.
export interface WritableForum {
  id: string;
  name: string;
  slug: string;
}

export async function fetchWritableForums(): Promise<WritableForum[]> {
  try {
    const response = await api.get(`${FORUM_BASE}/categories?limit=100`);
    const raw = response.data?.data;
    const items = Array.isArray(raw) ? raw : raw?.items;
    return (items || []).map((item: any) => ({
      id: String(item.id),
      name: String(item.name ?? item.title ?? item.slug ?? ''),
      slug: String(item.slug ?? ''),
    }));
  } catch (error) {
    console.error('Error fetching writable forums:', error);
    return [];
  }
}

export async function createForumPost(payload: {
  title: string;
  type: ForumPostType;
  forumId: string;
  // WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1: htmlToBlocks Block[] 수용 — string 호환 유지
  content: unknown[] | string;
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const response = await api.post(`${FORUM_BASE}/posts`, payload);
  return response.data;
}

// ============================================================================
// Post edit/delete (WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C)
//   공통 backend 의 `PUT /posts/:id` · `DELETE /posts/:id` 를 그대로 소비한다.
//   작성자·권한 판정은 서버가 하고, 클라이언트는 401/403 을 안내로만 바꾼다.
// ============================================================================

export async function updateForumPost(
  postId: string,
  payload: { title: string; type?: ForumPostType; content: unknown[] | string },
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const response = await api.put(`${FORUM_BASE}/posts/${postId}`, payload);
  return response.data;
}

export async function deleteForumPost(postId: string): Promise<void> {
  await api.delete(`${FORUM_BASE}/posts/${postId}`);
}

export async function fetchMyCategories(): Promise<{ success: boolean; data: any[] }> {
  try {
    const response = await api.get(`${FORUM_BASE}/categories/mine`);
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
    const response = await api.patch(`${FORUM_BASE}/categories/${id}/owner`, data);
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
    const response = await api.post(`${FORUM_BASE}/categories/${id}/delete-request`, data);
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
  data: { name: string; description: string; reason?: string; tags?: string[] },
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
      `${FORUM_BASE}/categories/${forumId}/join-requests`,
    ),

  approveJoin: (forumId: string, requestId: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${forumId}/join-requests/${requestId}/approve`,
    ),

  rejectJoin: (forumId: string, requestId: string, reviewComment?: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${forumId}/join-requests/${requestId}/reject`,
      { reviewComment },
    ),

  getMembers: (forumId: string) =>
    api.get<{ success: boolean; data: ForumMember[] }>(
      `${FORUM_BASE}/categories/${forumId}/members`,
    ),

  removeMember: (forumId: string, userId: string) =>
    api.delete<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${forumId}/members/${userId}`,
    ),

  requestJoin: (forumId: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${forumId}/join-requests`,
    ),

  getMembershipStatus: (forumId: string) =>
    api.get<{ success: boolean; data: { isMember: boolean; role: string | null; pendingRequest: boolean } }>(
      `${FORUM_BASE}/categories/${forumId}/membership-status`,
    ),
};

// ============================================================================
// My Posts — WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §10·§11
//   공통 query contract: 인증 + route 의 canonical service scope + `author=me`.
//   서비스별 전용 endpoint/query 이름을 만들지 않는다.
//   raw → ForumListItem 매핑(상세 경로 포함)은 서비스 adapter 인 이 파일이 담당한다.
// ============================================================================

import type { ForumListItem, ForumListItemPostType } from '@o4o/shared-space-ui';

export interface MyForumPostsResult {
  posts: ForumListItem[];
  page: number;
  totalPages: number;
  total: number;
}

const MY_POST_TYPES: ForumListItemPostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];

function myPostStatusLabel(status?: string | null): string | undefined {
  if (!status || status === 'publish' || status === 'published') return undefined;
  if (status === 'draft') return '임시저장';
  if (status === 'pending') return '승인대기';
  if (status === 'private') return '비공개';
  return undefined;
}

export async function fetchMyForumPosts(params: {
  page?: number;
  limit?: number;
}): Promise<MyForumPostsResult> {
  const query = new URLSearchParams();
  query.set('author', 'me');
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  // 조회 실패를 빈 목록으로 위장하지 않는다 — throw 해서 공통 View 의 error 상태로 보낸다.
  const response = await api.get(`${FORUM_BASE}/posts?${query.toString()}`);
  const body = response.data;
  if (!body?.success) throw new Error(body?.error || '내가 쓴 글을 불러오지 못했습니다.');

  const rows: ForumPostResponse[] = body.data ?? [];
  return {
    posts: rows.map((post) => ({
      id: post.id,
      title: post.title,
      authorName: post.author?.nickname || post.author?.name || '나',
      createdAt: post.createdAt,
      commentCount: post.commentCount ?? 0,
      likeCount: post.likeCount ?? 0,
      isPinned: Boolean(post.isPinned),
      viewCount: post.viewCount ?? 0,
      postType: MY_POST_TYPES.includes(post.type as ForumListItemPostType)
        ? (post.type as ForumListItemPostType)
        : undefined,
      statusLabel: myPostStatusLabel(post.status),
      routeTo: `/forum/post/${post.id}`,
    })),
    page: body.pagination?.page ?? params.page ?? 1,
    totalPages: body.pagination?.totalPages ?? 0,
    total: body.totalCount ?? body.pagination?.total ?? 0,
  };
}
