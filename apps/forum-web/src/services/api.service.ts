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
// Forum API Services (Domain API)
// =============================================================================

// Forum API base path - relative to Core API base
// In production, this would be a separate service endpoint
const FORUM_API_BASE = '/forum';

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

export interface Reply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
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
    canEdit?: boolean;
    canDelete?: boolean;
  };
}

export interface ThreadCreateResponse {
  success: boolean;
  data: {
    thread: Thread;
  };
  message: string;
}

export interface RepliesResponse {
  success: boolean;
  data: {
    replies: Reply[];
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

export interface ReplyCreateResponse {
  success: boolean;
  data: {
    reply: Reply;
  };
  message: string;
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

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
}

/**
 * Forum Service
 * Calls Forum API (domain API) via authClient
 */
export const forumService = {
  /**
   * Get thread list with pagination
   */
  async getThreads(params: { page?: number; limit?: number; category?: string } = {}): Promise<ThreadListResponse> {
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
  async getThread(id: string): Promise<ThreadDetailResponse> {
    const response = await authClient.api.get<ThreadDetailResponse>(`${FORUM_API_BASE}/threads/${id}`);
    return response.data;
  },

  /**
   * Create new thread (requires authentication)
   */
  async createThread(data: { title: string; content: string; category?: string }): Promise<ThreadCreateResponse> {
    const response = await authClient.api.post<ThreadCreateResponse>(`${FORUM_API_BASE}/threads`, data);
    return response.data;
  },

  /**
   * Get replies for a thread
   */
  async getReplies(threadId: string, params: { page?: number; limit?: number } = {}): Promise<RepliesResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const url = `${FORUM_API_BASE}/threads/${threadId}/replies${query ? `?${query}` : ''}`;

    const response = await authClient.api.get<RepliesResponse>(url);
    return response.data;
  },

  /**
   * Create reply to a thread (requires authentication)
   */
  async createReply(threadId: string, data: { content: string }): Promise<ReplyCreateResponse> {
    const response = await authClient.api.post<ReplyCreateResponse>(`${FORUM_API_BASE}/threads/${threadId}/replies`, data);
    return response.data;
  },

  /**
   * Get forum categories
   */
  async getCategories(): Promise<CategoriesResponse> {
    const response = await authClient.api.get<CategoriesResponse>(`${FORUM_API_BASE}/categories`);
    return response.data;
  },
};
