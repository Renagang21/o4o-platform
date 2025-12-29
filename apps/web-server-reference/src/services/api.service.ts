/**
 * API Service
 * =============================================================================
 * Centralized API call functions using authClient.
 *
 * Rules (from web-server-architecture.md):
 * - All API calls MUST use authClient.api
 * - No direct axios/fetch usage
 * - No hardcoded API URLs
 * =============================================================================
 */

import { authClient } from '@o4o/auth-client';

// =============================================================================
// Core API Services
// =============================================================================

export const userService = {
  /**
   * Get current user profile from Core API
   */
  async getProfile() {
    const response = await authClient.api.get('/users/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  async updateProfile(data: { name?: string; email?: string }) {
    const response = await authClient.api.put('/users/me', data);
    return response.data;
  },
};

// =============================================================================
// Forum API Services (Domain API Example)
// =============================================================================

const FORUM_API_BASE = '/forum'; // Relative to Core API base

export interface Thread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  viewCount: number;
  category: string;
}

export interface ThreadListResponse {
  success: boolean;
  data: {
    threads: Thread[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  meta?: {
    authenticated: boolean;
  };
}

export interface ThreadDetailResponse {
  success: boolean;
  data: {
    thread: Thread;
  };
  meta?: {
    authenticated: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

/**
 * Forum Service
 * Calls Forum API (domain API) via authClient
 *
 * NOTE: In production, Forum API would be a separate service.
 * For this reference, we demonstrate the pattern of calling domain APIs.
 */
export const forumService = {
  /**
   * Get thread list with pagination
   */
  async getThreads(params: { page?: number; limit?: number; category?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);

    const query = queryParams.toString();
    const url = `${FORUM_API_BASE}/threads${query ? `?${query}` : ''}`;

    const response = await authClient.api.get<ThreadListResponse>(url);
    return response.data;
  },

  /**
   * Get single thread by ID
   */
  async getThread(id: string) {
    const response = await authClient.api.get<ThreadDetailResponse>(`${FORUM_API_BASE}/threads/${id}`);
    return response.data;
  },

  /**
   * Create new thread (requires authentication)
   */
  async createThread(data: { title: string; content: string; category?: string }) {
    const response = await authClient.api.post(`${FORUM_API_BASE}/threads`, data);
    return response.data;
  },

  /**
   * Get forum categories
   */
  async getCategories() {
    const response = await authClient.api.get<CategoriesResponse>(`${FORUM_API_BASE}/categories`);
    return response.data;
  },
};
