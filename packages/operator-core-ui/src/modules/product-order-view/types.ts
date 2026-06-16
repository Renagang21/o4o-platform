/**
 * @o4o/operator-core-ui — Product/Order View module (types)
 *
 * WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1
 *
 * Operator 의 서비스 전역 "상품 현황 / 주문 현황" view-only(모니터링) 화면 공통 타입.
 * 각 서비스 wrapper 가 `fetch*`(자체 api client + serviceKey) + `config`(copy/accent) 만 주입한다.
 *
 * ⚠️ view-only 불변: 생성/수정/삭제/주문 상태변경/배송/취소/환불/송장/정산/bulk action 없음.
 */

// ─── Accent (서비스 고유 색상 — wrapper 가 literal 로 주입; tailwind purge 안전) ───
// operator-core-ui 는 서비스 tailwind content 글롭에 없으므로, 서비스 primary/pink 계열
// accent 클래스는 반드시 서비스 wrapper 소스에서 literal 문자열로 전달한다.
export interface OperatorViewAccent {
  /** 첫 통계 카드 아이콘 배경 (예: 'bg-primary-100' | 'bg-pink-100') */
  iconBg: string;
  /** 첫 통계 카드 아이콘 색 (예: 'text-primary-600' | 'text-pink-600') */
  iconText: string;
  /** 검색 버튼 (예: 'bg-primary-500 hover:bg-primary-600' | 'bg-pink-600 hover:bg-pink-700') */
  searchButton: string;
  /** 입력/셀렉트 focus ring (예: 'focus:ring-primary-500' | 'focus:ring-pink-400') */
  focusRing: string;
  /** 전체 로딩 스피너 색 (예: 'text-primary-600' | 'text-pink-500') */
  loaderText: string;
  /** 안내(조회 전용) 배너 컨테이너 (예: 'bg-blue-50 border-blue-200' | 'bg-pink-50 border-pink-200') */
  infoContainer: string;
  /** 안내 배너 아이콘 색 (예: 'text-blue-600' | 'text-pink-600') */
  infoIcon: string;
  /** 안내 배너 제목 색 (예: 'text-blue-800' | 'text-pink-800') */
  infoTitle: string;
  /** 안내 배너 본문 색 (예: 'text-blue-600' | 'text-pink-600') */
  infoBody: string;
}

// ─── 상품 현황 ───
export interface ProductStatusRow {
  id: string;
  barcode: string;
  marketingName: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  brandName: string | null;
  categoryName: string | null;
  primaryImage: string | null;
  supplierCount: number;
  createdAt: string;
}

export interface ProductStatusStats {
  totalProducts: number;
  withImage: number;
  withSupplier: number;
  duplicateBarcodes: number;
}

export interface ProductStatusPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductStatusFetchParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ProductStatusListResult {
  products: ProductStatusRow[];
  stats: ProductStatusStats;
  pagination: ProductStatusPagination;
}

export type ProductStatusFetcher = (params: ProductStatusFetchParams) => Promise<ProductStatusListResult>;

export interface OperatorProductStatusConfig {
  /** 화면 제목 (기본: '상품 현황') */
  title?: string;
  /** 설명 (기본: 'Product Master 기반 플랫폼 상품 카탈로그') */
  description?: string;
  /** 빈 상태 문구 (기본: '상품 데이터가 없습니다') */
  emptyMessage?: string;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  /** 오류 fallback 문구 */
  errorFallback?: string;
  /** DataTable 식별자 (서비스별 컬럼 폭 저장 분리) */
  tableId: string;
  /**
   * 행 클릭 시 상세 경로 base (기본: '/operator/products').
   * `null` 이면 행 클릭 네비게이션을 비활성화한다 (상세 화면이 없는 서비스용 — 데드링크 방지).
   */
  detailPathBase?: string | null;
  accent: OperatorViewAccent;
}

export interface OperatorProductStatusPageProps {
  fetchProducts: ProductStatusFetcher;
  config: OperatorProductStatusConfig;
}

// ─── 주문 현황 ───
export interface OrderStatusRow {
  id: string;
  orderNumber: string;
  storeName?: string | null;
  channel?: string | null;
  itemCount: number;
  totalAmount: number | string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export interface OrderStatusStats {
  total: number;
  paid: number;
  pending: number;
  cancelled: number;
  totalAmount: number;
}

export interface OrderStatusFetchParams {
  page: number;
  limit: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

export interface OrderStatusListResult {
  orders: OrderStatusRow[];
  stats: OrderStatusStats;
  total: number;
}

export type OrderStatusFetcher = (params: OrderStatusFetchParams) => Promise<OrderStatusListResult>;

export interface OperatorOrderStatusConfig {
  /** 화면 제목 (기본: '주문 현황') */
  title?: string;
  /** 설명 (기본: 'B2B 주문 현황 (조회 전용)') */
  description?: string;
  /** 빈 상태 문구 (기본: '표시할 주문이 없습니다') */
  emptyMessage?: string;
  /** 검색 placeholder (기본: '주문번호 검색...') */
  searchPlaceholder?: string;
  /** 오류 fallback 문구 */
  errorFallback?: string;
  /** 조회 전용 안내 배너 제목 (기본: '주문 조회 전용') */
  noticeTitle?: string;
  /** 조회 전용 안내 배너 본문 */
  noticeBody?: string;
  accent: OperatorViewAccent;
}

export interface OperatorOrderStatusPageProps {
  fetchOrders: OrderStatusFetcher;
  config: OperatorOrderStatusConfig;
}
