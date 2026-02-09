/**
 * Signage V2 API Client - Neture
 *
 * Global Content API for Digital Signage Content Hub
 * APP-SIGNAGE Phase 1: Types from @o4o/types/signage
 *
 * WO-APP-SIGNAGE-PUBLIC-API-PHASE1-V1:
 * - publicContentApi: 인증 불필요 (공개 조회용) ← 우선 사용
 * - globalContentApi: 인증 필수 (Clone 등 관리용)
 */

import { authClient } from '@o4o/auth-client';
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

const getBaseUrl = (serviceKey: string = 'neture') =>
  `/api/signage/${serviceKey}`;

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

/**
 * Global Content API - 인증 필수
 * Clone 등 관리 기능에 사용
 */
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
