/**
 * createStoreHubApi — Store HUB 공통 클라이언트 팩토리
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (선행 census F1: VIEW_DUPLICATED)
 *
 * backend 는 이미 `createStoreHubController(serviceKey)` factory 로 3 서비스 공용인데
 * client 만 3벌(KPA 207 / KCos 139 / GP 118줄)이라는 비대칭이 F1 의 핵심이었다.
 * endpoint · 응답 형상 · 기본값(fallback)은 세 사본이 동일했고 차이는 **전송 계층**뿐이다:
 *   - KPA  : `apiClient` (base `/api/v1/kpa`, 이미 body 반환)
 *   - KCos : `authClient.api` (axios) + `/cosmetics` prefix + `.data` 언랩
 *   - GP   : `authClient.api` (axios) + `/glycopharm` prefix + `.data` 언랩
 * → 경로 prefix 와 언랩은 서비스가 주입하는 `StoreHubHttp` 가 소유하고,
 *   endpoint 목록과 응답 계약은 여기 한 곳으로 모은다. API 계약은 무변경이다.
 *
 * `createStoreCartApi` 와 동일한 패턴이다(검증된 선례).
 *
 * 범위: `/store-hub/*` (overview · channels · kpi-summary · live-signals · capabilities · slug).
 *   POP/QR/블로그 등 매장 **실행 자산** client 는 Agent C `/store*` 화면이 소비하므로 이번 범위 밖이다.
 */

/**
 * 서비스가 주입하는 최소 전송 계층.
 * url 은 `/store-hub/...` 로 시작하는 **서비스 네임스페이스 기준 상대 경로**이며,
 * 각 메서드는 **응답 body(envelope)를 그대로** 반환해야 한다(axios 라면 `.data` 언랩 후 전달).
 */
export interface StoreHubHttp {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
  patch<T>(url: string, body?: unknown): Promise<T>;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── 응답 타입 (3 서비스 공통) ────────────────────────────────────────────────

export interface StoreHubOverview {
  organizationId: string;
  organizationName: string | null;
  products: {
    glycopharm: { totalCount: number; link: string };
    /** KPA 만 내려주는 화장품 진열 수. 다른 서비스에서는 없다. */
    cosmetics?: { listedCount: number; link: string };
  };
  contents: {
    slots: Array<{ serviceKey: string; slotKey: string; count: number; link: string }>;
    /** KPA overview 만 포함. */
    totalSlotCount?: number;
  };
  signage: {
    pharmacy: { contentCount: number; activeCount: number; link: string };
  };
}

export type ChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type ChannelStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';

export interface ChannelOverview {
  id: string;
  channelType: ChannelType;
  status: ChannelStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  visibleProductCount: number;
  totalProductCount: number;
  salesLimitConfiguredCount: number;
}

/** WO-CHANNEL-EXECUTION-CONSOLE-V1: storefront preview 용 organizationCode 동반 */
export interface ChannelOverviewWithCode {
  channels: ChannelOverview[];
  organizationCode: string | null;
}

export interface StoreKpiSummary {
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  monthRevenue: number;
  avgOrderValue: number;
  lastMonthRevenue: number;
}

export interface LiveSignals {
  newOrders: number;
  pendingTabletRequests: number;
  pendingSalesRequests: number;
  surveyRequests: number;
}

export interface StoreCapabilityOverview {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  source: string;
}

export interface StoreSlugStatus {
  slug: string | null;
  isActive: boolean;
  canChange: boolean;
}

export interface StoreSlugChangeResult {
  slug: string;
  unchanged: boolean;
}

/**
 * Backend slug error codes — 전송 계층이 4xx 응답을 throw 할 때
 * `(err as Error & { code?: string }).code` 로 식별한다.
 */
export type StoreSlugErrorCode =
  | 'SLUG_RESERVED'
  | 'SLUG_DUPLICATE'
  | 'SLUG_INVALID'
  | 'SLUG_ALREADY_CHANGED'
  | 'INVALID_INPUT'
  | 'SERVICE_KEY_REQUIRED'
  | 'INTERNAL_ERROR';

const EMPTY_KPI: StoreKpiSummary = {
  todayOrders: 0,
  weekOrders: 0,
  monthOrders: 0,
  monthRevenue: 0,
  avgOrderValue: 0,
  lastMonthRevenue: 0,
};

const EMPTY_SIGNALS: LiveSignals = {
  newOrders: 0,
  pendingTabletRequests: 0,
  pendingSalesRequests: 0,
  surveyRequests: 0,
};

export interface StoreHubApiClient {
  fetchOverview(): Promise<StoreHubOverview | null>;
  fetchChannels(): Promise<ChannelOverview[]>;
  fetchChannelsWithCode(): Promise<ChannelOverviewWithCode>;
  /** 채널 활성화. KPA 는 B2C 은퇴로 진입점이 없지만 backend 는 3 서비스 공용이다. */
  createChannel(channelType: ChannelType): Promise<ChannelOverview>;
  fetchKpiSummary(): Promise<StoreKpiSummary>;
  fetchLiveSignals(): Promise<LiveSignals>;
  fetchCapabilities(): Promise<StoreCapabilityOverview[]>;
  fetchSlugStatus(): Promise<StoreSlugStatus>;
  updateSlug(newSlug: string): Promise<StoreSlugChangeResult>;
}

export function createStoreHubApi(http: StoreHubHttp): StoreHubApiClient {
  return {
    fetchOverview: async () => {
      const res = await http.get<Envelope<StoreHubOverview | null>>('/store-hub/overview');
      return res.data ?? null;
    },

    fetchChannels: async () => {
      const res = await http.get<Envelope<ChannelOverview[]>>('/store-hub/channels');
      return res.data ?? [];
    },

    fetchChannelsWithCode: async () => {
      const res = await http.get<
        Envelope<ChannelOverview[]> & { organizationCode?: string | null }
      >('/store-hub/channels');
      return { channels: res.data ?? [], organizationCode: res.organizationCode ?? null };
    },

    createChannel: async (channelType) => {
      const res = await http.post<Envelope<ChannelOverview>>('/store-hub/channels', { channelType });
      return res.data;
    },

    fetchKpiSummary: async () => {
      const res = await http.get<Envelope<StoreKpiSummary>>('/store-hub/kpi-summary');
      return res.data ?? EMPTY_KPI;
    },

    fetchLiveSignals: async () => {
      const res = await http.get<Envelope<LiveSignals>>('/store-hub/live-signals');
      return res.data ?? EMPTY_SIGNALS;
    },

    fetchCapabilities: async () => {
      const res = await http.get<Envelope<StoreCapabilityOverview[]>>('/store-hub/capabilities');
      return res.data ?? [];
    },

    fetchSlugStatus: async () => {
      const res = await http.get<Envelope<StoreSlugStatus>>('/store-hub/slug');
      return res.data ?? { slug: null, isActive: false, canChange: false };
    },

    updateSlug: async (newSlug) => {
      const res = await http.patch<Envelope<StoreSlugChangeResult>>('/store-hub/slug', { newSlug });
      return res.data;
    },
  };
}
