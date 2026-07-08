/**
 * Media Library API Client — GlycoPharm
 *
 * WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1
 *
 * 플랫폼 공용 미디어 라이브러리 API(/api/v1/platform/media-library)를 GlycoPharm authClient 기반으로 호출.
 * 공용 MediaPickerModal(@o4o/store-ui-core) 의 api 어댑터로 주입된다.
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
  folder: string;
  serviceKey: string | null;
  uploadedBy: string | null;
  isLibraryPublic: boolean;
  consentedAt: string;
  createdAt: string;
  updatedAt: string;
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

      const response = await api.post('/platform/media-library/upload', formData, {
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Upload failed';
      return { success: false, error: msg };
    }
  },

  async list(
    options?: { page?: number; limit?: number; assetType?: string; folder?: string },
  ): Promise<{ success: boolean; data?: MediaAssetItem[]; total?: number; page?: number; limit?: number; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.assetType) params.set('assetType', options.assetType);
      if (options?.folder) params.set('folder', options.folder);

      const response = await api.get(`/platform/media-library?${params.toString()}`);
      return response.data;
    } catch {
      return { success: false, error: 'Failed to load media library' };
    }
  },

  async getById(id: string): Promise<{ success: boolean; data?: MediaAssetItem; error?: string }> {
    try {
      const response = await api.get(`/platform/media-library/${id}`);
      return response.data;
    } catch {
      return { success: false, error: 'Failed to load media asset' };
    }
  },

  async moveToFolder(assetId: string, folder: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/platform/media-library/${assetId}/folder`, { folder });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'Failed to move asset' };
    }
  },

  async deleteAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/platform/media-library/${assetId}`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.error || 'Failed to delete asset' };
    }
  },
};
