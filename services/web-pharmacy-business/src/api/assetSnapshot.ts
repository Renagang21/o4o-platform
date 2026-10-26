import type {
  LibraryContentOrigin,
  StoreContentUsage,
} from "@o4o/store-ui-core/api/assetSnapshot";
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
  StoreDescriptionItem,
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
  // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그 chip 표시용 (항상 string[])
  tags?: string[];
  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: AI 설명 분류 SSOT(content_json.aiDescription.mode) — 'single'|'corner'|null
  aiDescriptionMode?: string | null;
  // WO-O4O-STORE-IMPORTED-DESCRIPTION-SOURCE-UPDATE-BADGE-V1: O4O b2c 설명서 가져온 사본의 원본(canonical) 갱신 여부(표시 전용)
  hasSourceUpdate?: boolean;
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
    type?: "document";
    // WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 출처 탭 + 태그 정확 필터
    // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 'ai-description' = content_json.aiDescription.mode 필터
    source?: "operator" | "community" | "mine" | "ai-description";
    tag?: string;
  }) => {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.search) query.search = params.search;
    if (params?.type) query.type = params.type;
    if (params?.source) query.source = params.source;
    if (params?.tag) query.tag = params.tag;
    return apiClient.get<{ success: boolean; data: PaginatedLibraryContents }>(
      "/store-library/contents",
      Object.keys(query).length > 0 ? query : undefined,
    );
  },

  /**
   * WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1
   * "원본 갱신됨" 사본(:id)의 현재 canonical 원본을 **새 사본으로 다시 가져오기**(덮어쓰기 아님).
   * 응답 mode: 'create_copy'(새 사본 생성) | 'already_latest'(이미 최신).
   */
  reimportSource: (contentId: string) =>
    apiClient.post<{
      success: boolean;
      data: {
        mode: "create_copy" | "already_latest";
        oldStoreContentId?: string;
        newStoreContentId?: string;
        sourceDescriptionId?: string;
        message?: string;
      };
    }>(`/store-contents/${encodeURIComponent(contentId)}/reimport-source`, {}),

  /**
   * WO-O4O-STORE-CONTENT-USAGE-TRACE-FOR-REIMPORT-V1
   * 매장 설명서 사본(:id)의 사용처 read-only 집계 (QR / 태블릿 진열 / 취급제품 / POP).
   * REIMPORT-OVERWRITE 착수 전, "이 사본이 어디에 쓰이는지"를 표시하기 위한 선행 조회.
   * coverage 는 미집계 항목(태블릿 블록 JSON / store_videos / POP 근사)을 명시한다.
   */
  getContentUsage: (contentId: string) =>
    apiClient.get<{ success: boolean; data: StoreContentUsage }>(
      `/store-library/contents/${encodeURIComponent(contentId)}/usage`,
    ),
};

export const {
  assetSnapshotApi,
  storeAssetControlApi,
  publishedAssetsApi,
  storeContentApi,
  directContentApi,
  handledProductContentApi,
  storeDescriptionApi,
} = createAssetSnapshotClients({ apiClient });
