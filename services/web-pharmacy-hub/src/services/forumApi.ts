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

/** Service-scoped list adapter — base 자체가 PharmacyHub 컨텍스트다. */
export async function fetchPharmacyHubForumPosts(params: {
  forumId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'latest' | 'oldest' | 'popular';
}): Promise<PharmacyHubForumPostListResult> {
  const query = new URLSearchParams();
  if (params.forumId) query.set('forumId', params.forumId);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);

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
