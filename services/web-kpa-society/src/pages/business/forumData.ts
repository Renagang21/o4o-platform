import type { ForumCategoryResponse, ForumCommentResponse, ForumListResponse, ForumPostResponse } from '@o4o/types/forum';
import type { ForumListItem } from '@o4o/shared-space-ui';
import { authClient } from '../../contexts/AuthContext';
import { businessApi } from './api';

export type ForumView = 'posts' | 'post' | 'write' | 'mine';
interface ForumQuery {
  apiBase: string; base: string; view: ForumView; slug?: string; editId: string | null;
  page: number; category: string; boardSlug: string; commentLimit: number;
}
interface ForumData {
  post?: ForumPostResponse; comments?: ForumCommentResponse[]; commentTotal?: number;
  posts?: ForumListItem[]; totalPages?: number;
}

function listItem(item: ForumPostResponse, base: string): ForumListItem {
  return { id: item.id, title: item.title, postType: item.type as ForumListItem['postType'],
    authorName: item.author?.nickname || item.author?.name || '참여자', createdAt: item.createdAt,
    commentCount: item.commentCount, likeCount: item.likeCount, isPinned: item.isPinned,
    routeTo: `${base}/post/${encodeURIComponent(item.slug)}` };
}

/** Keep category metadata available when a closed board rejects its post list. */
export async function loadBusinessForumData(query: Readonly<ForumQuery>, onCategories: (rows: ForumCategoryResponse[]) => void): Promise<ForumData> {
  const { apiBase, view, editId, slug, commentLimit } = query;
  if (view === 'post' || (view === 'write' && editId)) {
    const post = await businessApi.get<ForumPostResponse>(`${apiBase}/posts/${encodeURIComponent(editId || slug || '')}`);
    if (view !== 'post') return { post };
    const response = await authClient.api.get(`${apiBase}/posts/${post.id}/comments`, { params: { limit: commentLimit } });
    const replies = response.data as ForumListResponse<ForumCommentResponse>;
    return { post, comments: replies.data, commentTotal: replies.totalCount ?? 0 };
  }
  const boards = await businessApi.get<ForumCategoryResponse[]>(`${apiBase}/categories`);
  onCategories(boards);
  if (view === 'write') return {};
  const category = query.category || boards.find(board => board.slug === query.boardSlug)?.id || undefined;
  const response = await authClient.api.get(`${apiBase}/posts`, { params: {
    page: query.page, limit: 20, category, author: view === 'mine' ? 'me' : undefined,
  } });
  const rows = response.data as ForumListResponse<ForumPostResponse>;
  return { totalPages: rows.pagination?.totalPages || 1, posts: rows.data.map(post => listItem(post, query.base)) };
}
