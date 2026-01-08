/**
 * GlycoPharm API Client
 * 실제 API 서버와 통신하는 클라이언트
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    // Cross-domain: Bearer Token 인증 (localStorage에서 토큰 가져옴)
    const accessToken = getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options?.headers,
    };

    try {
      // credentials: 'include'는 같은 도메인에서만 쿠키를 전송 (폴백)
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || {
            code: 'API_ERROR',
            message: data.message || 'API request failed',
          },
        };
      }

      return data;
    } catch (error) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }

  async get<T>(path: string, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  async patch<T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T>(path: string, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: unknown; accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
      email,
      password
    }),

  logout: () => apiClient.post('/api/v1/auth/logout'),

  me: () => apiClient.get<{ user: unknown }>('/api/v1/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', { refreshToken }),
};

// GlycoPharm Display API
export const displayApi = {
  // Playlists
  getPlaylists: (params?: { pharmacy_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.pharmacy_id) query.set('pharmacy_id', params.pharmacy_id);
    if (params?.status) query.set('status', params.status);
    return apiClient.get<unknown[]>(`/api/v1/glycopharm/display/playlists?${query}`);
  },

  getPlaylist: (id: string) =>
    apiClient.get<unknown>(`/api/v1/glycopharm/display/playlists/${id}`),

  createPlaylist: (data: { name: string; description?: string; pharmacy_id?: string; is_public?: boolean }) =>
    apiClient.post<unknown>('/api/v1/glycopharm/display/playlists', data),

  updatePlaylist: (id: string, data: unknown) =>
    apiClient.put<unknown>(`/api/v1/glycopharm/display/playlists/${id}`, data),

  deletePlaylist: (id: string) =>
    apiClient.delete(`/api/v1/glycopharm/display/playlists/${id}`),

  // Playlist Items
  addPlaylistItem: (playlistId: string, data: { media_id: string; sort_order?: number; play_duration?: number; transition_type?: string }) =>
    apiClient.post<unknown>(`/api/v1/glycopharm/display/playlists/${playlistId}/items`, data),

  removePlaylistItem: (playlistId: string, itemId: string) =>
    apiClient.delete(`/api/v1/glycopharm/display/playlists/${playlistId}/items/${itemId}`),

  // Media
  getMedia: (params?: { pharmacy_id?: string; source_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.pharmacy_id) query.set('pharmacy_id', params.pharmacy_id);
    if (params?.source_type) query.set('source_type', params.source_type);
    return apiClient.get<unknown[]>(`/api/v1/glycopharm/display/media?${query}`);
  },

  createMedia: (data: { name: string; source_type: string; source_url: string; embed_id: string; pharmacy_id?: string; thumbnail_url?: string; duration?: number; description?: string }) =>
    apiClient.post<unknown>('/api/v1/glycopharm/display/media', data),

  deleteMedia: (id: string) =>
    apiClient.delete(`/api/v1/glycopharm/display/media/${id}`),

  // Schedules
  getSchedules: (params?: { pharmacy_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.pharmacy_id) query.set('pharmacy_id', params.pharmacy_id);
    return apiClient.get<unknown[]>(`/api/v1/glycopharm/display/schedules?${query}`);
  },

  createSchedule: (data: { name: string; pharmacy_id: string; playlist_id: string; days_of_week: number[]; start_time: string; end_time: string; priority?: number }) =>
    apiClient.post<unknown>('/api/v1/glycopharm/display/schedules', data),

  updateSchedule: (id: string, data: unknown) =>
    apiClient.put<unknown>(`/api/v1/glycopharm/display/schedules/${id}`, data),

  deleteSchedule: (id: string) =>
    apiClient.delete(`/api/v1/glycopharm/display/schedules/${id}`),

  // Shared Playlists (Forum)
  getSharedPlaylists: () =>
    apiClient.get<unknown[]>('/api/v1/glycopharm/display/shared-playlists'),

  likePlaylist: (id: string) =>
    apiClient.post(`/api/v1/glycopharm/display/shared-playlists/${id}/like`),

  importPlaylist: (id: string, pharmacyId: string) =>
    apiClient.post<unknown>(`/api/v1/glycopharm/display/shared-playlists/${id}/import`, { pharmacy_id: pharmacyId }),
};

// Forum Category Request API
export const forumRequestApi = {
  // User APIs
  create: (data: { name: string; description: string; reason?: string }) =>
    apiClient.post<unknown>('/api/v1/glycopharm/forum-requests', data),

  getMyRequests: () =>
    apiClient.get<unknown[]>('/api/v1/glycopharm/forum-requests/my'),

  getRequest: (id: string) =>
    apiClient.get<unknown>(`/api/v1/glycopharm/forum-requests/${id}`),

  // Admin APIs
  getAllRequests: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return apiClient.get<unknown[]>(`/api/v1/glycopharm/forum-requests/admin/all?${query}`);
  },

  getPendingCount: () =>
    apiClient.get<{ count: number }>('/api/v1/glycopharm/forum-requests/admin/pending-count'),

  review: (id: string, data: { status: 'approved' | 'rejected'; review_comment?: string }) =>
    apiClient.patch<unknown>(`/api/v1/glycopharm/forum-requests/${id}/review`, data),
};
