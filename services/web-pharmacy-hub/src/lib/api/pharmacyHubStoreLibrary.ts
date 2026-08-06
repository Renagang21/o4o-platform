/**
 * Pharmacy-Hub 자료함 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreLibraryController.ts):
 *   GET    /pharmacy-hub/store-owner/library
 *   POST   /pharmacy-hub/store-owner/library
 *   PUT    /pharmacy-hub/store-owner/library/:id
 *   DELETE /pharmacy-hub/store-owner/library/:id   (비활성화 — 물리 삭제 아님)
 *
 * ⚠️ organizationId 는 **보내지 않는다.** 서버가 Pharmacy-Hub enrollment 로 결정한다.
 *
 * 원장은 공통 `store_execution_assets` 다 — 신규 테이블 0.
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/library';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

export type LibraryAssetType = 'file' | 'content' | 'external-link';

export interface LibraryAsset {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  category?: string | null;
  assetType: string;
  usageType?: string | null;
  url?: string | null;
  htmlContent?: string | null;
  sourceType: string;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LibraryPage {
  storeConnection: StoreConnectionState;
  items: LibraryAsset[];
  page: number;
  limit: number;
  total: number;
}

export interface LibraryAssetInput {
  title: string;
  description?: string;
  category?: string;
  assetType: LibraryAssetType;
  /** assetType='external-link' 필수 */
  url?: string;
  /** assetType='content' 필수 */
  htmlContent?: string;
  /** assetType='file' */
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sourceType?: string;
}

export async function fetchLibraryAssets(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}): Promise<LibraryPage> {
  const res = await api.get(BASE, { params });
  return unwrap<LibraryPage>(res.data, '자료함을 불러오지 못했습니다.');
}

export async function createLibraryAsset(input: LibraryAssetInput): Promise<LibraryAsset> {
  const res = await api.post(BASE, input);
  return unwrap<LibraryAsset>(res.data, '자료를 등록하지 못했습니다.');
}

export async function updateLibraryAsset(
  id: string,
  input: Partial<LibraryAssetInput>,
): Promise<LibraryAsset> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<LibraryAsset>(res.data, '자료를 수정하지 못했습니다.');
}

/** 비활성화(soft delete). 공통 구조에 물리 삭제 경로가 없으며 새로 만들지 않는다. */
export async function deactivateLibraryAsset(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, '자료를 삭제하지 못했습니다.');
}
