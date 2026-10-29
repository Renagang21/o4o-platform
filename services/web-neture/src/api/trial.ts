import type { TrialStatus, Trial, CreateTrialPayload, UpdateTrialPayload, TrialResults, Participation, ParticipationInfo, ParticipationInfoDetail, MyParticipationSummary, FundingForumAccess } from '@o4o/operator-core-ui/modules/funding-operations';
import { createFundingOperatorApi } from '@o4o/operator-core-ui/modules/funding-operations';
import { api, API_BASE_URL } from '../lib/apiClient';
import type { EnrollmentPolicyReference } from '@o4o/shared-space-ui';

export type { TrialStatus, TrialProductRef, Trial, OperatorTrial, SettlementStatus, PaymentStatus, TrialParticipant, ParticipantSummary, ParticipantListResponse, CreateTrialPayload, UpdateTrialPayload, TrialResultsSummary, TrialResults, Participation, CreditProcessStatus, ParticipationInfo, ParticipationInfoDetail, MyParticipationSummary, ConvertTrialPayload, TrialConversionResult, ProductSearchItem, ProductSearchResponse, ParticipantFilters, UpdateParticipantPaymentInput, UpdateParticipantPaymentResult, ForumSyncStage, ForumSyncSeverity, ForumSyncFailure, ForumSyncFailureListResponse, MarketTrialKpiSnapshot, MarketTrialDetailKpi, FundingForumAccess } from '@o4o/operator-core-ui/modules/funding-operations';

export { PAYMENT_STATUS_LABELS } from '@o4o/operator-core-ui/modules/funding-operations';

/**
 * Trial API Client
 *
 * Phase H8-FE: Trial Observation Frontend
 * WO-O4O-MARKET-TRIAL-PHASE1-V1: Supplier create/submit + Operator approval
 */



/**
 * WO-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1:
 * 유통참여형 펀딩 = Neture 전용 content-only 모집. 제품 전환 / 매장 진열(OPL) /
 * 정산 / 결제 / 배송 등 커머스 mutation 은 더 이상 제공하지 않는다.
 * 클라이언트 단에서 즉시 차단하여 신규 커머스 데이터 생성을 막는다.
 * (backend 도 동일 정책으로 409 차단. 기존 데이터는 건드리지 않음.)
 */
function marketTrialCommerceDisabled(message: string): never {
  const err = new Error(message) as Error & { response?: { data?: { message?: string } } };
  err.response = { data: { message } };
  throw err;
}

// ============================================================================
// Types
// ============================================================================



/**
 * WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2:
 * 펀딩에 연결된 공급자 등록 제품(ProductMaster) 표시용 요약. 가격/재고 미포함.
 */






// WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1


// WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1


// WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1:
// 온라인 결제가 아니라 운영자 오프라인 입금 확인 기준 용어.










/** WO-MARKET-TRIAL-EDIT-FLOW-V1 */








// ============================================================================
// WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1: Participant types
// (KPA-Society marketTrial.ts → Neture canonical 이식)
// ============================================================================









// WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1):
// ShippingAddress / Fulfillment 타입 제거 (content-only — 주문/발송 축 제거).

// ============================================================================
// Public / Store API
// ============================================================================

export async function getTrials(): Promise<Trial[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial`);
  return data.data || data;
}

export async function getTrial(trialId: string): Promise<Trial> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${trialId}`);
  return data.data || data;
}

export async function joinTrial(
  trialId: string,
  rewardType: 'cash' | 'product',
  policyReferences?: EnrollmentPolicyReference[]
): Promise<Participation> {
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial/${trialId}/join`, { rewardType, policyReferences });
  return data.data || data;
}

// ============================================================================
// WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1: Participant API
// ============================================================================

/** Trial 상세 + 내 참여 여부 — 로그인 유저 한정 */
export async function getParticipation(trialId: string): Promise<ParticipationInfo | null> {
  try {
    const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${trialId}/participation`);
    return data.data || data || null;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

/** 내 참여 목록 — `/market-trial/my` */
export async function getMyParticipations(): Promise<MyParticipationSummary[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/my-participations`);
  return data.data || data || [];
}

/** 내 참여 상세 + 정산 정보 — `/market-trial/my` 드로어 */
export async function getMyParticipationDetail(trialId: string): Promise<ParticipationInfoDetail> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${trialId}/my-settlement`);
  return data.data || data;
}

/** 정산 선택 저장 (제품 / 현금) */
export async function saveSettlementChoice(
  trialId: string,
  choice: 'product' | 'cash',
): Promise<ParticipationInfoDetail> {
  marketTrialCommerceDisabled('유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다.');
  // eslint-disable-next-line no-unreachable -- 정책 비활성화. 기존 로직 보존.
  const { data } = await api.post(
    `${API_BASE_URL}/api/market-trial/${trialId}/settlement-choice`,
    { choice },
  );
  return data.data || data;
}

// ============================================================================
// Supplier API (WO-O4O-MARKET-TRIAL-PHASE1-V1)
// ============================================================================

export async function createTrial(payload: CreateTrialPayload): Promise<Trial> {
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial`, payload, fundingOrganizationConfig());
  return data.data || data;
}

/** WO-MARKET-TRIAL-EDIT-FLOW-V1 */
export async function updateTrial(trialId: string, payload: UpdateTrialPayload): Promise<Trial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/market-trial/${trialId}`, payload);
  return data.data || data;
}

export async function submitTrial(trialId: string): Promise<Trial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/market-trial/${trialId}/submit`);
  return data.data || data;
}

export async function getMyTrials(): Promise<Trial[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/my`, fundingOrganizationConfig());
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1:
 * 공급자용 Trial 결과 조회 (집계 통계 + 포럼 링크)
 */
export async function getSupplierTrialResults(trialId: string): Promise<TrialResults> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${trialId}/results`);
  return data.data || data;
}

// ============================================================================
// WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
// ============================================================================





// WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1: convertTrialToProduct 제거 (content-only, 호출처 0).





// WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1: searchProductsForConversion 제거 (content-only, 호출처 0).

// ============================================================================
// WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1: Funnel API
// ============================================================================

// WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: TrialFunnel / getTrialFunnel 제거
// (전환 퍼널 = content-only 비대상, backend getFunnel 도 전환 집계 미반환).

// ============================================================================
// Neture Operator API — 1차 승인 (WO-O4O-MARKET-TRIAL-PHASE1-V1)
// ============================================================================









/**
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 목록 JSON (인라인 표시)
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1: 필터 지원 추가
 */




// WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: updateParticipantConversionStatus 제거 (content-only).

/**
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
 * 참여자 이행 상태 변경
 */


/**
 * WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1:
 * 운영자 participant 정산 상태 변경
 * 허용 전이: pending→choice_pending, choice_completed→offline_review, offline_review→offline_settled
 */


/**
 * WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1:
 * 운영자 participant 결제 상태 갱신. PG 연동 전 단계의 수기 송금 확인 + 향후 PG webhook의
 * 백엔드 entry point 역할. payment 변경은 trial.status에 영향을 주지 않는다.
 *
 * Body 필드는 모두 선택. paymentStatus만 필수.
 *   - paymentMethod 권장값: 'manual_transfer'
 *   - paymentProvider 권장값: 'internal' (수기) / 'toss' / 'kakao' 등 (향후)
 *   - confirmedAt 미지정 + paymentStatus='paid' → 백엔드가 자동 stamp
 */






// WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: createListingFromTrialParticipant 제거 (content-only).

/**
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
 * Trial 단위 상태 전환
 */


/**
 * WO-MARKET-TRIAL-PARTICIPANT-EXPORT-V1: 참여자 CSV 다운로드
 */


// ============================================================================
// WO-MONITOR-1: 포럼 연계 실패 API
// ============================================================================












/**
 * WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1
 * 포럼 공고 게시 재시도 (운영자 전용 · 멱등).
 * 이미 게시된 trial 은 already_linked 로 응답하며 중복 생성하지 않는다.
 */


// ============================================================================
// Shipping / Fulfillment (existing)
// ============================================================================

// WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1: submitShippingAddress 제거 (content-only, 호출처 0).

// WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1):
// getShippingAddress / getFulfillment 제거 (content-only — 주문/발송 축 제거, route 삭제됨).

// ============================================================================
// Analytics / KPI (WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1)
// ============================================================================









const FUNDING_ORGANIZATION_KEY = 'funding_supplier_org';
export function selectFundingOrganization(id: string) { if (id) window.sessionStorage.setItem(FUNDING_ORGANIZATION_KEY, id); else window.sessionStorage.removeItem(FUNDING_ORGANIZATION_KEY); }
function fundingOrganizationConfig() {
  const id = typeof window === 'undefined' ? null : window.sessionStorage.getItem(FUNDING_ORGANIZATION_KEY);
  return id ? { headers: { 'x-organization-id': id } } : {};
}
export async function getFundingCreatorEligibility() {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/creator-eligibility`, fundingOrganizationConfig());
  return data.data;
}
export async function changeFundingCreatorStatus(id: string, status: TrialStatus) {
  const { data } = await api.patch(`${API_BASE_URL}/api/market-trial/${id}/creator-status`, { status });
  return data.data;
}
export async function getFundingCreatorParticipants(id: string): Promise<{ id: string; name: string; paymentStatus: string; withdrawn?: boolean }[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${id}/creator-participants`);
  return data.data;
}

export async function getFundingForumAccess(id: string): Promise<FundingForumAccess> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${id}/forum-access`);
  return data.data;
}

export const { getOperatorTrials, getOperatorTrialDetail, approveTrialFirst, rejectTrialFirst, getOperatorTrialParticipants, updateParticipantRewardStatus, updateParticipantSettlementStatus, updateParticipantPaymentStatus, updateTrialStatus, exportParticipantsCSV, getForumSyncFailures, resolveForumSyncFailure, retryTrialForumSync, getOperatorMarketTrialKpi, getOperatorTrialKpi } = createFundingOperatorApi(api);
