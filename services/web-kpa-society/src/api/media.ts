/**
 * Media Library API Client — KPA Society
 *
 * WO-KPA-A-HOME-EXPOSURE-MENU-RELOCATION-AND-MEDIA-PICKER-V1
 *
 * 플랫폼 공용 미디어 라이브러리 API를 KPA apiClient 기반으로 호출.
 * 엔드포인트: /api/v1/platform/media-library (KPA namespace 밖)
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

const PLATFORM_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

export interface MediaAssetItem {
  id: string;
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  assetType: string;
  width: number | null;
  height: number | null;
  folder: string;
  serviceKey: string | null;
  uploadedBy: string | null;
  isLibraryPublic: boolean;
  consentedAt: string;
  createdAt: string;
  updatedAt: string;
}

async function platformFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${PLATFORM_BASE}${path}`;
  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }

  return response.json() as Promise<T>;
}

export const mediaApi = {
  async upload(
    file: File,
    consent: boolean,
    serviceKey?: string,
    folder?: string,
  ): Promise<{ success: boolean; data?: MediaAssetItem; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consent', String(consent));
      if (serviceKey) formData.append('serviceKey', serviceKey);
      if (folder) formData.append('folder', folder);

      return await platformFetch('/platform/media-library/upload', {
        method: 'POST',
        body: formData,
        // Content-Type은 FormData가 자동으로 설정하므로 지정하지 않음
      });
    } catch {
      return { success: false, error: '업로드에 실패했습니다.' };
    }
  },

  async list(
    options?: { page?: number; limit?: number; assetType?: string; folder?: string },
  ): Promise<{ success: boolean; data?: MediaAssetItem[]; total?: number; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.assetType) params.set('assetType', options.assetType);
      if (options?.folder) params.set('folder', options.folder);

      return await platformFetch(`/platform/media-library?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return { success: false, error: '미디어 목록을 불러오지 못했습니다.' };
    }
  },

  async moveToFolder(
    assetId: string,
    folder: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await platformFetch(`/platform/media-library/${assetId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
    } catch {
      return { success: false, error: '폴더 이동에 실패했습니다.' };
    }
  },

  async deleteAsset(
    assetId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await platformFetch(`/platform/media-library/${assetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return { success: false, error: '삭제에 실패했습니다.' };
    }
  },
};
