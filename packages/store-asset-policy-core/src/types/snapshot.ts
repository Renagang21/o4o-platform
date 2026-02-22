/**
 * Store Hub Core Types — Snapshot Policy & Asset Item
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 *
 * Platform-common types for store asset management.
 * Each service's API client must return items conforming to StoreAssetItem.
 */

export type AssetPublishStatus = 'draft' | 'published' | 'hidden';
export type SnapshotType = 'user_copy' | 'hq_forced' | 'campaign_push' | 'template_seed';
export type LifecycleStatus = 'active' | 'expired' | 'archived';

export interface ChannelMap {
  [channelKey: string]: boolean;
}

/** Canonical store asset item — shared across all services */
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
  channelMap: ChannelMap;
  isForced: boolean;
  forcedByAdminId: string | null;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  isLocked: boolean;
  snapshotType: SnapshotType;
  lifecycleStatus: LifecycleStatus;
}

export type TabKey = 'all' | 'cms' | 'signage';
export type StatusFilter = 'all' | 'published' | 'draft' | 'hidden';
export type PolicyFilter = 'all' | 'user_copy' | 'hq_forced' | 'campaign_push' | 'expiring_soon' | 'expired';
export type ChannelFilter = 'all' | 'home' | 'signage' | 'promotion';
export type SortKey = 'newest' | 'forced-first' | 'published-first';
