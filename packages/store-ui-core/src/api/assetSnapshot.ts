/** Shared store client implementation; service transports remain in the app adapters. */
import type { JsonApiClient } from "./transport";

export type SnapshotAssetType =
  | "cms"
  | "signage"
  | "lesson"
  | "content"
  | "resource";

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

export interface CopyAssetRequest {
  sourceService: string;
  sourceAssetId: string;
  assetType: SnapshotAssetType;
}

export interface CopyAssetResponse {
  success: boolean;
  data: AssetSnapshotItem;
}

export interface PaginatedAssets {
  items: AssetSnapshotItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAssetsResponse {
  success: boolean;
  data: PaginatedAssets;
}

export type AssetPublishStatus = "draft" | "published" | "hidden";

export type SnapshotType =
  | "user_copy"
  | "hq_forced"
  | "campaign_push"
  | "template_seed";

export type LifecycleStatus = "active" | "expired" | "archived";

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

export type StoreAssetListType = SnapshotAssetType | "document";

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

export interface StoreContentData {
  snapshotId: string;
  organizationId: string;
  title: string;
  contentJson: Record<string, unknown>;
  source: "store" | "snapshot";
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface DirectContentItem {
  id: string;
  sourceType: "direct";
  title: string;
  contentJson: Record<string, unknown>;
  // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그 (string[])
  tags?: string[];
  updatedAt: string;
  updatedBy: string | null;
}

export type HandledProductSourceType = "listing" | "local";

export interface LinkedContentItem {
  contentId: string;
  title: string;
  /** kpa_store_contents.workspace_status (draft / pending_ai / ai_processed / ready_curation / archived) */
  status: string;
  linkType: string;
  /** 'direct' = direct 콘텐츠 / 'snapshot_edit' = 스냅샷 편집 */
  sourceType: "direct" | "snapshot_edit";
  snapshotId: string | null;
  updatedAt: string;
}

export interface StoreDescriptionItem {
  descriptionId: string;
  /** 제목 필드 없음 → 제품명 표시 */
  title: string;
  language: string;
  status: string;
  summary: string | null;
  /** 읽기 전용 표시용 본문(HTML). 없을 수 있음 → 클라이언트 null 방어. */
  contentHtml: string | null;
  updatedAt: string;
}

export type LibraryContentOrigin = "snapshot" | "direct" | "execution-asset";

export interface StoreContentUsage {
  contentId: string;
  usage: {
    qr: number;
    tablet_display: number;
    product_link: number;
    pop_pdf: number;
  };
  total: number;
  coverage: {
    tablet_content_list_block: string;
    store_videos: string;
    pop: string;
  };
}

export function createAssetSnapshotClients({
  apiClient,
}: {
  apiClient: JsonApiClient;
}) {
  const assetSnapshotApi = {
    /**
     * Copy a source asset to the user's store
     */
    copy: (body: CopyAssetRequest) =>
      apiClient.post<CopyAssetResponse>("/assets/copy", body),

    /**
     * List asset snapshots for the user's store (paginated)
     */
    list: (params?: {
      type?: SnapshotAssetType;
      page?: number;
      limit?: number;
    }) => {
      const query: Record<string, string> = {};
      if (params?.type) query.type = params.type;
      if (params?.page) query.page = String(params.page);
      if (params?.limit) query.limit = String(params.limit);
      return apiClient.get<ListAssetsResponse>(
        "/assets",
        Object.keys(query).length > 0 ? query : undefined,
      );
    },

    /**
     * Update title/description/tags/thumbnailUrl/sourceUrl of a store snapshot.
     * All fields except title are merged into content_json.
     * WO-O4O-STORE-SIGNAGE-SOURCEURL-EDIT-ENABLE-V1: sourceUrl editing enabled.
     */
    patch: (
      id: string,
      body: {
        title?: string;
        description?: string;
        tags?: string[];
        thumbnailUrl?: string;
        sourceUrl?: string;
      },
    ) =>
      apiClient.patch<{ success: boolean; data: AssetSnapshotItem }>(
        `/assets/${id}`,
        body,
      ),

    /**
     * Delete a snapshot from the store's library.
     * Only removes the store's copy — original community asset is untouched.
     */
    remove: (id: string) =>
      apiClient.delete<{
        success: boolean;
        data: { deleted: boolean; id: string };
      }>(`/assets/${id}`),
  };

  const storeAssetControlApi = {
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
        "/store-assets",
        Object.keys(query).length > 0 ? query : undefined,
      );
    },

    /**
     * Update publish status of an asset snapshot
     */
    updatePublishStatus: (snapshotId: string, status: AssetPublishStatus) =>
      apiClient.patch<{
        success: boolean;
        data: {
          snapshotId: string;
          publishStatus: AssetPublishStatus;
          updatedAt: string;
        };
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

  const publishedAssetsApi = {
    /**
     * List published assets for a given organization (public)
     */
    list: (
      organizationId: string,
      params?: {
        channel?: string;
        type?: SnapshotAssetType;
        page?: number;
        limit?: number;
      },
    ) => {
      const query: Record<string, string> = {};
      if (params?.channel) query.channel = params.channel;
      if (params?.type) query.type = params.type;
      if (params?.page) query.page = String(params.page);
      if (params?.limit) query.limit = String(params.limit);
      return apiClient.get<{
        success: boolean;
        data: PaginatedPublishedAssets;
      }>(
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

  const storeContentApi = {
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
    save: (
      snapshotId: string,
      body: { title: string; contentJson: Record<string, unknown> },
    ) =>
      apiClient.put<{ success: boolean; data: StoreContentData }>(
        `/store-contents/${snapshotId}`,
        body,
      ),
  };

  const directContentApi = {
    /** 내 매장 direct 콘텐츠 목록 (GET /store-contents 에서 source_type='direct' 필터) */
    list: () =>
      apiClient.get<{
        success: boolean;
        data: Array<{
          id: string;
          sourceType: string;
          snapshotId: string | null;
          title: string;
          updatedAt: string;
          shareStatus: string | null;
          sharedAt: string | null;
          sharedRequestId: string | null;
        }>;
      }>("/store-contents"),

    /** direct 콘텐츠 상세 */
    get: (id: string) =>
      apiClient.get<{ success: boolean; data: DirectContentItem }>(
        `/store-contents/direct/${id}`,
      ),

    /** direct 콘텐츠 수정 */
    update: (
      id: string,
      body: {
        title?: string;
        contentJson?: Record<string, unknown>;
        tags?: string[];
      },
    ) =>
      apiClient.put<{ success: boolean; data: DirectContentItem }>(
        `/store-contents/direct/${id}`,
        body,
      ),

    /** direct 콘텐츠 삭제 */
    remove: (id: string) =>
      apiClient.delete<{
        success: boolean;
        data: { deleted: boolean; id: string };
      }>(`/store-contents/direct/${id}`),
  };

  const handledProductContentApi = {
    /**
     * 특정 매장 취급제품에 연결된 자료함 콘텐츠 목록.
     * GET /store-contents/by-product?sourceType=listing|local&sourceId=...
     */
    byProduct: (sourceType: HandledProductSourceType, sourceId: string) =>
      apiClient.get<{ success: boolean; data: { items: LinkedContentItem[] } }>(
        "/store-contents/by-product",
        { sourceType, sourceId },
      ),
  };

  const storeDescriptionApi = {
    /** listing(=master)에 등록된 canonical 매장용(STORE) 상세설명서 목록(본문 포함, 읽기 전용) */
    list: (listingId: string) =>
      apiClient.get<{
        success: boolean;
        data: { items: StoreDescriptionItem[] };
      }>("/store-contents/b2c-descriptions", { listingId }),
  };

  return {
    assetSnapshotApi,
    storeAssetControlApi,
    publishedAssetsApi,
    storeContentApi,
    directContentApi,
    handledProductContentApi,
    storeDescriptionApi,
  };
}
