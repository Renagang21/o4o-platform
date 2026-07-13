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
const BASE = `${API_BASE}/api/v1/store`;

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
export type ScreenBlockType =
  | 'idle_media' | 'product_list' | 'product_content'
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
  summary: string | null;
  languages: string[];
}
/** content_list item(저장 config) — 계약: masterId+language(o4o) / contentId(store) */
export type ContentListItem =
  | { sourceType: 'o4o_product_description'; masterId: string; language: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number }
  | { sourceType: 'store_content'; contentId: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number };

export interface ScreenSet {
  id: string;
  organizationId: string;
  serviceKey: string | null;
  tabletId: string | null;
  name: string;
  origin: 'store' | 'operator';
  status: ScreenSetStatus;
  // WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1: 화면 세트 렌더 템플릿 키.
  //   서버 GET 은 COALESCE 로 항상 non-null 반환(미지정 → corner_information_basic_v1).
  templateKey: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  blockCount?: number;
  isApplied?: boolean;
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

export async function createScreenSet(input: { name: string; tabletId?: string | null; status?: 'draft' | 'active'; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/screen-sets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateScreenSet(id: string, input: { name?: string; status?: ScreenSetStatus; tabletId?: string | null; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/screen-sets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
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

// ==================== Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ====================

import type { IdlePlaylistItem } from '@o4o/tablet-kiosk-core';

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
