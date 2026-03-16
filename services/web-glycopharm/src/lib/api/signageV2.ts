/**
 * Signage V2 API Client - GlycoPharm
 *
 * Public Content API for Digital Signage Content Hub
 *
 * WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1:
 * - globalContentApi 삭제 (clone 경로 전면 제거)
 * - publicContentApi만 유지 (인증 불필요, 공개 조회용)
 */

// ============================================================================
// Types
// ============================================================================

export type SignageMediaType = 'image' | 'video' | 'html' | 'text' | 'youtube' | 'vimeo' | 'external';
export type MediaOwnerType = 'platform' | 'organization' | 'supplier' | 'user';

export interface SignageMedia {
  id: string;
  serviceKey: string;
  organizationId?: string;
  supplierId?: string;
  name: string;
  mediaType: SignageMediaType;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  ownerType: MediaOwnerType;
  source?: ContentSource;
  creatorName?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransitionEffect = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

export interface SignagePlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;
  media?: SignageMedia;
  displayOrder: number;
  displayDuration?: number;
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
  isForced: boolean;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignagePlaylist {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  description?: string;
  defaultDuration: number;
  defaultTransition: TransitionEffect;
  totalDuration: number;
  itemCount: number;
  isActive: boolean;
  isLoop: boolean;
  items?: SignagePlaylistItem[];
  source?: ContentSource;
  creatorName?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// Public Content API
// ============================================================================

export type ContentSource = 'hq' | 'community';

import { api, API_BASE_URL } from '../apiClient';

// WO-FIX-SIGNAGE-API: Use direct API URL to avoid nginx proxy issues on Cloud Run
const getBaseUrl = (serviceKey: string = 'glycopharm') =>
  `${API_BASE_URL}/api/signage/${serviceKey}`;

/** Public Content API — 인증 불필요 (공개 조회용) */
export const publicContentApi = {
  async listPlaylists(source?: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (source) searchParams.append('source', source);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/public/playlists?${query}` : `${base}/public/playlists`;

      const response = await api.get(url);
      return { success: true, data: response.data as PaginatedResponse<SignagePlaylist> };
    } catch (error) {
      console.error('Failed to list public playlists:', error);
      return { success: false, error: 'Failed to list public playlists' };
    }
  },

  async listMedia(source?: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignageMedia>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (source) searchParams.append('source', source);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/public/media?${query}` : `${base}/public/media`;

      const response = await api.get(url);
      return { success: true, data: response.data as PaginatedResponse<SignageMedia> };
    } catch (error) {
      console.error('Failed to list public media:', error);
      return { success: false, error: 'Failed to list public media' };
    }
  },

  async getMedia(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const base = getBaseUrl(serviceKey);
      const response = await api.get<{ data: SignageMedia }>(`${base}/public/media/${id}`);
      return { success: true, data: response.data.data };
    } catch {
      return { success: false, error: 'Failed to get media' };
    }
  },

  async getPlaylist(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const base = getBaseUrl(serviceKey);
      const response = await api.get<{ data: SignagePlaylist }>(`${base}/public/playlists/${id}`);
      return { success: true, data: response.data.data };
    } catch {
      return { success: false, error: 'Failed to get playlist' };
    }
  },
};
