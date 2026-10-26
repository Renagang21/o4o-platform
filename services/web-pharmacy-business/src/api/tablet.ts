/**
 * Tablet API Client — Public (no auth)
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified /api/v1/stores namespace
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest-based consultation flow
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request functions
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1: fetchTabletIdle 추가
 *
 * Calls /api/v1/stores/:slug/tablet/* endpoints directly.
 * No authentication required for tablet kiosk mode.
 */
import type { IdlePlaylistItem, TabletScreenResponse } from '@o4o/tablet-kiosk-core';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/stores`;
}

export interface TabletProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
  // WO-O4O-TABLET-PRODUCT-TEXT-BUTTON-NO-IMAGE-V1: 규격·수량·제형·포장 (passthrough from public tablet API).
  specification?: string | null;
  description?: string;
  short_description?: string;
  channel_price?: number;
}

export async function fetchTabletProducts(
  slug: string,
  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: optional tabletId(코너별 태블릿)
  params?: { page?: number; limit?: number; category?: string; q?: string; tabletId?: string },
): Promise<{ data: TabletProduct[]; meta: { page: number; limit: number; total: number; totalPages: number }; localProducts?: unknown[] }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.category) query.set('category', params.category);
  if (params?.q) query.set('q', params.q);
  if (params?.tabletId) query.set('tabletId', params.tabletId);

  const qs = query.toString();
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/products${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch products');
  // WO-O4O-KPA-TABLET-PUBLIC-LOCAL-PRODUCTS-FIX-V1:
  //   공개 뷰어(kiosk-core)가 res.localProducts 를 소비하므로 응답의 localProducts 를 그대로 통과시킨다.
  //   (기존: data/meta 만 반환 → 매장 경영활용 제품이 공개 타블렛 화면에 노출되지 않던 버그)
  return { data: json.data, meta: json.meta, localProducts: json.localProducts };
}

// ==================== Interest Request API ====================

export interface InterestSubmitResult {
  requestId: string;
  status: string;
  productName: string;
  createdAt: string;
}

export interface InterestStatusDetail {
  id: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  productName: string;
  customerName?: string;
  customerNote?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export async function submitTabletInterest(
  slug: string,
  body: { masterId: string; customerName?: string; customerNote?: string },
): Promise<InterestSubmitResult> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '관심 요청 생성에 실패했습니다.');
  return json.data;
}

/**
 * WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1
 * QR page 콘텐츠 상담 요청 — 상품(masterId) 없는 상담.
 * 같은 공개 엔드포인트(/stores/:slug/tablet/interest)를 재사용하되 source='qr' 로 전송.
 * 서버에서 master_id=NULL, productName fallback, 알림 metadata 에 qr 컨텍스트 기록.
 */
export async function submitQrPageConsultation(
  slug: string,
  body: {
    productName?: string;
    customerName?: string;
    customerNote?: string;
    qrSlug?: string;
    landingTargetId?: string;
  },
): Promise<InterestSubmitResult> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, source: 'qr', landingType: 'page' }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '상담 요청 생성에 실패했습니다.');
  return json.data;
}

export async function checkTabletInterestStatus(
  slug: string,
  interestId: string,
): Promise<InterestStatusDetail> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest/${interestId}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '요청 조회에 실패했습니다.');
  return json.data;
}

// ==================== Idle Playlist API (WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1) ====================

/**
 * 매장 idle playlist 조회 (store-level 설정).
 * 값이 없거나 에러 발생 시 빈 배열 반환 — kiosk 는 placeholder 표시.
 */
export async function fetchTabletIdle(slug: string, tabletId?: string): Promise<IdlePlaylistItem[]> {
  const qs = tabletId ? `?tabletId=${encodeURIComponent(tabletId)}` : '';
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/idle${qs}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch idle playlist');
  return Array.isArray(json.data?.items) ? json.data.items : [];
}

// ==================== Display Settings (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) ====================

export interface TabletDisplaySettings {
  showPrice: boolean;
  showQr: boolean;
  showConsultationButton: boolean;
  autoSlideSeconds: number;
  idleSlideSeconds: number;
}

/**
 * 매장 전시 설정 조회(공개). 가격/QR/상담버튼 노출 + 전환 시간.
 * 에러 시 호출자가 기본값(전부 표시)으로 처리.
 */
export async function fetchTabletSettings(slug: string): Promise<TabletDisplaySettings> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/settings`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch tablet settings');
  return json.data;
}

// ==================== Screen Set (WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1) ====================

/**
 * 공개 태블릿 화면 구성 조회. 적용된 screen set 있으면 mode='screen_set'+sections, 없으면 'legacy'.
 * 실패 시 null 반환 → kiosk-core 는 legacy(/products+/idle) 로 동작.
 */
export async function fetchTabletScreen(slug: string, tabletId?: string, language?: string): Promise<TabletScreenResponse | null> {
  // WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1: 이용자 선택 언어를 쿼리로 전달(선택 언어 → ko → 없음).
  const params = new URLSearchParams();
  if (tabletId) params.set('tabletId', tabletId);
  if (language) params.set('language', language);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/screen${qs}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) return null;
    return (json.data ?? null) as TabletScreenResponse | null;
  } catch {
    return null;
  }
}


// ==================== 실제 태블릿 연결 · heartbeat (WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1) ====================
// 연결 코드(6자리)로 이 브라우저를 매장의 "실제 태블릿"으로 등록한다. 기기 토큰은 브라우저 저장소에만 두고
// 서버는 sha256 hash 만 보관한다. heartbeat 는 위치/현재 콘텐츠/version 을 돌려주는 가벼운 폴링(10~30초).

export const TABLET_DEVICE_STORAGE_KEY = 'o4o.tablet.device';
export const TABLET_DEVICE_TOKEN_HEADER = 'X-Tablet-Device-Token';

export interface StoredTabletDevice {
  deviceToken: string;
  deviceId: string;
  deviceName: string;
  storeSlug: string;
  storeName: string;
  locationId: string | null;
}

export function loadStoredTabletDevice(): StoredTabletDevice | null {
  try {
    const raw = localStorage.getItem(TABLET_DEVICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.deviceToken !== 'string' || typeof parsed.storeSlug !== 'string') return null;
    return parsed as StoredTabletDevice;
  } catch {
    return null;
  }
}

export function saveStoredTabletDevice(device: StoredTabletDevice): void {
  try { localStorage.setItem(TABLET_DEVICE_STORAGE_KEY, JSON.stringify(device)); } catch { /* storage 불가 환경 */ }
}

export function clearStoredTabletDevice(): void {
  try { localStorage.removeItem(TABLET_DEVICE_STORAGE_KEY); } catch { /* noop */ }
}

export interface PairingLookupResult {
  storeName: string;
  storeSlug: string;
  serviceKey: string | null;
  defaultLocationId: string | null;
  expiresAt: string;
  locations: Array<{ id: string; name: string; location: string | null }>;
}

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
}

/** 연결 코드 확인 — 어느 매장인지·위치 목록. 잘못된/만료 코드는 PAIRING_CODE_INVALID. */
export async function pairingLookup(code: string): Promise<PairingLookupResult> {
  const res = await fetch(`${getApiBase()}/tablet-pairing/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const json = await readJson(res);
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error?.message || json.error || '연결 코드를 확인할 수 없습니다.');
    err.code = json.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/** 연결 확정 — 기기 이름·위치 선택 후 토큰 발급(1회). */
export async function pairingClaim(input: { code: string; deviceName?: string; locationId?: string | null }): Promise<StoredTabletDevice> {
  const res = await fetch(`${getApiBase()}/tablet-pairing/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await readJson(res);
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error?.message || json.error || '태블릿을 연결할 수 없습니다.');
    err.code = json.code;
    err.status = res.status;
    throw err;
  }
  const d = json.data;
  return {
    deviceToken: d.deviceToken,
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    storeSlug: d.storeSlug,
    storeName: d.storeName,
    locationId: d.locationId ?? null,
  };
}

export interface DeviceHeartbeat {
  deviceId: string;
  deviceName: string;
  locationId: string | null;
  location: { id: string; name: string; location: string | null } | null;
  currentScreenSetId: string | null;
  /** 위치·현재 콘텐츠·콘텐츠 수정시각을 합친 서명. 바뀌면 화면을 다시 조회한다. */
  version: string;
}

/**
 * 기기 heartbeat(POST — last_seen_at 갱신). 토큰이 무효/해제되면 401 → 호출자는 저장된 기기 정보를 지운다.
 */
export async function deviceHeartbeat(slug: string, deviceToken: string): Promise<DeviceHeartbeat> {
  const res = await fetch(`${getApiBase()}/${encodeURIComponent(slug)}/tablet/device/heartbeat`, {
    method: 'POST',
    headers: { [TABLET_DEVICE_TOKEN_HEADER]: deviceToken },
  });
  const json = await readJson(res);
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error?.message || json.error || 'heartbeat failed');
    err.code = json.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}
