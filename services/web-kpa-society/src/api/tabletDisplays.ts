/**
 * Tablet Display API Client — Store Display Management
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Platform-level API: /api/v1/store/tablets
 * Manages tablet device display configurations (supplier + local products).
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';
import type { LocalProduct } from './localProducts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
/**
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 (축 B):
 *   서비스 중립 경로(`/api/v1/store/...`)는 store_owner 판정에 serviceKey 가 없어
 *   다중 서비스 사용자에게 **타 서비스 조직**이 선택될 수 있다. 같은 My Store 문맥의
 *   local-products(`/api/v1/kpa/store/local-products`)와 같은 조직을 해석하도록
 *   KPA canonical mount 를 사용한다. 백엔드 라우터·핸들러는 동일하다.
 */
const BASE = `${API_BASE}/api/v1/kpa/store`;

// ==================== Types ====================

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
  product_type: 'supplier' | 'local';
  product_id: string;
  sort_order: number;
  is_visible: boolean;
  created_at?: string;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(미선택/삭제 시 null).
  contentId?: string | null;
  contentTitle?: string | null;
  contentSourceType?: 'direct' | 'snapshot_edit' | null;
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

// ==================== Helpers ====================

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = body.code;
    throw error;
  }

  return response.json();
}

// ==================== 운영자 공통 대기 영상 (WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1) ====================

export interface OperatorCommonIdleCandidate {
  id: string;
  title: string;
  videoUrl: string;
  sourceType: 'youtube' | 'vimeo';
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  tabletDurationSeconds: number | null;
  status: 'active' | 'upcoming' | 'expired';
}

export interface OperatorCommonIdleSelection {
  id: string;
  forcedContentId: string;
  title: string;
  sourceType: 'youtube' | 'vimeo';
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  status: 'active' | 'upcoming' | 'expired' | 'unavailable';
}

export async function fetchOperatorCommonIdleCandidates(): Promise<OperatorCommonIdleCandidate[]> {
  const res = await request<{ success: boolean; data: OperatorCommonIdleCandidate[] }>(
    `${BASE}/tablet-operator-common-idle-candidates`,
  );
  return res.data;
}

export async function fetchOperatorCommonIdleSelection(tabletId: string): Promise<OperatorCommonIdleSelection | null> {
  const res = await request<{ success: boolean; data: OperatorCommonIdleSelection | null }>(
    `${BASE}/tablets/${tabletId}/operator-common-idle-selection`,
  );
  return res.data;
}

export async function selectOperatorCommonIdle(tabletId: string, forcedContentId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/operator-common-idle-selection`, {
    method: 'POST',
    body: JSON.stringify({ forcedContentId }),
  });
}

export async function clearOperatorCommonIdle(tabletId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/operator-common-idle-selection`, { method: 'DELETE' });
}

// ==================== Display Settings (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) ====================

export interface TabletDisplaySettings {
  showPrice: boolean;
  showQr: boolean;
  showConsultationButton: boolean;
  /** 0 = 사용 안 함, 그 외 5/10/15/30 */
  autoSlideSeconds: number;
  idleSlideSeconds: number;
}

export async function fetchTabletDisplaySettings(): Promise<TabletDisplaySettings> {
  const res = await request<{ success: boolean; data: TabletDisplaySettings }>(
    `${BASE}/tablet-display-settings`,
  );
  return res.data;
}

export async function saveTabletDisplaySettings(
  settings: TabletDisplaySettings,
): Promise<TabletDisplaySettings> {
  const res = await request<{ success: boolean; data: TabletDisplaySettings }>(
    `${BASE}/tablet-display-settings`,
    { method: 'PUT', body: JSON.stringify(settings) },
  );
  return res.data;
}

// ==================== API ====================

export async function fetchTablets(): Promise<Tablet[]> {
  const res = await request<{ success: boolean; data: Tablet[] }>(
    `${BASE}/tablets`,
  );
  return res.data;
}

// ==================== Screen Set / Block (WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1) ====================
// 선행 구현 관리 API(/store/screen-sets, /store/tablets/:id/current-screen-set)만 사용.
// isEnabled(DTO) ↔ is_visible(API 내부) 매핑은 서버가 처리. public runtime 미반영.

export type ScreenSetStatus = 'draft' | 'active' | 'archived' | 'operator_template';
// WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1 §2:
//   product_content 은퇴 — 서버 쓰기 허용 목록·resolver·뷰어에서 모두 제거됐다.
export type ScreenBlockType =
  | 'idle_media' | 'product_list'
  | 'corner_description' | 'health_info' | 'staff_inquiry' | 'qr_guide'
  // WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1: 코너 콘텐츠 카드 목록
  | 'content_list';

// ── content_list picker (WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1) ──
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
/** content_list item(저장 config) — 계약: masterId+language(o4o) / contentId(store) */
export type ContentListItem =
  | { sourceType: 'o4o_product_description'; masterId: string; language: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number }
  | { sourceType: 'store_content'; contentId: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number };

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
  origin: 'store' | 'operator' | 'supplier';
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

export async function fetchScreenSets(params?: { tabletId?: string; includeArchived?: boolean }): Promise<ScreenSet[]> {
  const q = new URLSearchParams();
  if (params?.tabletId) q.set('tabletId', params.tabletId);
  if (params?.includeArchived) q.set('includeArchived', 'true');
  const res = await request<{ success: boolean; data: ScreenSet[] }>(`${BASE}/screen-sets?${q.toString()}`);
  return res.data;
}

export async function fetchScreenSet(id: string): Promise<ScreenSetDetail> {
  const res = await request<{ success: boolean; data: ScreenSetDetail }>(`${BASE}/screen-sets/${id}`);
  return res.data;
}

export async function createScreenSet(input: { name: string; description?: string | null; tabletId?: string | null; status?: 'draft' | 'active'; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/screen-sets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateScreenSet(id: string, input: { name?: string; description?: string | null; status?: ScreenSetStatus; tabletId?: string | null; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/screen-sets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.data;
}

/**
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1: Screen Set 복제.
 * 이름/설명/blocks(product_list 포함) 복사 → 새 ID(draft). 현재 적용·위치 연결·runtime 상태는 복사하지 않는다.
 */
export async function duplicateScreenSet(id: string, name?: string): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/screen-sets/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {}),
  });
  return res.data;
}

/** archive(soft delete). 적용 중이면 409 SCREEN_SET_IN_USE 를 throw. */
export async function archiveScreenSet(id: string): Promise<void> {
  await request(`${BASE}/screen-sets/${id}`, { method: 'DELETE' });
}

export async function saveScreenSetBlocks(id: string, blocks: ScreenBlock[]): Promise<ScreenBlock[]> {
  const res = await request<{ success: boolean; data: ScreenBlock[] }>(`${BASE}/screen-sets/${id}/blocks`, {
    method: 'PUT',
    body: JSON.stringify({
      blocks: blocks.map((b, i) => ({ blockType: b.blockType, sortOrder: i, isEnabled: b.isEnabled, config: b.config })),
    }),
  });
  return res.data;
}

// WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 draft blocks 를 sections 로 resolve(read-only, DB write 없음).
//   반환은 공개 /tablet/screen 과 동일한 TabletScreenResponse(mode='screen_set') — kiosk-core previewScreen 주입용.
export async function previewScreenSet(input: { templateKey?: string | null; blocks: ScreenBlock[] }): Promise<TabletScreenResponse> {
  const res = await request<{ success: boolean; data: TabletScreenResponse }>(`${BASE}/screen-sets/preview`, {
    method: 'POST',
    body: JSON.stringify({
      templateKey: input.templateKey ?? undefined,
      blocks: input.blocks.map((b, i) => ({ blockType: b.blockType, sortOrder: i, isEnabled: b.isEnabled, config: b.config })),
    }),
  });
  return res.data;
}

// WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1: content_list picker 검색(read-only).
export async function searchTabletStoreContents(q: string): Promise<StoreContentSearchResult[]> {
  const res = await request<{ success: boolean; data: StoreContentSearchResult[] }>(
    `${BASE}/tablet-content-sources/store-contents?q=${encodeURIComponent(q)}`,
  );
  return res.data;
}
export async function searchTabletO4oDescriptions(q: string): Promise<O4oDescriptionSearchResult[]> {
  const res = await request<{ success: boolean; data: O4oDescriptionSearchResult[] }>(
    `${BASE}/tablet-content-sources/o4o-descriptions?q=${encodeURIComponent(q)}`,
  );
  return res.data;
}

// ==================== 코너 × 콘텐츠 연결 (WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1) ====================
// store_tablet_corner_contents = 코너↔콘텐츠(Screen Set) 다대다 연결 SSOT.
//   current_screen_set_id = 그중 '현재 표시' 1개(∈ 연결). 적용(POST current-screen-set)은 연결 보장 + current 를 원자적으로 처리.
//   주의: 연결의 sort_order / is_visible 은 현재 공개 런타임이 소비하지 않는 관리용 메타다(고객 화면 영향 없음).
//   is_visible 토글 엔드포인트는 아직 없다(INSERT 시 TRUE 고정) → UI 미제공.

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

/** 코너에 연결된 콘텐츠 목록(+ 현재 표시 id). 보관/삭제된 세트는 서버가 제외한다. */
export async function fetchCornerContents(
  tabletId: string,
): Promise<{ items: CornerContent[]; currentScreenSetId: string | null }> {
  const res = await request<{ success: boolean; data: CornerContent[]; currentScreenSetId: string | null }>(
    `${BASE}/tablets/${tabletId}/screen-sets`,
  );
  return { items: res.data ?? [], currentScreenSetId: res.currentScreenSetId ?? null };
}

/** 코너에 콘텐츠 연결 추가(원본 복사 없음). 보관된 세트면 409 SCREEN_SET_ARCHIVED. UNIQUE 멱등. */
export async function addCornerContent(tabletId: string, screenSetId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/screen-sets/${screenSetId}`, { method: 'POST' });
}

/** 연결 해제(원본/타 코너/QR 무변경). 현재 표시 콘텐츠면 409 CURRENT_CONTENT_CANNOT_BE_REMOVED. */
export async function removeCornerContent(tabletId: string, screenSetId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/screen-sets/${screenSetId}`, { method: 'DELETE' });
}

/** 연결 정렬 — order = screenSetId 배열(표시 순서). */
export async function reorderCornerContents(tabletId: string, order: string[]): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/screen-sets/order`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

export async function applyCurrentScreenSet(tabletId: string, screenSetId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/current-screen-set`, {
    method: 'POST',
    body: JSON.stringify({ screenSetId }),
  });
}

export async function clearCurrentScreenSet(tabletId: string): Promise<void> {
  await request(`${BASE}/tablets/${tabletId}/current-screen-set`, { method: 'DELETE' });
}

export async function createTablet(name: string, location?: string): Promise<Tablet> {
  const res = await request<{ success: boolean; data: Tablet }>(
    `${BASE}/tablets`,
    {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), location: location?.trim() || undefined }),
    },
  );
  return res.data;
}

export async function deleteTablet(id: string): Promise<void> {
  await request<{ success: boolean; data: unknown }>(
    `${BASE}/tablets/${id}`,
    { method: 'DELETE' },
  );
}

export async function fetchTabletDisplays(
  tabletId: string,
): Promise<DisplayItem[]> {
  const res = await request<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
  );
  return res.data;
}

export async function saveTabletDisplays(
  tabletId: string,
  displays: Array<{
    productType: 'supplier' | 'local';
    productId: string;
    sortOrder: number;
    isVisible?: boolean;
    // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(null=선택 해제).
    contentId?: string | null;
  }>,
): Promise<DisplayItem[]> {
  const res = await request<{ success: boolean; data: DisplayItem[] }>(
    `${BASE}/tablets/${tabletId}/displays`,
    { method: 'PUT', body: JSON.stringify({ displays }) },
  );
  return res.data;
}

export async function fetchProductPool(
  tabletId: string,
): Promise<ProductPool> {
  const res = await request<{ success: boolean; data: ProductPool }>(
    `${BASE}/tablets/${tabletId}/product-pool`,
  );
  return res.data;
}

/**
 * 매장(조직) 기준 상품 풀 — 물리 태블릿과 무관.
 *
 * WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1:
 *   태블릿 콘텐츠(Screen Set)는 코너·태블릿과 독립된 원본이라 tabletId 가 없다.
 *   반환 형태는 fetchProductPool 과 동일.
 */
export async function fetchStoreProductPool(): Promise<ProductPool> {
  const res = await request<{ success: boolean; data: ProductPool }>(`${BASE}/product-pool`);
  return res.data;
}

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

import type { IdlePlaylistItem, TabletScreenResponse } from '@o4o/tablet-kiosk-core';

/**
 * Tablet idle playlist 조회 (admin).
 * 값이 없거나 에러 시 빈 배열 반환은 호출자가 처리.
 */
export async function fetchTabletIdlePlaylist(
  tabletId: string,
): Promise<IdlePlaylistItem[]> {
  const res = await request<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
  );
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

/**
 * Tablet idle playlist 저장 (전체 교체).
 * 빈 배열 허용 — kiosk 는 placeholder 표시.
 */
export async function saveTabletIdlePlaylist(
  tabletId: string,
  items: IdlePlaylistItem[],
): Promise<IdlePlaylistItem[]> {
  const res = await request<{ success: boolean; data: { items: IdlePlaylistItem[] } }>(
    `${BASE}/tablets/${tabletId}/idle-playlist`,
    { method: 'PUT', body: JSON.stringify({ items }) },
  );
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

// ==================== 위치 · 실제 태블릿 · 빠른 상품 수정 (WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1) ====================
// 세 축 분리: store_tablets = 위치(location 코드 + 메모), store_tablet_devices = 실제 태블릿(연결 기기),
//   Screen Set = 태블릿 콘텐츠. 위치↔콘텐츠 N:M, 기기↔위치는 current_location_id 로 이동 가능.

export interface ProductListSelection {
  productType: 'supplier' | 'local';
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
    supplierProducts: Array<{ productType: 'supplier'; productId: string; name: string }>;
    localProducts: Array<{ productType: 'local'; productId: string; name: string }>;
  };
}

/** 빠른 상품 수정 편집 데이터(현재 선택 + 매장 상품 풀). 경영자 경로. */
export async function fetchProductListEditor(screenSetId: string): Promise<ProductListEditorData> {
  const res = await request<{ success: boolean; data: ProductListEditorData }>(`${BASE}/screen-sets/${screenSetId}/product-list`);
  return res.data;
}

/** 빠른 상품 수정 저장(추가/제거/순서 = 배열 전체 교체). canonical product_list config 만 갱신. */
export async function saveProductList(
  screenSetId: string,
  products: Array<{ productType: 'supplier' | 'local'; productId: string; qrCodeId?: string | null }>,
): Promise<void> {
  await request(`${BASE}/screen-sets/${screenSetId}/product-list`, {
    method: 'PUT',
    body: JSON.stringify({ products: products.map((p) => ({ productType: p.productType, productId: p.productId, qrCodeId: p.qrCodeId ?? null })) }),
  });
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

/** 이 매장의 실제 태블릿(연결됨 + 연결 대기) 목록. */
export async function fetchTabletDevices(): Promise<TabletDevice[]> {
  const res = await request<{ success: boolean; data: TabletDevice[] }>(`${BASE}/tablet-devices`);
  return res.data ?? [];
}

/** 위치 카드 [태블릿 연결] → 6자리 연결 코드 발급(10분 유효). */
export async function createPairingCode(locationId: string): Promise<{ code: string; expiresAt: string; deviceId: string; locationId: string }> {
  const res = await request<{ success: boolean; data: { code: string; expiresAt: string; deviceId: string; locationId: string } }>(
    `${BASE}/tablets/${locationId}/pairing-codes`,
    { method: 'POST' },
  );
  return res.data;
}

export async function updateTabletDevice(
  id: string,
  input: { name?: string; currentLocationId?: string | null; isActive?: boolean },
): Promise<TabletDevice> {
  const res = await request<{ success: boolean; data: TabletDevice }>(`${BASE}/tablet-devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.data;
}

/** 기기 연결 해제(비활성 + 토큰 폐기). 위치/콘텐츠는 무변경. */
export async function disconnectTabletDevice(id: string): Promise<void> {
  await request(`${BASE}/tablet-devices/${id}`, { method: 'DELETE' });
}

// ---- 현장 직원 runtime (태블릿 화면 안 [직원 메뉴]) ----
// 기존 로그인 세션(Bearer) + 이 태블릿의 기기 토큰(X-Tablet-Device-Token) 을 함께 보낸다.
// 서버는 기기 토큰으로 매장을 확정하고, 로그인 사용자가 그 매장의 owner/admin/manager 인지만 본다.
// 별도 PIN·직원 계정·태블릿 전용 identity 없음. 경영자 전용(withStoreAuth) 권한을 넓히지 않는다.

export const TABLET_DEVICE_TOKEN_HEADER = 'X-Tablet-Device-Token';

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
  currentScreenSet: { id: string; name: string; description: string | null } | null;
  locations: RuntimeLocation[];
  contents: RuntimeContent[];
}

function withDevice(deviceToken: string, options: RequestInit = {}): RequestInit {
  return { ...options, headers: { ...(options.headers as Record<string, string> | undefined), [TABLET_DEVICE_TOKEN_HEADER]: deviceToken } };
}

export async function fetchRuntimeDevice(deviceToken: string): Promise<RuntimeSnapshot> {
  const res = await request<{ success: boolean; data: RuntimeSnapshot }>(`${BASE}/tablet-runtime/device`, withDevice(deviceToken));
  return res.data;
}

export async function fetchRuntimeLocationContents(deviceToken: string, locationId: string): Promise<RuntimeContent[]> {
  const res = await request<{ success: boolean; data: RuntimeContent[] }>(
    `${BASE}/tablet-runtime/locations/${locationId}/contents`,
    withDevice(deviceToken),
  );
  return res.data ?? [];
}

/** 이 기기의 위치 이동 — store_tablet_devices.current_location_id 만 바뀐다. */
export async function moveRuntimeDevice(deviceToken: string, deviceId: string, locationId: string): Promise<RuntimeSnapshot> {
  const res = await request<{ success: boolean; data: RuntimeSnapshot }>(
    `${BASE}/tablet-runtime/devices/${deviceId}/location`,
    withDevice(deviceToken, { method: 'POST', body: JSON.stringify({ locationId }) }),
  );
  return res.data;
}

/** 현재 위치의 표시 콘텐츠 전환(current_screen_set_id). active 콘텐츠만. */
export async function switchRuntimeContent(deviceToken: string, deviceId: string, screenSetId: string): Promise<RuntimeSnapshot> {
  const res = await request<{ success: boolean; data: RuntimeSnapshot }>(
    `${BASE}/tablet-runtime/devices/${deviceId}/content`,
    withDevice(deviceToken, { method: 'POST', body: JSON.stringify({ screenSetId }) }),
  );
  return res.data;
}

export async function fetchRuntimeProductListEditor(deviceToken: string, screenSetId: string): Promise<ProductListEditorData> {
  const res = await request<{ success: boolean; data: ProductListEditorData }>(
    `${BASE}/tablet-runtime/screen-sets/${screenSetId}/product-list`,
    withDevice(deviceToken),
  );
  return res.data;
}

export async function saveRuntimeProductList(
  deviceToken: string,
  screenSetId: string,
  products: Array<{ productType: 'supplier' | 'local'; productId: string; qrCodeId?: string | null }>,
): Promise<void> {
  await request(
    `${BASE}/tablet-runtime/screen-sets/${screenSetId}/product-list`,
    withDevice(deviceToken, {
      method: 'PUT',
      body: JSON.stringify({ products: products.map((p) => ({ productType: p.productType, productId: p.productId, qrCodeId: p.qrCodeId ?? null })) }),
    }),
  );
}
