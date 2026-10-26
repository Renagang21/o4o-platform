import type {
LibraryContentItem as BaseLibraryContentItem,
PaginatedLibraryContents as BasePaginatedLibraryContents,
LibraryListParams,
LibrarySource,
} from "@o4o/store-ui-core/api/assetSnapshot";
import { createStoreLibraryClient } from "@o4o/store-ui-core/api/assetSnapshot";
export interface LibraryContentItem extends BaseLibraryContentItem {
  sourceGroup?: "franchise" | "operator" | "community" | "mine";
  sourceName?: string | null;
  sourceBusinessKey?: string | null;
}
export type PaginatedLibraryContents =
  BasePaginatedLibraryContents<LibraryContentItem>;
type StoreLibraryParams = LibraryListParams<LibrarySource | "franchise"> & {
  business?: string;
};

import { createAssetSnapshotClients } from "@o4o/store-ui-core/api/assetSnapshot";
export type {
AssetPublishStatus,
AssetSnapshotItem,
ChannelMap,
DirectContentItem,
HandledProductSourceType,
LibraryContentOrigin,
LifecycleStatus,
LinkedContentItem,
PaginatedAssets,
PaginatedPublishedAssets,
PaginatedStoreAssets,
PublishedAssetItem,
SnapshotAssetType,
SnapshotType,
StoreAssetItem,
StoreAssetListType,
StoreContentData,
StoreContentUsage,
StoreDescriptionItem
} from "@o4o/store-ui-core/api/assetSnapshot";

/**
 * Asset Snapshot API Client
 *
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1 (pagination)
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type, lifecycle_status types
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: assetType 'resource' 추가
 */

import type { LessonSnapshotContent } from "@o4o/shared-space-ui";
import { apiClient } from "./client";

// WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1
// LessonSnapshotContent의 정식 위치는 @o4o/shared-space-ui 이다 (LessonCardPreview와 같은 위치).
// 기존 KPA 호출처는 본 모듈에서 import 하던 패턴이므로, 호환성을 위해 re-export 한다.
export type { LessonSnapshotContent };

export const {
  assetSnapshotApi,
  storeAssetControlApi,
  publishedAssetsApi,
  storeContentApi,
  directContentApi,
  handledProductContentApi,
  storeDescriptionApi,
} = createAssetSnapshotClients({ apiClient });
export const storeLibraryApi = createStoreLibraryClient<
  LibraryContentItem,
  StoreLibraryParams
>({
  apiClient,
  extendQuery: (params, query) => {
    if (params?.business) query.business = params.business;
  },
});
