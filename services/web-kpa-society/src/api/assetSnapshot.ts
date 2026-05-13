/**
 * Asset Snapshot API Client
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type, lifecycle_status types
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: assetType 'resource' 추가
 */

import { apiClient } from './client';
import type { LessonSnapshotContent } from '@o4o/shared-space-ui';

// WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
// LessonSnapshotContent의 정식 위치는 @o4o/shared-space-ui 이다 (LessonCardPreview와 같은 위치).
// 기존 KPA 호출처는 본 모듈에서 import 하던 패턴이므로, 호환성을 위해 re-export 한다.
export type { LessonSnapshotContent };

export type SnapshotAssetType = 'cms' | 'signage' | 'lesson' | 'content' | 'resource';

export interface AssetSnapshotItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: SnapshotAssetType;
  title: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

// WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: LessonSnapshotContent 는 @o4o/shared-space-ui로 승격됨.
// 본 모듈은 type re-export(상단)만 유지한다 — POP/QR/블로그에서도 동일 타입 재사용.

interface CopyAssetRequest {
  sourceService: string;
  sourceAssetId: string;
  assetType: SnapshotAssetType;
}

interface CopyAssetResponse {
  success: boolean;
  data: AssetSnapshotItem;
}

export interface PaginatedAssets {
  items: AssetSnapshotItem[];
  total: number;
  page: number;
  limit: number;
}

interface ListAssetsResponse {
  success: boolean;
  data: PaginatedAssets;
}

export const assetSnapshotApi = {
  /**
   * Copy a source asset to the user's store
   */
  copy: (body: CopyAssetRequest) =>
    apiClient.post<CopyAssetResponse>('/assets/copy', body),

  /**
   * List asset snapshots for the user's store (paginated)
   */
  list: (params?: { type?: SnapshotAssetType; page?: number; limit?: number }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    return apiClient.get<ListAssetsResponse>('/assets', Object.keys(query).length > 0 ? query : undefined);
  },

  /**
   * Update title/description/tags/thumbnailUrl of a store snapshot.
   * description/tags/thumbnailUrl are merged into content_json.
   */
  patch: (id: string, body: { title?: string; description?: string; tags?: string[]; thumbnailUrl?: string }) =>
    apiClient.patch<{ success: boolean; data: AssetSnapshotItem }>(`/assets/${id}`, body),

  /**
   * Delete a snapshot from the store's library.
   * Only removes the store's copy — original community asset is untouched.
   */
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; data: { deleted: boolean; id: string } }>(`/assets/${id}`),
};

// ─────────────────────────────────────────────────────
// Store Asset Control — WO-KPA-A-ASSET-CONTROL-EXTENSION-V1 / V2
// Extension layer: publish status + channel map + forced injection
// ─────────────────────────────────────────────────────

export type AssetPublishStatus = 'draft' | 'published' | 'hidden';

export type SnapshotType = 'user_copy' | 'hq_forced' | 'campaign_push' | 'template_seed';

export type LifecycleStatus = 'active' | 'expired' | 'archived';

export interface ChannelMap {
  [channelKey: string]: boolean;
}

export interface StoreAssetItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: SnapshotAssetType;
  title: string;
  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson 항목 thumbnail/lessonCount/publicUrl 표시용 (cms는 미사용)
  contentJson?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  publishStatus: AssetPublishStatus;
  controlId: string | null;
  controlUpdatedAt: string | null;
  // V2 fields
  channelMap: ChannelMap;
  isForced: boolean;
  forcedByAdminId: string | null;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  isLocked: boolean;
  // V3 fields — WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1
  snapshotType: SnapshotType;
  lifecycleStatus: LifecycleStatus;
}

export interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
  // WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: 서버 계산 totalPages 직접 사용
  totalPages: number;
}

// WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: 가상 'document' 타입 = cms + content 통합 (백엔드 정의)
export type StoreAssetListType = SnapshotAssetType | 'document';

export const storeAssetControlApi = {
  /**
   * List store assets with publish status (joined with control table).
   * WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: server-side search + pagination 지원.
   */
  list: (params?: {
    type?: StoreAssetListType;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.search) query.search = params.search;
    return apiClient.get<{ success: boolean; data: PaginatedStoreAssets }>(
      '/store-assets',
      Object.keys(query).length > 0 ? query : undefined,
    );
  },

  /**
   * Update publish status of an asset snapshot
   */
  updatePublishStatus: (snapshotId: string, status: AssetPublishStatus) =>
    apiClient.patch<{
      success: boolean;
      data: { snapshotId: string; publishStatus: AssetPublishStatus; updatedAt: string };
    }>(`/store-assets/${snapshotId}/publish`, { status }),

  /**
   * V2: Update channel map for an asset snapshot
   */
  updateChannelMap: (snapshotId: string, channelMap: ChannelMap) =>
    apiClient.patch<{
      success: boolean;
      data: { snapshotId: string; channelMap: ChannelMap; updatedAt: string };
    }>(`/store-assets/${snapshotId}/channel`, { channelMap }),
};

// ─────────────────────────────────────────────────────
// Published Assets — WO-KPA-A-ASSET-RENDER-FILTER-INTEGRATION-V1
// Public rendering: storefront / signage / promotion
// ─────────────────────────────────────────────────────

export interface PublishedAssetItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: SnapshotAssetType;
  title: string;
  contentJson: Record<string, unknown>;
  createdAt: string;
  publishStatus: AssetPublishStatus;
  channelMap: ChannelMap;
  isForced: boolean;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  snapshotType: SnapshotType;
  lifecycleStatus: LifecycleStatus;
}

export interface PaginatedPublishedAssets {
  items: PublishedAssetItem[];
  total: number;
  page: number;
  limit: number;
}

export const publishedAssetsApi = {
  /**
   * List published assets for a given organization (public)
   */
  list: (
    organizationId: string,
    params?: { channel?: string; type?: SnapshotAssetType; page?: number; limit?: number },
  ) => {
    const query: Record<string, string> = {};
    if (params?.channel) query.channel = params.channel;
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    return apiClient.get<{ success: boolean; data: PaginatedPublishedAssets }>(
      `/published-assets/${organizationId}`,
      Object.keys(query).length > 0 ? query : undefined,
    );
  },

  /**
   * Get single published asset detail (public)
   */
  get: (organizationId: string, snapshotId: string, channel?: string) => {
    const query: Record<string, string> = {};
    if (channel) query.channel = channel;
    return apiClient.get<{ success: boolean; data: PublishedAssetItem }>(
      `/published-assets/${organizationId}/${snapshotId}`,
      Object.keys(query).length > 0 ? query : undefined,
    );
  },
};

// ─────────────────────────────────────────────────────
// Store Content — WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
// Store-level independent content editing
// ─────────────────────────────────────────────────────

export interface StoreContentData {
  snapshotId: string;
  organizationId: string;
  title: string;
  contentJson: Record<string, unknown>;
  source: 'store' | 'snapshot';
  updatedAt: string | null;
  updatedBy: string | null;
}

export const storeContentApi = {
  /**
   * Get editable content for a snapshot (store override or snapshot seed)
   */
  get: (snapshotId: string) =>
    apiClient.get<{ success: boolean; data: StoreContentData }>(
      `/store-contents/${snapshotId}`,
    ),

  /**
   * Save (upsert) store content
   */
  save: (snapshotId: string, body: { title: string; contentJson: Record<string, unknown> }) =>
    apiClient.put<{ success: boolean; data: StoreContentData }>(
      `/store-contents/${snapshotId}`,
      body,
    ),
};

// ─── Direct Content API (WO-O4O-STORE-CONTENT-DIRECT-DETAIL-EDIT-UX-V1) ──────

export interface DirectContentItem {
  id: string;
  sourceType: 'direct';
  title: string;
  contentJson: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string | null;
}

export const directContentApi = {
  /** 내 매장 direct 콘텐츠 목록 (GET /store-contents 에서 source_type='direct' 필터) */
  list: () =>
    apiClient.get<{ success: boolean; data: Array<{ id: string; sourceType: string; snapshotId: string | null; title: string; updatedAt: string; shareStatus: string | null; sharedAt: string | null; sharedRequestId: string | null }> }>(
      '/store-contents',
    ),

  /** direct 콘텐츠 상세 */
  get: (id: string) =>
    apiClient.get<{ success: boolean; data: DirectContentItem }>(
      `/store-contents/direct/${id}`,
    ),

  /** direct 콘텐츠 수정 */
  update: (id: string, body: { title?: string; contentJson?: Record<string, unknown> }) =>
    apiClient.put<{ success: boolean; data: DirectContentItem }>(
      `/store-contents/direct/${id}`,
      body,
    ),

  /** direct 콘텐츠 삭제 */
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; data: { deleted: boolean; id: string } }>(
      `/store-contents/direct/${id}`,
    ),
};

// ─────────────────────────────────────────────────────
// Store Library Unified Feed — WO-O4O-STORE-LIBRARY-DIRECT-CONTENT-UNIFIED-V1
// snapshot(cms+content) + direct contents 통합 paginated feed
// ─────────────────────────────────────────────────────

export type LibraryContentOrigin = 'snapshot' | 'direct';

export interface LibraryContentItem {
  id: string;
  origin: LibraryContentOrigin;
  selectionKey: string;
  /** snapshot 인 경우 'cms'|'content', direct 인 경우 null */
  assetType: string | null;
  title: string;
  contentJson: Record<string, unknown>;
  /** snapshot.created_at 또는 direct.updated_at — 통합 정렬 기준 */
  createdAt: string;
  /** snapshot 의 lifecycle 상태. direct 는 null */
  lifecycleStatus: string | null;
}

export interface PaginatedLibraryContents {
  items: LibraryContentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const storeLibraryApi = {
  /**
   * 내 자료함 콘텐츠 통합 feed (snapshot + direct UNION paginated).
   * 서버에서 sort_at DESC 기준 단일 페이지네이션 — 클라이언트 merge 불필요.
   */
  listContents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'document';
  }) => {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.search) query.search = params.search;
    if (params?.type) query.type = params.type;
    return apiClient.get<{ success: boolean; data: PaginatedLibraryContents }>(
      '/store-library/contents',
      Object.keys(query).length > 0 ? query : undefined,
    );
  },
};
