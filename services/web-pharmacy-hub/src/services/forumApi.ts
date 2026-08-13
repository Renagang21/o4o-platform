import { api } from '../lib/apiClient';
import type { ForumHubCategory, ForumHubPost, ForumListItem } from '@o4o/shared-space-ui';

const SERVICE_CODE = 'pharmacy-hub';

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
  const response = await api.get<ForumDirectoryResponse>('/forum/categories');
  const rows: ForumDirectoryRow[] = response.data?.data ?? [];

  return rows
    .filter((forum) => forum.serviceCode === SERVICE_CODE)
    .map((forum) => ({
      id: forum.id,
      name: forum.name,
      description: forum.description ?? null,
      iconEmoji: forum.iconEmoji ?? null,
      iconUrl: forum.iconUrl ?? null,
      postCount: 0,
    }));
}

/**
 * Service-scoped list adapter. serviceCode is always sent, including forumId-less reads,
 * so PharmacyHub never falls back to the generic cross-service list contract.
 */
export async function fetchPharmacyHubForumPosts(params: {
  forumId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'latest' | 'oldest' | 'popular';
}): Promise<PharmacyHubForumPostListResult> {
  const query = new URLSearchParams({ serviceCode: SERVICE_CODE });
  if (params.forumId) query.set('forumId', params.forumId);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);

  const response = await api.get<ForumPostListResponse>(`/forum/posts?${query.toString()}`);
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
