/**
 * @o4o/operator-core-ui — Product Applications module types
 *
 * WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 (Phase 3)
 *
 * KPA `ProductApplicationManagementPage` 를 service-neutral 공통 콘솔로 추출.
 * service 측은 `ProductApplicationsApi` 어댑터(자체 HTTP client + 정확한 경로)와
 * `ProductApplicationsConfig`(라벨/accent)를 주입한다.
 */

/** 운영자가 검수하는 공급 상품 신청 1건 (product_approvals 기반, list 응답 정규화 형태) */
export interface ProductApplication {
  id: string;
  organization_id: string;
  organizationName: string | null;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: {
    supplierName?: string;
    supplierId?: string;
    category?: string;
    [key: string]: unknown;
  };
  supplierName: string | null;
  /** 일반 공급가 */
  priceGeneral: number | null;
  /** 서비스 공급가 (기준가) */
  priceGold: number | null;
  /** 소비자 참고가 */
  consumerReferencePrice: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ProductApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
}

export type ProductApplicationStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export interface ProductApplicationListParams {
  page: number;
  limit: number;
  /** 'all' 일 때는 미전송 */
  status?: string;
}

export interface ProductApplicationListResult {
  data: ProductApplication[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface ProductApplicationAiSummary {
  summary: string;
  patterns: string[];
  recommendations: string[];
  warnings: string[];
  source: 'ai' | 'rule-based';
}

/**
 * service 측이 구현해 주입하는 어댑터. 각 메서드는 해당 서비스 client + 정확한 경로로 호출하고,
 * 실패 시 throw(메시지) 한다. 반환은 정규화된 형태(아래 타입)만 의존한다.
 */
/**
 * WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1:
 *   승인 결과 정규화. 백엔드는 approval 커밋과 매장 진열(OPL) 활성화를 SAVEPOINT 로 분리하므로
 *   "승인은 됐으나 진열 활성 실패"가 발생할 수 있다. 이를 성공으로 위장하지 않도록
 *   listingActivated 를 콘솔까지 전달해 토스트 문구를 분기한다. 필드 부재 시 undefined.
 */
export interface ProductApproveResult {
  listingActivated?: boolean;
}

export interface ProductApplicationsApi {
  list(params: ProductApplicationListParams): Promise<ProductApplicationListResult>;
  stats(): Promise<ProductApplicationStats>;
  approve(id: string): Promise<ProductApproveResult | void>;
  reject(id: string, reason?: string): Promise<unknown>;
  batchApprove(ids: string[]): Promise<unknown>;
  batchReject(ids: string[], reason?: string): Promise<unknown>;
  remove(id: string): Promise<unknown>;
  batchDelete(ids: string[]): Promise<unknown>;
  /** 선택 항목 AI 요약. 미제공 시 콘솔에서 AI 요약 버튼을 숨긴다. */
  aiSummarize?(items: unknown[], context: string): Promise<ProductApplicationAiSummary>;
}

export type ProductApplicationsAccent = 'blue' | 'teal' | 'pink';

export interface ProductApplicationsConfig {
  /** 페이지 제목. 기본 '공급 상품 신청 승인' */
  title?: string;
  /** 설명 문구. 기본 generic. */
  description?: string;
  /** 신청 주체(매장) 라벨. 기본 '약국' (KCos='매장'). 컬럼/드로어/모달 문구에 사용. */
  orgLabel?: string;
  /** 활성 필터 버튼 강조색. 기본 'blue' (GP='teal', KCos='pink'). */
  accent?: ProductApplicationsAccent;
  /** DataTable id. 기본 'product-applications'. */
  tableId?: string;
}

export interface ProductApplicationManagementConsoleProps {
  api: ProductApplicationsApi;
  config?: ProductApplicationsConfig;
}
