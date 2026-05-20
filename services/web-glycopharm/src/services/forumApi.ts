/**
 * GlycoPharm Forum API
 *
 * WO-O4O-GLYCOPHARM-FORUM-API-CANONICAL-V1
 *
 * Canonical endpoint: /api/v1/forum/* (common forum API)
 * Pattern: K-Cosmetics forumApi.ts 기준 정렬
 */

import { api } from '@/lib/apiClient';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ForumCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  iconUrl?: string | null;
  iconEmoji?: string | null;
  postCount: number;
  isPinned?: boolean;
}

export interface ForumPostAuthor {
  id: string;
  name?: string;
  nickname?: string | null;
  email?: string;
}

export interface ForumPost {
  id: string;
  title: string;
  excerpt?: string;
  slug?: string;
  author?: ForumPostAuthor | null;
  authorId?: string;
  category?: { id: string; name: string; slug?: string } | null;
  categoryId?: string;
  viewCount: number;
  commentCount: number;
  likeCount?: number;
  createdAt: string;
  isPinned?: boolean;
  status?: string;
}

export interface ForumPostDetail extends ForumPost {
  content: string;
}

export interface ForumComment {
  id: string;
  content: string;
  authorId: string;
  author?: ForumPostAuthor | null;
  createdAt: string;
  updatedAt?: string;
}

export function getAuthorName(post: { author?: ForumPostAuthor | null }): string {
  return post.author?.nickname || post.author?.name || '익명';
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

export async function fetchForumCategories(): Promise<ForumCategory[]> {
  const response = await api.get('/forum/categories');
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
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

export async function createForumPost(payload: {
  title: string;
  categoryId: string;
  type: string;
  content: string;
}): Promise<{ success: boolean; data?: { id: string }; id?: string; error?: string }> {
  const response = await api.post('/forum/posts', payload);
  return response.data;
}
