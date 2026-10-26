/** Shared store client implementation; service transports remain in the app adapters. */
import type {
  IdlePlaylistItem,
  TabletScreenResponse,
} from "@o4o/tablet-kiosk-core";

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

export interface InterestSubmitResult {
  requestId: string;
  status: string;
  productName: string;
  createdAt: string;
}

export interface InterestStatusDetail {
  id: string;
  status: "REQUESTED" | "ACKNOWLEDGED" | "COMPLETED" | "CANCELLED";
  productName: string;
  customerName?: string;
  customerNote?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface TabletDisplaySettings {
  showPrice: boolean;
  showQr: boolean;
  showConsultationButton: boolean;
  autoSlideSeconds: number;
  idleSlideSeconds: number;
}

export interface StoredTabletDevice {
  deviceToken: string;
  deviceId: string;
  deviceName: string;
  storeSlug: string;
  storeName: string;
  locationId: string | null;
}

export interface PairingLookupResult {
  storeName: string;
  storeSlug: string;
  serviceKey: string | null;
  defaultLocationId: string | null;
  expiresAt: string;
  locations: Array<{ id: string; name: string; location: string | null }>;
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

export const TABLET_DEVICE_STORAGE_KEY = "o4o.tablet.device";

export const TABLET_DEVICE_TOKEN_HEADER = "X-Tablet-Device-Token";

export function createPublicTabletClient({
  getApiBase,
  fetch,
}: {
  getApiBase: () => string;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  async function fetchTabletProducts(
    slug: string,
    // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: optional tabletId(코너별 태블릿)
    params?: {
      page?: number;
      limit?: number;
      category?: string;
      q?: string;
      tabletId?: string;
    },
  ): Promise<{
    data: TabletProduct[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    localProducts?: unknown[];
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.category) query.set("category", params.category);
    if (params?.q) query.set("q", params.q);
    if (params?.tabletId) query.set("tabletId", params.tabletId);

    const qs = query.toString();
    const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/products${qs ? `?${qs}` : ""}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "Failed to fetch products");
    // WO-O4O-KPA-TABLET-PUBLIC-LOCAL-PRODUCTS-FIX-V1:
    //   공개 뷰어(kiosk-core)가 res.localProducts 를 소비하므로 응답의 localProducts 를 그대로 통과시킨다.
    //   (기존: data/meta 만 반환 → 매장 경영활용 제품이 공개 타블렛 화면에 노출되지 않던 버그)
    return {
      data: json.data,
      meta: json.meta,
      localProducts: json.localProducts,
    };
  }

  async function submitTabletInterest(
    slug: string,
    body: { masterId: string; customerName?: string; customerNote?: string },
  ): Promise<InterestSubmitResult> {
    const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "관심 요청 생성에 실패했습니다.");
    return json.data;
  }

  async function submitQrPageConsultation(
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, source: "qr", landingType: "page" }),
    });
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "상담 요청 생성에 실패했습니다.");
    return json.data;
  }

  async function checkTabletInterestStatus(
    slug: string,
    interestId: string,
  ): Promise<InterestStatusDetail> {
    const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest/${interestId}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "요청 조회에 실패했습니다.");
    return json.data;
  }

  async function fetchTabletIdle(
    slug: string,
    tabletId?: string,
  ): Promise<IdlePlaylistItem[]> {
    const qs = tabletId ? `?tabletId=${encodeURIComponent(tabletId)}` : "";
    const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/idle${qs}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "Failed to fetch idle playlist");
    return Array.isArray(json.data?.items) ? json.data.items : [];
  }

  async function fetchTabletSettings(
    slug: string,
  ): Promise<TabletDisplaySettings> {
    const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/settings`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(json.error?.message || "Failed to fetch tablet settings");
    return json.data;
  }

  async function fetchTabletScreen(
    slug: string,
    tabletId?: string,
    language?: string,
  ): Promise<TabletScreenResponse | null> {
    // WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1: 이용자 선택 언어를 쿼리로 전달(선택 언어 → ko → 없음).
    const params = new URLSearchParams();
    if (tabletId) params.set("tabletId", tabletId);
    if (language) params.set("language", language);
    const qs = params.toString() ? `?${params.toString()}` : "";
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

  function loadStoredTabletDevice(): StoredTabletDevice | null {
    try {
      const raw = localStorage.getItem(TABLET_DEVICE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed.deviceToken !== "string" ||
        typeof parsed.storeSlug !== "string"
      )
        return null;
      return parsed as StoredTabletDevice;
    } catch {
      return null;
    }
  }

  function saveStoredTabletDevice(device: StoredTabletDevice): void {
    try {
      localStorage.setItem(TABLET_DEVICE_STORAGE_KEY, JSON.stringify(device));
    } catch {
      /* storage 불가 환경 */
    }
  }

  function clearStoredTabletDevice(): void {
    try {
      localStorage.removeItem(TABLET_DEVICE_STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  async function readJson(res: Response): Promise<any> {
    return res
      .json()
      .catch(() => ({ success: false, error: `HTTP ${res.status}` }));
  }

  async function pairingLookup(code: string): Promise<PairingLookupResult> {
    const res = await fetch(`${getApiBase()}/tablet-pairing/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await readJson(res);
    if (!res.ok || !json.success) {
      const err: any = new Error(
        json.error?.message || json.error || "연결 코드를 확인할 수 없습니다.",
      );
      err.code = json.code;
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  async function pairingClaim(input: {
    code: string;
    deviceName?: string;
    locationId?: string | null;
  }): Promise<StoredTabletDevice> {
    const res = await fetch(`${getApiBase()}/tablet-pairing/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = await readJson(res);
    if (!res.ok || !json.success) {
      const err: any = new Error(
        json.error?.message || json.error || "태블릿을 연결할 수 없습니다.",
      );
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

  async function deviceHeartbeat(
    slug: string,
    deviceToken: string,
  ): Promise<DeviceHeartbeat> {
    const res = await fetch(
      `${getApiBase()}/${encodeURIComponent(slug)}/tablet/device/heartbeat`,
      {
        method: "POST",
        headers: { [TABLET_DEVICE_TOKEN_HEADER]: deviceToken },
      },
    );
    const json = await readJson(res);
    if (!res.ok || !json.success) {
      const err: any = new Error(
        json.error?.message || json.error || "heartbeat failed",
      );
      err.code = json.code;
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  return {
    fetchTabletProducts,
    submitTabletInterest,
    submitQrPageConsultation,
    checkTabletInterestStatus,
    fetchTabletIdle,
    fetchTabletSettings,
    fetchTabletScreen,
    loadStoredTabletDevice,
    saveStoredTabletDevice,
    clearStoredTabletDevice,
    pairingLookup,
    pairingClaim,
    deviceHeartbeat,
  };
}
