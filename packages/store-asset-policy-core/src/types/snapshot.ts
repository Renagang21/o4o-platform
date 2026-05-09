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
  // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: 'lesson' 추가 (LMS 강의 Reference Metadata)
  assetType: 'cms' | 'signage' | 'lesson';
  title: string;
  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson 항목 메타(thumbnail/instructor/lessonCount/publicUrl) 표시용
  contentJson?: Record<string, unknown>;
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

// WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: 'lesson' 추가
export type TabKey = 'all' | 'cms' | 'signage' | 'lesson';
export type StatusFilter = 'all' | 'published' | 'draft' | 'hidden';
export type PolicyFilter = 'all' | 'user_copy' | 'hq_forced' | 'campaign_push' | 'expiring_soon' | 'expired';
export type ChannelFilter = 'all' | 'home' | 'signage' | 'promotion';
export type SortKey = 'newest' | 'forced-first' | 'published-first';
