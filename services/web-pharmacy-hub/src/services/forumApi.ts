import { api } from '../lib/apiClient';
import type { ForumHubCategory, ForumHubPost, ForumListItem } from '@o4o/shared-space-ui';

/**
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
 *
 * 서비스 격리는 서버(route → forumContext → applyContextFilter)가 전담한다.
 * 클라이언트는 서비스 전용 base 만 사용하고 serviceCode 질의 파라미터를 보내지 않는다.
 */
const FORUM_BASE = '/pharmacy-hub/forum';

interface ForumDirectoryRow {
  id: string;
  name: string;
  description?: string | null;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  serviceCode: string;
  metadata?: Record<string, unknown> | null;
}

interface ForumDirectoryResponse {
  success: boolean;
  data?: ForumDirectoryRow[];
}

interface ForumPostRow {
  id: string;
  title: string;
  authorName?: string | null;
  createdAt: string;
  commentCount?: number | null;
  likeCount?: number | null;
  viewCount?: number | null;
  isPinned?: boolean | null;
  type?: ForumListItem['postType'];
  excerpt?: string | null;
  status?: string | null;
}

interface ForumPostListResponse {
  success: boolean;
  data?: ForumPostRow[];
  total?: number;
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  pagination?: { page: number; limit: number; totalPages: number };
  error?: string;
}

export interface PharmacyHubForumPostListResult {
  posts: ForumListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** PharmacyHub forum directory adapter — shared SSOT, service-local rows only. */
export async function fetchPharmacyHubForumCategories(): Promise<ForumHubCategory[]> {
  const response = await api.get<ForumDirectoryResponse>(`${FORUM_BASE}/categories`);
  const rows: ForumDirectoryRow[] = response.data?.data ?? [];

  return rows
    .map((forum) => ({
      id: forum.id,
      name: forum.name,
      description: forum.description ?? null,
      iconEmoji: forum.iconEmoji ?? null,
      iconUrl: forum.iconUrl ?? null,
      postCount: 0,
    }));
}

/** 비공개 상태(임시저장/승인대기)만 배지로 표기한다. 게시 상태는 배지 없음. */
function forumStatusLabel(status?: string | null): string | undefined {
  if (!status || status === 'publish' || status === 'published') return undefined;
  if (status === 'draft') return '임시저장';
  if (status === 'pending') return '승인대기';
  if (status === 'private') return '비공개';
  return undefined;
}

/** Service-scoped list adapter — base 자체가 PharmacyHub 컨텍스트다. */
export async function fetchPharmacyHubForumPosts(params: {
  forumId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'latest' | 'oldest' | 'popular';
  /**
   * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §10
   * 공통 My Posts query contract — 서비스별 다른 query 이름을 만들지 않는다.
   */
  author?: 'me';
}): Promise<PharmacyHubForumPostListResult> {
  const query = new URLSearchParams();
  if (params.forumId) query.set('forumId', params.forumId);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.author) query.set('author', params.author);

  const response = await api.get<ForumPostListResponse>(`${FORUM_BASE}/posts?${query.toString()}`);
  const body = response.data;
  if (!body.success) throw new Error(body.error || '게시글을 불러오지 못했습니다.');

  const page = body.page ?? body.pagination?.page ?? params.page ?? 1;
  const limit = body.limit ?? body.pagination?.limit ?? params.limit ?? 20;
  const totalPages = body.totalPages ?? body.pagination?.totalPages ?? 0;
  const total = body.total ?? body.totalCount ?? 0;

  return {
    posts: (body.data ?? []).map((post: ForumPostRow): ForumListItem => ({
      id: post.id,
      title: post.title,
      authorName: post.authorName || '익명',
      createdAt: post.createdAt,
      commentCount: post.commentCount ?? 0,
      likeCount: post.likeCount ?? 0,
      viewCount: post.viewCount ?? 0,
      isPinned: Boolean(post.isPinned),
      postType: post.type,
      excerpt: post.excerpt ?? undefined,
      statusLabel: forumStatusLabel(post.status),
      routeTo: '',
    })),
    page,
    limit,
    total,
    totalPages,
  };
}

export async function fetchPharmacyHubRecentPosts(limit = 10): Promise<ForumHubPost[]> {
  const result = await fetchPharmacyHubForumPosts({ limit, sortBy: 'latest' });
  return result.posts.map((post) => ({
    id: post.id,
    title: post.title,
    authorName: post.authorName,
    viewCount: post.viewCount ?? 0,
    commentCount: post.commentCount,
    createdAt: post.createdAt,
    isPinned: post.isPinned,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 상세 · 작성 — WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
// ─────────────────────────────────────────────────────────────────────────────

export interface PharmacyHubForumPostDetail {
  id: string;
  title: string;
  content: unknown;
  authorName: string;
  authorId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isPinned: boolean;
  type?: ForumListItem['postType'];
  tags?: string[] | null;
  forumId?: string | null;
}

interface ForumPostDetailResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  code?: string;
}

/** 상세 조회 — postId(UUID) 또는 slug 모두 서버가 동일 endpoint 로 처리한다. */
export async function fetchPharmacyHubForumPost(
  postIdOrSlug: string,
): Promise<PharmacyHubForumPostDetail> {
  const response = await api.get<ForumPostDetailResponse>(
    `${FORUM_BASE}/posts/${encodeURIComponent(postIdOrSlug)}`,
  );
  const body = response.data;
  if (!body?.success || !body.data) {
    throw new Error(body?.error || '게시글을 불러오지 못했습니다.');
  }

  const row = body.data;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorName: row.authorName || '익명',
    authorId: row.authorId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
    viewCount: row.viewCount ?? 0,
    likeCount: row.likeCount ?? 0,
    commentCount: row.commentCount ?? 0,
    isLiked: Boolean(row.isLiked),
    isPinned: Boolean(row.isPinned),
    type: row.type,
    tags: row.tags ?? null,
    forumId: row.forumId ?? null,
  };
}

export interface PharmacyHubForumCreatePayload {
  forumId: string;
  title: string;
  content: string;
  type?: string;
}

/** 작성 — 게시판(forumId)은 PharmacyHub 소속만 서버가 허용한다(403 FORUM_SERVICE_SCOPE_DENIED). */
export async function createPharmacyHubForumPost(
  payload: PharmacyHubForumCreatePayload,
): Promise<{ id: string }> {
  const response = await api.post<ForumPostDetailResponse>(`${FORUM_BASE}/posts`, {
    forumId: payload.forumId,
    title: payload.title,
    content: payload.content,
    ...(payload.type ? { type: payload.type } : {}),
  });
  const body = response.data;
  if (!body?.success || !body.data?.id) {
    throw new Error(body?.error || '게시글을 등록하지 못했습니다.');
  }
  return { id: body.data.id };
}

export async function updatePharmacyHubForumPost(
  postId: string,
  payload: { title: string; content: unknown[] | string; type?: string },
): Promise<void> {
  const response = await api.put<ForumPostDetailResponse>(`${FORUM_BASE}/posts/${postId}`, {
    title: payload.title,
    content: payload.content,
    ...(payload.type ? { type: payload.type } : {}),
  });
  if (!response.data?.success) {
    throw new Error(response.data?.error || '게시글을 수정하지 못했습니다.');
  }
}

export async function deletePharmacyHubForumPost(postId: string): Promise<void> {
  await api.delete(`${FORUM_BASE}/posts/${postId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 · 좋아요 — WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §10
// 공통 backend(createServiceForumRouter)의 interaction endpoint 를 PharmacyHub base 로 소비한다.
// 서비스 격리·쓰기 권한(requireActiveServiceMembership)은 서버가 전담한다.
// ─────────────────────────────────────────────────────────────────────────────

export interface PharmacyHubForumComment {
  id: string;
  content: string;
  authorId?: string | null;
  authorName: string;
  createdAt: string;
  updatedAt?: string | null;
}

interface ForumCommentListResponse {
  success: boolean;
  data?: Record<string, any>[];
  totalCount?: number;
  error?: string;
}

function toComment(row: Record<string, any>): PharmacyHubForumComment {
  return {
    id: row.id,
    content: row.content ?? '',
    authorId: row.authorId ?? row.author?.id ?? null,
    authorName: row.authorName || row.author?.nickname || row.author?.name || '익명',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
  };
}

export async function fetchPharmacyHubForumComments(
  postId: string,
): Promise<PharmacyHubForumComment[]> {
  const response = await api.get<ForumCommentListResponse>(
    `${FORUM_BASE}/posts/${encodeURIComponent(postId)}/comments`,
  );
  const body = response.data;
  if (!body?.success) throw new Error(body?.error || '댓글을 불러오지 못했습니다.');
  return (body.data ?? []).map(toComment);
}

export async function createPharmacyHubForumComment(
  postId: string,
  content: string,
): Promise<PharmacyHubForumComment> {
  const response = await api.post<{ success: boolean; data?: Record<string, any>; error?: string }>(
    `${FORUM_BASE}/posts/${encodeURIComponent(postId)}/comments`,
    { content },
  );
  const body = response.data;
  if (!body?.success || !body.data) throw new Error(body?.error || '댓글을 등록하지 못했습니다.');
  return toComment(body.data);
}

export async function updatePharmacyHubForumComment(
  commentId: string,
  content: string,
): Promise<void> {
  const response = await api.put<{ success: boolean; error?: string }>(
    `${FORUM_BASE}/comments/${encodeURIComponent(commentId)}`,
    { content },
  );
  if (!response.data?.success) throw new Error(response.data?.error || '댓글을 수정하지 못했습니다.');
}

export async function deletePharmacyHubForumComment(commentId: string): Promise<void> {
  const response = await api.delete<{ success: boolean; error?: string }>(
    `${FORUM_BASE}/comments/${encodeURIComponent(commentId)}`,
  );
  if (!response.data?.success) throw new Error(response.data?.error || '댓글을 삭제하지 못했습니다.');
}

export async function togglePharmacyHubForumPostLike(
  postId: string,
): Promise<{ likeCount: number; isLiked: boolean }> {
  const response = await api.post<{ success: boolean; data?: { likeCount: number; isLiked: boolean }; error?: string }>(
    `${FORUM_BASE}/posts/${encodeURIComponent(postId)}/like`,
    {},
  );
  const body = response.data;
  if (!body?.success || !body.data) throw new Error(body?.error || '좋아요 처리에 실패했습니다.');
  return { likeCount: body.data.likeCount ?? 0, isLiked: Boolean(body.data.isLiked) };
}

// ============================================================================
// Operator Forum API — WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1
//
// 공통 `/api/v1/forum/operator/*` (serviceCode=pharmacy-hub). backend 변경 없음 —
// operator-forum.routes.ts 의 SERVICE_CODE_TO_RBAC_KEY 에 'pharmacy-hub' 가 이미 있다.
//
// 위 public forum 계열과 달리 operator 계열은 서비스 prefix base 가 아니라
// 플랫폼 공통 base 를 쓰므로 serviceCode 질의 파라미터가 **필수**다.
// ============================================================================

const OPERATOR_BASE = '/forum/operator';
const SVC = 'serviceCode=pharmacy-hub';

const svcQuery = (extra?: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams({ serviceCode: 'pharmacy-hub' });
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  return q.toString();
};

export const forumOperatorApi = {
  getRequests: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get(`${OPERATOR_BASE}/requests?${svcQuery(params)}`);
    return res.data;
  },

  getPendingCount: async () => {
    const res = await api.get(`${OPERATOR_BASE}/requests/pending-count?${SVC}`);
    return res.data;
  },

  getRequestDetail: async (id: string) => {
    const res = await api.get(`${OPERATOR_BASE}/requests/${encodeURIComponent(id)}?${SVC}`);
    return res.data;
  },

  review: async (
    id: string,
    data: { action: 'approve' | 'reject' | 'revision'; reviewComment?: string },
  ) => {
    const res = await api.patch(`${OPERATOR_BASE}/requests/${encodeURIComponent(id)}/review?${SVC}`, data);
    return res.data;
  },

  getDeleteRequests: async (params?: { status?: string }) => {
    const res = await api.get(`${OPERATOR_BASE}/delete-requests?${svcQuery(params)}`);
    return res.data;
  },

  getDeletePendingCount: async () => {
    const res = await api.get(`${OPERATOR_BASE}/delete-requests/pending-count?${SVC}`);
    return res.data;
  },

  approveDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await api.post(
      `${OPERATOR_BASE}/delete-requests/${encodeURIComponent(id)}/approve?${SVC}`,
      data || {},
    );
    return res.data;
  },

  rejectDelete: async (id: string, data?: { reviewComment?: string }) => {
    const res = await api.post(
      `${OPERATOR_BASE}/delete-requests/${encodeURIComponent(id)}/reject?${SVC}`,
      data || {},
    );
    return res.data;
  },
};

export const forumCategoriesOperatorApi = {
  getCategories: async () => {
    const res = await api.get(`${OPERATOR_BASE}/categories?${SVC}`);
    return res.data;
  },
  updateCategory: async (id: string, data: unknown) => {
    const res = await api.patch(`${OPERATOR_BASE}/categories/${encodeURIComponent(id)}?${SVC}`, data);
    return res.data;
  },
  directDeactivate: async (id: string, data: unknown) => {
    const res = await api.post(
      `${OPERATOR_BASE}/categories/${encodeURIComponent(id)}/deactivate?${SVC}`,
      data,
    );
    return res.data;
  },
  activate: async (id: string) => {
    const res = await api.post(`${OPERATOR_BASE}/categories/${encodeURIComponent(id)}/activate?${SVC}`, {});
    return res.data;
  },
  getDeleteCheck: async (id: string) => {
    const res = await api.get(`${OPERATOR_BASE}/categories/${encodeURIComponent(id)}/delete-check?${SVC}`);
    return res.data;
  },
  hardDelete: async (id: string, data: unknown) => {
    const res = await api.delete(`${OPERATOR_BASE}/categories/${encodeURIComponent(id)}/hard?${SVC}`, {
      data,
    });
    return res.data;
  },
};

export const forumAnalyticsApi = {
  getSummary: async () => {
    const res = await api.get(`${OPERATOR_BASE}/analytics/summary?${SVC}`);
    return res.data;
  },
  getTrend: async (days?: number) => {
    const res = await api.get(`${OPERATOR_BASE}/analytics/trend?${svcQuery({ days })}`);
    return res.data;
  },
  getActivity: async (limit?: number) => {
    const res = await api.get(`${OPERATOR_BASE}/analytics/activity?${svcQuery({ limit })}`);
    return res.data;
  },
};

// ============================================================================
// 포럼 소유자 · 개설 신청 · 회원(가입) API
// WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5·§6·§7·§8·§9
//
// backend 변경 0. 아래 endpoint 는 전부 이미 존재한다.
//   - `${FORUM_BASE}/categories/*`  : 공통 createServiceForumRouter (PharmacyHub 마운트 완료)
//   - `/forum/category-requests/*`  : 공통 forum-category-request.routes
//     (service-catalog 에 'pharmacy-hub' 가 등재돼 있어 serviceCode 검증을 통과한다)
//
// K-Cosmetics(services/web-k-cosmetics/src/services/forumApi.ts) 와 **같은 공통 라우터 계약**을
// 소비한다. KPA 는 `/api/v1/kpa/forum` 전용 변형이라 참조 대상이 아니다.
// ============================================================================

export async function fetchMyPharmacyHubForums(): Promise<{ success: boolean; data: any[] }> {
  try {
    const response = await api.get(`${FORUM_BASE}/categories/mine`);
    return response.data;
  } catch (error) {
    console.error('Error fetching my forums:', error);
    return { success: false, data: [] };
  }
}

export async function updateMyPharmacyHubForum(
  id: string,
  data: { name?: string; description?: string; iconEmoji?: string | null; iconUrl?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.patch(`${FORUM_BASE}/categories/${encodeURIComponent(id)}/owner`, data);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '저장에 실패했습니다.';
    return { success: false, error: msg };
  }
}

/** 포럼 삭제 **요청**. 소유자 직접 hard delete 는 만들지 않는다(운영자 심사 경유 — §9). */
export async function requestDeletePharmacyHubForum(
  id: string,
  data: { reason?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.post(
      `${FORUM_BASE}/categories/${encodeURIComponent(id)}/delete-request`,
      data,
    );
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '삭제 요청에 실패했습니다.';
    return { success: false, error: msg };
  }
}

/** 내 포럼 개설 신청 현황 — 공통 base 이므로 serviceCode 질의 파라미터가 필수다. */
export async function fetchMyPharmacyHubForumRequests(): Promise<{ success: boolean; data: any[] }> {
  try {
    const response = await api.get('/forum/category-requests/my?serviceCode=pharmacy-hub');
    return response.data;
  } catch (error) {
    console.error('Error fetching my forum requests:', error);
    return { success: false, data: [] };
  }
}

/** 포럼 개설 신청(P0). 승인 심사는 운영자 큐(`/forum/operator/requests`)로 유입된다. */
export async function createPharmacyHubForumCategoryRequest(data: {
  name: string;
  description: string;
  reason?: string;
  tags?: string[];
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await api.post('/forum/category-requests', {
      ...data,
      serviceCode: 'pharmacy-hub',
    });
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || '신청에 실패했습니다.';
    return { success: false, error: msg };
  }
}

export interface PharmacyHubForumJoinRequest {
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

export interface PharmacyHubForumMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user_name: string | null;
  user_email: string | null;
}

export const forumMembershipApi = {
  getJoinRequests: (forumId: string) =>
    api.get<{ success: boolean; data: PharmacyHubForumJoinRequest[] }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/join-requests`,
    ),

  approveJoin: (forumId: string, requestId: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/join-requests/${encodeURIComponent(requestId)}/approve`,
    ),

  rejectJoin: (forumId: string, requestId: string, reviewComment?: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/join-requests/${encodeURIComponent(requestId)}/reject`,
      { reviewComment },
    ),

  getMembers: (forumId: string) =>
    api.get<{ success: boolean; data: PharmacyHubForumMember[] }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/members`,
    ),

  removeMember: (forumId: string, userId: string) =>
    api.delete<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/members/${encodeURIComponent(userId)}`,
    ),

  requestJoin: (forumId: string) =>
    api.post<{ success: boolean; data: any }>(
      `${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/join-requests`,
    ),

  getMembershipStatus: (forumId: string) =>
    api.get<{
      success: boolean;
      data: { isMember: boolean; role: string | null; pendingRequest: boolean };
    }>(`${FORUM_BASE}/categories/${encodeURIComponent(forumId)}/membership-status`),
};

/**
 * 403 `CLOSED_FORUM_ACCESS_DENIED` 응답에서 대상 포럼 id 를 꺼낸다.
 * backend 계약: `{ success:false, code:'CLOSED_FORUM_ACCESS_DENIED', data:{ forumId } }`.
 * 회원제 포럼이 아니면 null 을 돌려주므로 호출부의 일반 오류 처리와 겹치지 않는다.
 */
export function closedForumIdFromError(err: unknown): string | null {
  const body = (err as { response?: { status?: number; data?: any } })?.response;
  if (body?.status !== 403) return null;
  if (body?.data?.code !== 'CLOSED_FORUM_ACCESS_DENIED') return null;
  return body?.data?.data?.forumId ?? null;
}
