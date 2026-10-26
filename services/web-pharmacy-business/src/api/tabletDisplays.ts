import { storeJsonFetch as request } from "./storeJsonFetch";
import type {
  ScreenBlock,
  ScreenSet,
  ScreenSetStatus,
} from "@o4o/store-ui-core/api/tabletDisplays";
import { createTabletDisplayClient } from "@o4o/store-ui-core/api/tabletDisplays";
export { TABLET_DEVICE_TOKEN_HEADER } from "@o4o/store-ui-core/api/tabletDisplays";
export type {
  ContentListItem,
  CornerContent,
  DisplayItem,
  O4oDescriptionSearchResult,
  OperatorCommonIdleCandidate,
  OperatorCommonIdleSelection,
  PoolSupplierProduct,
  ProductListEditorData,
  ProductListSelection,
  ProductPool,
  RuntimeContent,
  RuntimeLocation,
  RuntimeSnapshot,
  ScreenBlock,
  ScreenBlockType,
  ScreenSet,
  ScreenSetDetail,
  ScreenSetStatus,
  StoreContentSearchResult,
  Tablet,
  TabletDevice,
  TabletDisplaySettings,
} from "@o4o/store-ui-core/api/tabletDisplays";

/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Platform-level API: /api/v1/store/tablets
 * Manages tablet device display configurations (supplier + local products).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
/**
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 (축 B):
 *   서비스 중립 경로(`/api/v1/store/...`)는 store_owner 판정에 serviceKey 가 없어
 *   다중 서비스 사용자에게 **타 서비스 조직**이 선택될 수 있다. 같은 My Store 문맥의
 *   local-products(`/api/v1/kpa/store/local-products`)와 같은 조직을 해석하도록
 *   KPA canonical mount 를 사용한다. 백엔드 라우터·핸들러는 동일하다.
 */
const BASE = () => `${API_BASE}/api/v1/kpa/store`;

// ==================== Helpers ====================

export async function createScreenSet(input: {
  name: string;
  description?: string | null;
  tabletId?: string | null;
  status?: "draft" | "active";
  templateKey?: string | null;
}): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(
    `${BASE()}/screen-sets`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return res.data;
}

export async function updateScreenSet(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    status?: ScreenSetStatus;
    tabletId?: string | null;
    templateKey?: string | null;
  },
): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(
    `${BASE()}/screen-sets/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return res.data;
}

export async function saveScreenSetBlocks(
  id: string,
  blocks: ScreenBlock[],
): Promise<ScreenBlock[]> {
  const res = await request<{ success: boolean; data: ScreenBlock[] }>(
    `${BASE()}/screen-sets/${id}/blocks`,
    {
      method: "PUT",
      body: JSON.stringify({
        blocks: blocks.map((b, i) => ({
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

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

export const {
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
} = createTabletDisplayClient({ BASE, request });
