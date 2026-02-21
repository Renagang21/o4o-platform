/**
 * Asset Snapshot API Client
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 */

import { apiClient } from './client';

export interface AssetSnapshotItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  title: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface CopyAssetRequest {
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
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
  list: (params?: { type?: 'cms' | 'signage'; page?: number; limit?: number }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    return apiClient.get<ListAssetsResponse>('/assets', Object.keys(query).length > 0 ? query : undefined);
  },
};

// ─────────────────────────────────────────────────────
// Store Asset Control — WO-KPA-A-ASSET-CONTROL-EXTENSION-V1 / V2
// Extension layer: publish status + channel map + forced injection
// ─────────────────────────────────────────────────────

export type AssetPublishStatus = 'draft' | 'published' | 'hidden';

export interface ChannelMap {
  [channelKey: string]: boolean;
}

export interface StoreAssetItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
  title: string;
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
}

export interface PaginatedStoreAssets {
  items: StoreAssetItem[];
  total: number;
  page: number;
  limit: number;
}

export const storeAssetControlApi = {
  /**
   * List store assets with publish status (joined with control table)
   */
  list: (params?: { type?: 'cms' | 'signage'; page?: number; limit?: number }) => {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
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
  assetType: 'cms' | 'signage';
  title: string;
  contentJson: Record<string, unknown>;
  createdAt: string;
  publishStatus: AssetPublishStatus;
  channelMap: ChannelMap;
  isForced: boolean;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
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
    params?: { channel?: string; type?: 'cms' | 'signage'; page?: number; limit?: number },
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
