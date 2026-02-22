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
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const getBaseUrl = (serviceKey: string = 'neture') =>
  `${API_BASE}/api/signage/${serviceKey}`;

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

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
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

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to list public playlists:', error);
      return { success: false, error: 'Failed to list public playlists' };
    }
  },

  async getPlaylist(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const base = getBaseUrl(serviceKey);
      const response = await fetch(`${base}/public/playlists/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return { success: true, data: json.data };
    } catch (error) {
      console.error('Failed to get public playlist:', error);
      return { success: false, error: 'Failed to get public playlist' };
    }
  },

  async getMedia(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const base = getBaseUrl(serviceKey);
      const response = await fetch(`${base}/public/media/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return { success: true, data: json.data };
    } catch (error) {
      console.error('Failed to get public media:', error);
      return { success: false, error: 'Failed to get public media' };
    }
  },
};

