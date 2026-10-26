/** Shared store client implementation; service transports remain in the app adapters. */
import type {
  IdlePlaylistItem,
  TabletScreenResponse,
} from "@o4o/tablet-kiosk-core";
import type { LocalProduct } from "./localProducts";
import type { JsonRequest } from "./transport";

export interface Tablet {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  // WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1: 현재 적용 화면 세트(없으면 null=legacy)
  currentScreenSetId?: string | null;
}

export interface DisplayItem {
  id?: string;
  product_type: "supplier" | "local";
  product_id: string;
  sort_order: number;
  is_visible: boolean;
  created_at?: string;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(미선택/삭제 시 null).
  contentId?: string | null;
  contentTitle?: string | null;
  contentSourceType?: "direct" | "snapshot_edit" | null;
  contentStatus?: string | null;
}

export interface PoolSupplierProduct {
  id: string;
  offer_id: string;
  product_name: string;
  retail_price: string;
  is_active: boolean;
  service_key: string;
  created_at: string;
}

export interface ProductPool {
  supplierProducts: PoolSupplierProduct[];
  localProducts: LocalProduct[];
}

export interface OperatorCommonIdleCandidate {
  id: string;
  title: string;
  videoUrl: string;
  sourceType: "youtube" | "vimeo";
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  tabletDurationSeconds: number | null;
  status: "active" | "upcoming" | "expired";
}

export interface OperatorCommonIdleSelection {
  id: string;
  forcedContentId: string;
  title: string;
  sourceType: "youtube" | "vimeo";
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  status: "active" | "upcoming" | "expired" | "unavailable";
}

export interface TabletDisplaySettings {
  showPrice: boolean;
  showQr: boolean;
  showConsultationButton: boolean;
  /** 0 = 사용 안 함, 그 외 5/10/15/30 */
  autoSlideSeconds: number;
  idleSlideSeconds: number;
}

export type ScreenSetStatus =
  | "draft"
  | "active"
  | "archived"
  | "operator_template";

export type ScreenBlockType =
  | "idle_media"
  | "product_list"
  | "corner_description"
  | "health_info"
  | "staff_inquiry"
  | "qr_guide"
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1: 코너 콘텐츠 카드 목록
  | "content_list";

export interface StoreContentSearchResult {
  contentId: string;
  title: string;
  sourceType: string;
  workspaceStatus: string;
  summary: string | null;
  hasProductLink: boolean;
}

export interface O4oDescriptionSearchResult {
  masterId: string;
  name: string;
  barcode: string | null;
  // WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1: 동일 상품명 SKU 구분용(규격/제형/포장 결합 원문). 서버 pm.specification.
  specification: string | null;
  summary: string | null;
  languages: string[];
}

export type ContentListItem =
  | {
      sourceType: "o4o_product_description";
      masterId: string;
      language: string;
      displayTitle: string | null;
      displaySummary: string | null;
      visible: boolean;
      sortOrder: number;
    }
  | {
      sourceType: "store_content";
      contentId: string;
      displayTitle: string | null;
      displaySummary: string | null;
      visible: boolean;
      sortOrder: number;
    };

export interface ScreenSet {
  id: string;
  // WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1: 소유권 모델 — organization_id 는 매장(store) 전용.
  //   operator/supplier 원본은 organizationId=null(service_key/supplierId 로 소유). ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1.
  organizationId: string | null;
  serviceKey: string | null;
  /** 공급자(origin='supplier') 원본 식별자. store/operator 는 null. soft-ref. */
  supplierId: string | null;
  tabletId: string | null;
  name: string;
  origin: "store" | "operator" | "supplier";
  status: ScreenSetStatus;
  // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 화면 세트 렌더 템플릿 키.
  //   서버 GET 은 COALESCE 로 항상 non-null 반환(미지정 → corner_information_basic_v1).
  templateKey: string;
  // WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1: 콘텐츠 설명(운영 메모, 선택).
  description?: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  blockCount?: number;
  isApplied?: boolean;
  // WO-O4O-SCREEN-SET-QR-WRITE-BOUNDARY-FIX-V1:
  //   목록 GET 및 저장 응답(withQrLink)이 내려주는 Screen Set 자동 QR 정보(additive).
  //   저장이 성공했다면 QR 도 준비된 상태다 — QR 확보 실패는 저장이 롤백되고 SCREEN_SET_QR_FAILED 로 응답된다.
  publicQrSlug?: string | null;
  publicQrUrl?: string | null;
}

export interface ScreenBlock {
  id?: string;
  screenSetId?: string;
  blockType: ScreenBlockType;
  sortOrder: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScreenSetDetail extends ScreenSet {
  blocks: ScreenBlock[];
}

export interface CornerContent {
  screenSetId: string;
  sortOrder: number;
  isVisible: boolean;
  name: string;
  status: ScreenSetStatus;
  templateKey: string;
  publicQrSlug: string | null;
  blockCount: number;
  /** 이 코너의 현재 표시 콘텐츠 여부 */
  isCurrent: boolean;
}

export interface ProductListSelection {
  productType: "supplier" | "local";
  productId: string;
  qrCodeId?: string | null;
  name?: string | null;
}

export interface ProductListEditorData {
  screenSetId: string;
  screenSetName: string;
  blockId: string | null;
  hasProductListBlock: boolean;
  selected: ProductListSelection[];
  pool: {
    supplierProducts: Array<{
      productType: "supplier";
      productId: string;
      name: string;
    }>;
    localProducts: Array<{
      productType: "local";
      productId: string;
      name: string;
    }>;
  };
}

export interface TabletDevice {
  id: string;
  organizationId: string;
  name: string;
  currentLocationId: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** 연결 코드만 발급되고 아직 기기가 연결하지 않은 상태 */
  pairingPending: boolean;
  pairingExpiresAt: string | null;
  locationName?: string | null;
  locationCode?: string | null;
}

export interface RuntimeLocation {
  id: string;
  name: string;
  location: string | null;
  currentScreenSetId: string | null;
  currentScreenSetName: string | null;
  deviceCount: number;
}

export interface RuntimeContent {
  id: string;
  name: string;
  description: string | null;
  status: ScreenSetStatus;
  updatedAt: string;
  sortOrder: number;
  isVisible: boolean;
  isCurrent: boolean;
  blockCount: number;
}

export interface RuntimeSnapshot {
  device: TabletDevice;
  store: { organizationId: string; name: string };
  location: { id: string; name: string; location: string | null } | null;
  currentScreenSet: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  locations: RuntimeLocation[];
  contents: RuntimeContent[];
}

export const TABLET_DEVICE_TOKEN_HEADER = "X-Tablet-Device-Token";

export function createTabletDisplayClient({
  BASE,
  request,
}: {
  BASE: () => string;
  request: JsonRequest;
}) {
  async function fetchOperatorCommonIdleCandidates(): Promise<
    OperatorCommonIdleCandidate[]
  > {
    const res = await request<{
      success: boolean;
      data: OperatorCommonIdleCandidate[];
    }>(`${BASE()}/tablet-operator-common-idle-candidates`);
    return res.data;
  }

  async function fetchOperatorCommonIdleSelection(
    tabletId: string,
  ): Promise<OperatorCommonIdleSelection | null> {
    const res = await request<{
      success: boolean;
      data: OperatorCommonIdleSelection | null;
    }>(`${BASE()}/tablets/${tabletId}/operator-common-idle-selection`);
    return res.data;
  }

  async function selectOperatorCommonIdle(
    tabletId: string,
    forcedContentId: string,
  ): Promise<void> {
    await request(
      `${BASE()}/tablets/${tabletId}/operator-common-idle-selection`,
      {
        method: "POST",
        body: JSON.stringify({ forcedContentId }),
      },
    );
  }

  async function clearOperatorCommonIdle(tabletId: string): Promise<void> {
    await request(
      `${BASE()}/tablets/${tabletId}/operator-common-idle-selection`,
      { method: "DELETE" },
    );
  }

  async function fetchTabletDisplaySettings(): Promise<TabletDisplaySettings> {
    const res = await request<{
      success: boolean;
      data: TabletDisplaySettings;
    }>(`${BASE()}/tablet-display-settings`);
    return res.data;
  }

  async function saveTabletDisplaySettings(
    settings: TabletDisplaySettings,
  ): Promise<TabletDisplaySettings> {
    const res = await request<{
      success: boolean;
      data: TabletDisplaySettings;
    }>(`${BASE()}/tablet-display-settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    return res.data;
  }

  async function fetchTablets(): Promise<Tablet[]> {
    const res = await request<{ success: boolean; data: Tablet[] }>(
      `${BASE()}/tablets`,
    );
    return res.data;
  }

  async function fetchScreenSets(params?: {
    tabletId?: string;
    includeArchived?: boolean;
  }): Promise<ScreenSet[]> {
    const q = new URLSearchParams();
    if (params?.tabletId) q.set("tabletId", params.tabletId);
    if (params?.includeArchived) q.set("includeArchived", "true");
    const res = await request<{ success: boolean; data: ScreenSet[] }>(
      `${BASE()}/screen-sets?${q.toString()}`,
    );
    return res.data;
  }

  async function fetchScreenSet(id: string): Promise<ScreenSetDetail> {
    const res = await request<{ success: boolean; data: ScreenSetDetail }>(
      `${BASE()}/screen-sets/${id}`,
    );
    return res.data;
  }

  async function duplicateScreenSet(
    id: string,
    name?: string,
  ): Promise<ScreenSet> {
    const res = await request<{ success: boolean; data: ScreenSet }>(
      `${BASE()}/screen-sets/${id}/duplicate`,
      {
        method: "POST",
        body: JSON.stringify(name ? { name } : {}),
      },
    );
    return res.data;
  }

  async function archiveScreenSet(id: string): Promise<void> {
    await request(`${BASE()}/screen-sets/${id}`, { method: "DELETE" });
  }

  async function previewScreenSet(input: {
    templateKey?: string | null;
    blocks: ScreenBlock[];
  }): Promise<TabletScreenResponse> {
    const res = await request<{ success: boolean; data: TabletScreenResponse }>(
      `${BASE()}/screen-sets/preview`,
      {
        method: "POST",
        body: JSON.stringify({
          templateKey: input.templateKey ?? undefined,
          blocks: input.blocks.map((b, i) => ({
            blockType: b.blockType,
            sortOrder: i,
            isEnabled: b.isEnabled,
            config: b.config,
          })),
        }),
      },
    );
    return res.data;
  }

  async function searchTabletStoreContents(
    q: string,
  ): Promise<StoreContentSearchResult[]> {
    const res = await request<{
      success: boolean;
      data: StoreContentSearchResult[];
    }>(
      `${BASE()}/tablet-content-sources/store-contents?q=${encodeURIComponent(q)}`,
    );
    return res.data;
  }

  async function searchTabletO4oDescriptions(
    q: string,
  ): Promise<O4oDescriptionSearchResult[]> {
    const res = await request<{
      success: boolean;
      data: O4oDescriptionSearchResult[];
    }>(
      `${BASE()}/tablet-content-sources/o4o-descriptions?q=${encodeURIComponent(q)}`,
    );
    return res.data;
  }

  async function fetchCornerContents(
    tabletId: string,
  ): Promise<{ items: CornerContent[]; currentScreenSetId: string | null }> {
    const res = await request<{
      success: boolean;
      data: CornerContent[];
      currentScreenSetId: string | null;
    }>(`${BASE()}/tablets/${tabletId}/screen-sets`);
    return {
      items: res.data ?? [],
      currentScreenSetId: res.currentScreenSetId ?? null,
    };
  }

  async function addCornerContent(
    tabletId: string,
    screenSetId: string,
  ): Promise<void> {
    await request(`${BASE()}/tablets/${tabletId}/screen-sets/${screenSetId}`, {
      method: "POST",
    });
  }

  async function removeCornerContent(
    tabletId: string,
    screenSetId: string,
  ): Promise<void> {
    await request(`${BASE()}/tablets/${tabletId}/screen-sets/${screenSetId}`, {
      method: "DELETE",
    });
  }

  async function reorderCornerContents(
    tabletId: string,
    order: string[],
  ): Promise<void> {
    await request(`${BASE()}/tablets/${tabletId}/screen-sets/order`, {
      method: "PATCH",
      body: JSON.stringify({ order }),
    });
  }

  async function applyCurrentScreenSet(
    tabletId: string,
    screenSetId: string,
  ): Promise<void> {
    await request(`${BASE()}/tablets/${tabletId}/current-screen-set`, {
      method: "POST",
      body: JSON.stringify({ screenSetId }),
    });
  }

  async function clearCurrentScreenSet(tabletId: string): Promise<void> {
    await request(`${BASE()}/tablets/${tabletId}/current-screen-set`, {
      method: "DELETE",
    });
  }

  async function createTablet(
    name: string,
    location?: string,
  ): Promise<Tablet> {
    const res = await request<{ success: boolean; data: Tablet }>(
      `${BASE()}/tablets`,
      {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          location: location?.trim() || undefined,
        }),
      },
    );
    return res.data;
  }

  async function deleteTablet(id: string): Promise<void> {
    await request<{ success: boolean; data: unknown }>(
      `${BASE()}/tablets/${id}`,
      { method: "DELETE" },
    );
  }

  async function fetchTabletDisplays(tabletId: string): Promise<DisplayItem[]> {
    const res = await request<{ success: boolean; data: DisplayItem[] }>(
      `${BASE()}/tablets/${tabletId}/displays`,
    );
    return res.data;
  }

  async function saveTabletDisplays(
    tabletId: string,
    displays: Array<{
      productType: "supplier" | "local";
      productId: string;
      sortOrder: number;
      isVisible?: boolean;
      // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(null=선택 해제).
      contentId?: string | null;
    }>,
  ): Promise<DisplayItem[]> {
    const res = await request<{ success: boolean; data: DisplayItem[] }>(
      `${BASE()}/tablets/${tabletId}/displays`,
      { method: "PUT", body: JSON.stringify({ displays }) },
    );
    return res.data;
  }

  async function fetchProductPool(tabletId: string): Promise<ProductPool> {
    const res = await request<{ success: boolean; data: ProductPool }>(
      `${BASE()}/tablets/${tabletId}/product-pool`,
    );
    return res.data;
  }

  async function fetchStoreProductPool(): Promise<ProductPool> {
    const res = await request<{ success: boolean; data: ProductPool }>(
      `${BASE()}/product-pool`,
    );
    return res.data;
  }

  async function fetchTabletIdlePlaylist(
    tabletId: string,
  ): Promise<IdlePlaylistItem[]> {
    const res = await request<{
      success: boolean;
      data: { items: IdlePlaylistItem[] };
    }>(`${BASE()}/tablets/${tabletId}/idle-playlist`);
    return Array.isArray(res.data?.items) ? res.data.items : [];
  }

  async function saveTabletIdlePlaylist(
    tabletId: string,
    items: IdlePlaylistItem[],
  ): Promise<IdlePlaylistItem[]> {
    const res = await request<{
      success: boolean;
      data: { items: IdlePlaylistItem[] };
    }>(`${BASE()}/tablets/${tabletId}/idle-playlist`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  }

  async function fetchProductListEditor(
    screenSetId: string,
  ): Promise<ProductListEditorData> {
    const res = await request<{
      success: boolean;
      data: ProductListEditorData;
    }>(`${BASE()}/screen-sets/${screenSetId}/product-list`);
    return res.data;
  }

  async function saveProductList(
    screenSetId: string,
    products: Array<{
      productType: "supplier" | "local";
      productId: string;
      qrCodeId?: string | null;
    }>,
  ): Promise<void> {
    await request(`${BASE()}/screen-sets/${screenSetId}/product-list`, {
      method: "PUT",
      body: JSON.stringify({
        products: products.map((p) => ({
          productType: p.productType,
          productId: p.productId,
          qrCodeId: p.qrCodeId ?? null,
        })),
      }),
    });
  }

  async function fetchTabletDevices(): Promise<TabletDevice[]> {
    const res = await request<{ success: boolean; data: TabletDevice[] }>(
      `${BASE()}/tablet-devices`,
    );
    return res.data ?? [];
  }

  async function createPairingCode(
    locationId: string,
  ): Promise<{
    code: string;
    expiresAt: string;
    deviceId: string;
    locationId: string;
  }> {
    const res = await request<{
      success: boolean;
      data: {
        code: string;
        expiresAt: string;
        deviceId: string;
        locationId: string;
      };
    }>(`${BASE()}/tablets/${locationId}/pairing-codes`, { method: "POST" });
    return res.data;
  }

  async function updateTabletDevice(
    id: string,
    input: {
      name?: string;
      currentLocationId?: string | null;
      isActive?: boolean;
    },
  ): Promise<TabletDevice> {
    const res = await request<{ success: boolean; data: TabletDevice }>(
      `${BASE()}/tablet-devices/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
    return res.data;
  }

  async function disconnectTabletDevice(id: string): Promise<void> {
    await request(`${BASE()}/tablet-devices/${id}`, { method: "DELETE" });
  }

  function withDevice(
    deviceToken: string,
    options: RequestInit = {},
  ): RequestInit {
    return {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        [TABLET_DEVICE_TOKEN_HEADER]: deviceToken,
      },
    };
  }

  async function fetchRuntimeDevice(
    deviceToken: string,
  ): Promise<RuntimeSnapshot> {
    const res = await request<{ success: boolean; data: RuntimeSnapshot }>(
      `${BASE()}/tablet-runtime/device`,
      withDevice(deviceToken),
    );
    return res.data;
  }

  async function fetchRuntimeLocationContents(
    deviceToken: string,
    locationId: string,
  ): Promise<RuntimeContent[]> {
    const res = await request<{ success: boolean; data: RuntimeContent[] }>(
      `${BASE()}/tablet-runtime/locations/${locationId}/contents`,
      withDevice(deviceToken),
    );
    return res.data ?? [];
  }

  async function moveRuntimeDevice(
    deviceToken: string,
    deviceId: string,
    locationId: string,
  ): Promise<RuntimeSnapshot> {
    const res = await request<{ success: boolean; data: RuntimeSnapshot }>(
      `${BASE()}/tablet-runtime/devices/${deviceId}/location`,
      withDevice(deviceToken, {
        method: "POST",
        body: JSON.stringify({ locationId }),
      }),
    );
    return res.data;
  }

  async function switchRuntimeContent(
    deviceToken: string,
    deviceId: string,
    screenSetId: string,
  ): Promise<RuntimeSnapshot> {
    const res = await request<{ success: boolean; data: RuntimeSnapshot }>(
      `${BASE()}/tablet-runtime/devices/${deviceId}/content`,
      withDevice(deviceToken, {
        method: "POST",
        body: JSON.stringify({ screenSetId }),
      }),
    );
    return res.data;
  }

  async function fetchRuntimeProductListEditor(
    deviceToken: string,
    screenSetId: string,
  ): Promise<ProductListEditorData> {
    const res = await request<{
      success: boolean;
      data: ProductListEditorData;
    }>(
      `${BASE()}/tablet-runtime/screen-sets/${screenSetId}/product-list`,
      withDevice(deviceToken),
    );
    return res.data;
  }

  async function saveRuntimeProductList(
    deviceToken: string,
    screenSetId: string,
    products: Array<{
      productType: "supplier" | "local";
      productId: string;
      qrCodeId?: string | null;
    }>,
  ): Promise<void> {
    await request(
      `${BASE()}/tablet-runtime/screen-sets/${screenSetId}/product-list`,
      withDevice(deviceToken, {
        method: "PUT",
        body: JSON.stringify({
          products: products.map((p) => ({
            productType: p.productType,
            productId: p.productId,
            qrCodeId: p.qrCodeId ?? null,
          })),
        }),
      }),
    );
  }

  return {
    fetchOperatorCommonIdleCandidates,
    fetchOperatorCommonIdleSelection,
    selectOperatorCommonIdle,
    clearOperatorCommonIdle,
    fetchTabletDisplaySettings,
    saveTabletDisplaySettings,
    fetchTablets,
    fetchScreenSets,
    fetchScreenSet,
    duplicateScreenSet,
    archiveScreenSet,
    previewScreenSet,
    searchTabletStoreContents,
    searchTabletO4oDescriptions,
    fetchCornerContents,
    addCornerContent,
    removeCornerContent,
    reorderCornerContents,
    applyCurrentScreenSet,
    clearCurrentScreenSet,
    createTablet,
    deleteTablet,
    fetchTabletDisplays,
    saveTabletDisplays,
    fetchProductPool,
    fetchStoreProductPool,
    fetchTabletIdlePlaylist,
    saveTabletIdlePlaylist,
    fetchProductListEditor,
    saveProductList,
    fetchTabletDevices,
    createPairingCode,
    updateTabletDevice,
    disconnectTabletDevice,
    fetchRuntimeDevice,
    fetchRuntimeLocationContents,
    moveRuntimeDevice,
    switchRuntimeContent,
    fetchRuntimeProductListEditor,
    saveRuntimeProductList,
  };
}
