/**
 * GlycoPharm Forum API
 *
 * WO-O4O-GLYCOPHARM-FORUM-API-CANONICAL-V1
 * WO-O4O-FORUM-CANONICAL-SPRINT2-CLEANUP-V1 — @o4o/types/forum SSOT 정렬
 * WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1
 *
 * Canonical endpoint: `/api/v1/glycopharm/forum/*` (service-scoped forum API)
 *
 * 이전에는 generic `/api/v1/forum/*` 을 직접 호출했다. generic route 에는
 * forumContextMiddleware 가 없어 ForumControllerBase.applyContextFilter 가 무필터로
 * 통과하므로(`if (!ctx) return;`) 타 서비스(kpa-society / neture / k-cosmetics /
 * pharmacy-hub) 의 포럼·게시글이 GlycoPharm 화면에 섞이고, 작성도 서비스 경계 밖
 * forumId 로 가능했다.
 *
 * 격리는 신규 로직 없이 기존 서비스 mount 계약에 위임한다:
 *   /api/v1/glycopharm/forum/*
 *     → forumContextMiddleware({ serviceCode: 'glycopharm', organizationId: FORUM_ORGS.GLYCOPHARM })
 *     → resolveCanonicalServiceKey('glycopharm') = 'glycopharm'
 *     → forum_category_requests.service_code 일치 EXISTS 필터
 *
 * ⚠️ 이 파일이 GlycoPharm forum API base 의 단일 소유자다. 페이지에서 forum 경로
 *    문자열을 직접 만들지 말고 여기의 함수나 {@link FORUM_BASE} 를 쓴다.
 *
 * 예외 — `/forum/category-requests/*` 는 여기로 옮기지 않는다.
 *   포럼 개설 신청 계약은 자체 `serviceCode` 쿼리 파라미터로 이미 서비스가 지정되며
 *   operator 승인 흐름과 계약을 공유한다. 본 WO 제외 범위(§3 operator/admin 계약 무변경).
 */

import { api } from '@/lib/apiClient';

/**
 * GlycoPharm forum API base (service-scoped).
 * `api` 의 baseURL 이 이미 `/api/v1` 로 끝나므로 여기서는 그 뒤만 적는다.
 */
export const FORUM_BASE = '/glycopharm/forum';

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
  const response = await api.get(`${FORUM_BASE}/posts?${query}`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
}

export async function fetchPopularForums(limit: number = 6): Promise<{ success: boolean; data: ForumCategory[] }> {
  const response = await api.get(`${FORUM_BASE}/categories/popular?limit=${limit}`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
}

export async function fetchForumPost(id: string): Promise<{ success: boolean; data: ForumPostDetail | null }> {
  const response = await api.get(`${FORUM_BASE}/posts/${id}`);
  const data = response.data;
  if (data?.data) return { success: true, data: data.data };
  return { success: true, data: data || null };
}

export async function fetchPostComments(postId: string): Promise<{ success: boolean; data: ForumComment[] }> {
  const response = await api.get(`${FORUM_BASE}/posts/${postId}/comments`);
  const data = response.data;
  if (Array.isArray(data)) return { success: true, data };
  if (data?.data && Array.isArray(data.data)) return { success: true, data: data.data };
  return { success: true, data: [] };
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
  type: string;
  forumId: string;
  // WO-O4O-FORUM-WRITE-EDITOR-CONTENT-PARITY-V1: blocks(Block[]) 정렬 — string 호환 유지
  content: unknown[] | string;
}): Promise<{ success: boolean; data?: { id: string }; id?: string; error?: string }> {
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
  payload: { title: string; type?: string; content: unknown[] | string },
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const response = await api.put(`${FORUM_BASE}/posts/${postId}`, payload);
  return response.data;
}

export async function deleteForumPost(postId: string): Promise<void> {
  await api.delete(`${FORUM_BASE}/posts/${postId}`);
}

// ─── Owner Category Management ─────────────────────────────────────────────────
// WO-O4O-GLYCOPHARM-FORUM-DASHBOARD-V1
// Canonical endpoints: /api/v1/glycopharm/forum/categories/{mine,/owner,/delete-request}

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

/**
 * 포럼 개설 신청 내역.
 *
 * WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1:
 *   의도적으로 generic `/api/v1/forum/category-requests/*` 를 유지한다. 이 계약은
 *   `serviceCode` 쿼리 파라미터로 서비스를 명시하며 operator 승인 흐름과 계약을 공유한다
 *   (service-forum.routes.ts 도 같은 이유로 `/category-requests/*` 를 마운트하지 않는다).
 *   본 WO 제외 범위 — operator/admin forum 계약 무변경.
 */
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
// WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1:
//   generic `/api/v1/forum/categories/:id/...` → service-scoped
//   `/api/v1/glycopharm/forum/categories/:id/...`.
//   백엔드 핸들러는 공통 ForumMembershipController 그대로이며 소유자 검증 계약도 무변경이다.
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
