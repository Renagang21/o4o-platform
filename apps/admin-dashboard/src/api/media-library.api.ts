/**
 * Media Library Upload API
 *
 * WO-STORE-IMAGE-PASTE-SUPPORT-V1
 *
 * 에디터 이미지 붙여넣기·업로드 공통 헬퍼.
 * POST /api/v1/platform/media-library/upload 를 호출한다.
 * - consent: 'true' 자동 포함 (에디터에 직접 붙여넣거나 선택하는 행위 = 묵시적 동의)
 * - folder: 콘텐츠 유형별 자동 분류 (blog / product / pop / qr / general)
 */

import { authClient } from '@o4o/auth-client';

/**
 * 파일을 공용 미디어 라이브러리에 업로드하고 URL을 반환한다.
 *
 * @param file   업로드할 이미지 파일
 * @param folder 저장 폴더 (기본값: 'general')
 * @returns      GCS 공개 URL
 * @throws       업로드 실패 시 Error
 */
export async function uploadImageForEditor(
  file: File,
  folder: string = 'general',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('consent', 'true');
  formData.append('folder', folder);

  const res = await authClient.api.post<{ success: boolean; data?: { url: string }; error?: string }>(
    '/platform/media-library/upload',
    formData,
  );

  if (!res.data?.success || !res.data?.data?.url) {
    throw new Error(res.data?.error || '이미지 업로드에 실패했습니다.');
  }
  return res.data.data.url;
}

// ─── Content Resource: media_assets 관리 (WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1) ───
//   /platform/media-library(=media_assets) 목록 + metadata 수정. 레거시 /content/media 와 별개.

export interface MediaAssetAdmin {
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
  // Content Resource metadata
  title: string | null;
  description: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  language: string | null;
  source: string | null;
  usageType: string | null;
  status: string | null;
  memo: string | null;
  updatedBy: string | null;
}

export interface MediaAssetMetadataPatch {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  keywords?: string[] | null;
  language?: string | null;
  source?: string | null;
  usageType?: string | null;
  status?: string | null;
  memo?: string | null;
  isLibraryPublic?: boolean;
}

/** media_assets 목록 (공개 자산). GET /platform/media-library */
export async function listMediaAssets(
  params: { page?: number; limit?: number; assetType?: string; folder?: string } = {},
): Promise<{ data: MediaAssetAdmin[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.assetType) qs.set('assetType', params.assetType);
  if (params.folder) qs.set('folder', params.folder);
  const res = await authClient.api.get<{ success: boolean; data?: MediaAssetAdmin[]; total?: number; page?: number; limit?: number }>(
    `/platform/media-library?${qs.toString()}`,
  );
  return {
    data: res.data?.data ?? [],
    total: res.data?.total ?? 0,
    page: res.data?.page ?? 1,
    limit: res.data?.limit ?? 20,
  };
}

/** metadata 수정. PATCH /platform/media-library/:id/metadata (파일 속성 불변) */
export async function updateMediaAssetMetadata(
  id: string,
  patch: MediaAssetMetadataPatch,
): Promise<MediaAssetAdmin> {
  const res = await authClient.api.patch<{ success: boolean; data?: MediaAssetAdmin; error?: string }>(
    `/platform/media-library/${id}/metadata`,
    patch,
  );
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.error || 'metadata 저장에 실패했습니다.');
  }
  return res.data.data;
}
