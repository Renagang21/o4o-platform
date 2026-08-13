/**
 * Operator Store Channels Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * KPA(412) / K-Cosmetics(396) / GlycoPharm(408) 이 같은 업무 화면
 * (`GET /api/v1/operator/stores/channels` cross-store 채널 목록 + 상태 전이)을
 * 각각 구현하고 있었다. 실차이는 HTTP client · actionPolicy key · accent · 부제 뿐이다.
 *
 * API endpoint · payload · 채널 상태 머신(APPROVED ↔ SUSPENDED → TERMINATED)은 불변이다.
 */

export interface StoreChannelData {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  channelType: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreChannelPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StoreChannelListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  channelType?: string;
}

export interface StoreChannelListResult {
  success: boolean;
  channels: StoreChannelData[];
  pagination: StoreChannelPagination;
}

/**
 * 서비스별 HTTP adapter.
 * KPA 는 Bearer fetch, K-Cosmetics/GlycoPharm 은 axios wrapper 를 쓴다 — 그 차이만 흡수한다.
 */
export interface StoreChannelsClient {
  list(params: StoreChannelListParams): Promise<StoreChannelListResult>;
  updateStatus(storeId: string, channelId: string, status: string): Promise<void>;
}

/**
 * 서비스 accent — className 문자열로 주입한다.
 * 값은 서비스 wrapper 소스에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
 */
export interface StoreChannelsAccent {
  /** 매장명 hover 색 (e.g. 'hover:text-blue-600') */
  storeLinkHover: string;
  /** 검색/필터 focus ring (e.g. 'focus:ring-blue-500') */
  focusRing: string;
  /** 검색 버튼 배경 (e.g. 'bg-slate-700 hover:bg-slate-800') */
  searchButton: string;
  /** 현재 페이지 버튼 배경 (e.g. 'bg-slate-700 text-white') */
  activePage: string;
  /** '활성' KPI 숫자 색 (e.g. 'text-green-600') */
  approvedCountText: string;
  /** '활성' 상태 배지 (e.g. { bg: 'bg-green-100', text: 'text-green-700' }) */
  approvedBadge: { bg: string; text: string };
}

export interface OperatorStoreChannelsPageProps {
  client: StoreChannelsClient;
  accent: StoreChannelsAccent;
  /** ActionPolicy 등록 키 (e.g. 'kpa:store-channels' / 'cosmetics:store-channels') */
  actionPolicyKey: string;
  /** DataTable 컬럼 설정 저장 키 (e.g. 'kpa-store-channels') */
  tableId: string;
  /** 헤더 부제 (e.g. '전체 매장의 채널 상태를 관리합니다') */
  description: string;
  /**
   * 매장명 클릭 시 이동 처리. 서비스가 react-router `navigate` 를 주입한다.
   * (하드 내비게이션은 SPA 세션을 잃으므로 href 가 아니라 콜백으로 받는다.)
   * 미주입 시 매장명은 클릭 불가 텍스트로 렌더된다.
   */
  onStoreClick?: (storeId: string) => void;
  /**
   * 상태 변경 성공 시 toast 노출 여부 (기본 false).
   * K-Cosmetics 만 성공 toast 를 띄우고 있었다 — 기존 동작 보존용 플래그.
   */
  toastOnStatusChange?: boolean;
}
