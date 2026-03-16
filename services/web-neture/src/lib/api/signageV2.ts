/**
 * Signage V2 API Client - Neture
 *
 * Global Content API for Digital Signage Content Hub
 * APP-SIGNAGE Phase 1: Types from @o4o/types/signage
 *
 * WO-APP-SIGNAGE-PUBLIC-API-PHASE1-V1:
 * - publicContentApi: 인증 불필요 (공개 조회용)
 *
 * WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1:
 * - globalContentApi 삭제 (clone 경로 전면 제거)
 *
 * NOTE: Signage uses /api/signage/ prefix (NOT /api/v1/), so raw fetch is used
 * with API_BASE_URL for these endpoints.
 */

import type {
  SignageMediaResponse,
  SignagePlaylistResponse,
  SignagePlaylistItemResponse,
  SignageMediaType,
  MediaOwnerType,
  TransitionEffect,
  ContentSource,
  SignagePaginatedResponse,
} from '@o4o/types/signage';

// Re-export shared types with local aliases for backward compatibility
export type SignageMedia = SignageMediaResponse;
export type SignagePlaylist = SignagePlaylistResponse;
export type SignagePlaylistItem = SignagePlaylistItemResponse;
export type { SignageMediaType, MediaOwnerType, TransitionEffect, ContentSource };

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

type PaginatedResponse<T> = SignagePaginatedResponse<T>;

// WO-FIX-SIGNAGE-API: Use direct API URL to avoid nginx proxy issues on Cloud Run
import { api, API_BASE_URL } from '../apiClient';
const getBaseUrl = (serviceKey: string = 'neture') =>
  `${API_BASE_URL}/api/signage/${serviceKey}`;

/**
 * Public Content API - 인증 불필요
 * 비로그인 사용자도 콘텐츠 조회 가능
 */
export const publicContentApi = {
  async listMedia(source?: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignageMedia>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (source) searchParams.append('source', source);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/public/media?${query}` : `${base}/public/media`;

      const { data } = await api.get(url);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to list public media:', error);
      return { success: false, error: 'Failed to list public media' };
    }
  },

  async listPlaylists(source?: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (source) searchParams.append('source', source);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/public/playlists?${query}` : `${base}/public/playlists`;

      const { data } = await api.get(url);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to list public playlists:', error);
      return { success: false, error: 'Failed to list public playlists' };
    }
  },

  async getPlaylist(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const base = getBaseUrl(serviceKey);
      const { data: json } = await api.get(`${base}/public/playlists/${id}`);
      return { success: true, data: json.data };
    } catch (error) {
      console.error('Failed to get public playlist:', error);
      return { success: false, error: 'Failed to get public playlist' };
    }
  },

  async getMedia(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const base = getBaseUrl(serviceKey);
      const { data: json } = await api.get(`${base}/public/media/${id}`);
      return { success: true, data: json.data };
    } catch (error) {
      console.error('Failed to get public media:', error);
      return { success: false, error: 'Failed to get public media' };
    }
  },
};
