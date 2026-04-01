/**
 * Media Library API Client — WO-O4O-COMMON-MEDIA-PICKER-UPLOADER-V1
 *
 * 공용 미디어 라이브러리 업로드/조회 API.
 */

import { api } from '../apiClient';

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
  serviceKey: string | null;
  uploadedBy: string | null;
  isLibraryPublic: boolean;
  consentedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const mediaApi = {
  /**
   * 공용 미디어 라이브러리에 파일 업로드 (동의 필수).
   */
  async upload(
    file: File,
    consent: boolean,
    serviceKey?: string,
  ): Promise<{ success: boolean; data?: MediaAssetItem; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consent', String(consent));
      if (serviceKey) formData.append('serviceKey', serviceKey);

      const response = await api.post('/platform/media-library/upload', formData, {
        timeout: 60000,
      });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Upload failed';
      return { success: false, error: msg };
    }
  },

  /**
   * 공용 라이브러리 목록 조회.
   */
  async list(
    options?: { page?: number; limit?: number; assetType?: string },
  ): Promise<{ success: boolean; data?: MediaAssetItem[]; total?: number; page?: number; limit?: number; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.assetType) params.set('assetType', options.assetType);

      const response = await api.get(`/platform/media-library?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: 'Failed to load media library' };
    }
  },

  /**
   * 단건 조회.
   */
  async getById(id: string): Promise<{ success: boolean; data?: MediaAssetItem; error?: string }> {
    try {
      const response = await api.get(`/platform/media-library/${id}`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: 'Failed to load media asset' };
    }
  },
};
