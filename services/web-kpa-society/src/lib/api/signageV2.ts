/**
 * Signage V2 API Client - KPA-Society
 *
 * Global Content API for Digital Signage Content Hub
 */

import { authClient } from '@o4o/auth-client';

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
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransitionEffect = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

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

export type ContentSource = 'hq' | 'supplier' | 'community';

const getBaseUrl = (serviceKey: string = 'kpa-society') =>
  `/api/signage/${serviceKey}`;

export const globalContentApi = {
  async listPlaylists(source: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/global/playlists/${source}?${query}` : `${base}/global/playlists/${source}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Failed to list ${source} playlists:`, error);
      return { success: false, error: `Failed to list ${source} playlists` };
    }
  },

  async listMedia(source: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignageMedia>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/global/media/${source}?${query}` : `${base}/global/media/${source}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Failed to list ${source} media:`, error);
      return { success: false, error: `Failed to list ${source} media` };
    }
  },

  async clonePlaylist(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/playlists/${id}/clone`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to clone playlist:', error);
      return { success: false, error: 'Failed to clone playlist' };
    }
  },

  async cloneMedia(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/media/${id}/clone`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to clone media:', error);
      return { success: false, error: 'Failed to clone media' };
    }
  },
};
