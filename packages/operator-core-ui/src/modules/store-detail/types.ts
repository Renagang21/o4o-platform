/**
 * Operator Store Detail Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * KPA(580) / K-Cosmetics(433) / GlycoPharm 이 같은 업무 화면
 * (`GET /api/v1/operator/stores/:storeId` 상세 + 채널 + capabilities + 상품)을
 * 각각 구현하고 있었다. endpoint · 데이터 모델 · 조작(채널 상태 전이, capability 토글)이 모두 같다.
 *
 * 공통 본체는 KPA 구현을 기준으로 삼는다 — 4축 독립 로드/오류/재시도, DataTable 표준
 * (OPERATOR-DATATABLE-POLICY-V1), 상품 더보기 페이징, 영구 종료 확인 게이트를 모두 갖춘 쪽이다.
 */

export interface OperatorStoreDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  address: string | null;
  addressDetail: {
    zipCode?: string;
    baseAddress: string;
    detailAddress?: string;
    region?: string;
  } | null;
  phone: string | null;
  description: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDetailChannel {
  id: string;
  channelType: string;
  status: string;
  approvedAt: string | null;
  approvedByName: string | null;
  createdAt: string;
}

export interface StoreDetailCapability {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  source: string;
}

export interface StoreDetailProduct {
  id: string;
  isActive: boolean;
  price: number | null;
  masterId: string;
  barcode: string;
  marketingName: string;
  primaryImage: string | null;
  offerPrice: number | null;
  distributionType: string | null;
  createdAt: string;
}

/** 서비스별 HTTP adapter — KPA 는 Bearer fetch, KCos/GP 는 axios wrapper. */
export interface StoreDetailClient {
  getStore(storeId: string): Promise<{ success: boolean; store: OperatorStoreDetail }>;
  getChannels(storeId: string): Promise<{ success: boolean; channels: StoreDetailChannel[] }>;
  getCapabilities(storeId: string): Promise<{ success: boolean; capabilities: StoreDetailCapability[] }>;
  getProducts(
    storeId: string,
    page: number,
    limit: number,
  ): Promise<{
    success: boolean;
    products: StoreDetailProduct[];
    pagination: { total: number; totalPages: number };
  }>;
  toggleCapability(storeId: string, key: string, enabled: boolean): Promise<void>;
  updateChannelStatus(storeId: string, channelId: string, status: string): Promise<void>;
}

export interface OperatorStoreDetailPageProps {
  storeId: string | undefined;
  client: StoreDetailClient;
  /** '매장 목록으로' 클릭 시 이동 (react-router navigate 주입 — 하드 내비게이션 금지) */
  onBack: () => void;
  /**
   * 매장 type → 표시 라벨. 서비스마다 다르다
   * (KPA 는 pharmacy:'약국' 포함, K-Cosmetics 는 제외 — 도메인 어휘 정합).
   */
  typeLabels: Record<string, string>;
  /**
   * capability 토글 ON 색 (기본 'bg-green-500'). K-Cosmetics 는 'bg-pink-500'.
   * 서비스 소스에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
   */
  capabilityOnClass?: string;
  /** 전체 로딩 스피너 테두리 색 (기본 'border-slate-600'). */
  spinnerClass?: string;
  /** DataTable 컬럼 설정 저장 키 */
  tableIds?: { channels?: string; products?: string };
}
