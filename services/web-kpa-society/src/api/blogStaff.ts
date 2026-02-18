/**
 * Blog Staff API Client — Authenticated
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * Calls staff-only blog endpoints with auth token.
 */

import { getAccessToken } from '../contexts/AuthContext';

const GLYCOPHARM_API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
  : '/api/v1/glycopharm';

export interface StaffBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json;
}

export async function fetchStaffBlogPosts(
  slug: string,
  params?: { page?: number; limit?: number; status?: string },
): Promise<{ data: StaffBlogPost[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);

  const qs = query.toString();
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function createBlogPost(
  slug: string,
  body: { title: string; content: string; excerpt?: string; slug?: string },
): Promise<StaffBlogPost> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff`;
  const json = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
  return json.data;
}

export async function updateBlogPost(
  slug: string,
  postId: string,
  body: { title?: string; content?: string; excerpt?: string; slug?: string },
): Promise<StaffBlogPost> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff/${postId}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  return json.data;
}

export async function publishBlogPost(slug: string, postId: string): Promise<StaffBlogPost> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff/${postId}/publish`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function archiveBlogPost(slug: string, postId: string): Promise<StaffBlogPost> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff/${postId}/archive`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function deleteBlogPost(slug: string, postId: string): Promise<void> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/blog/staff/${postId}`;
  await authFetch(url, { method: 'DELETE' });
}
