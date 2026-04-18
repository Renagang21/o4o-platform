/**
 * Trial API Client
 *
 * Phase H8-FE: Trial Observation Frontend
 * WO-O4O-MARKET-TRIAL-PHASE1-V1: Supplier create/submit + Operator approval
 */

import { api, API_BASE_URL } from '../lib/apiClient';

// ============================================================================
// Types
// ============================================================================

export type TrialStatus =
  | 'draft' | 'submitted' | 'recruiting'
  | 'development' | 'outcome_confirming' | 'fulfilled' | 'closed';

export interface Trial {
  id: string;
  title: string;
  description?: string;
  supplierId: string;
  supplierName?: string;
  status: TrialStatus;
  // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
  convertedProductId?: string | null;
  convertedProductName?: string | null;
  conversionNote?: string | null;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  eligibleRoles?: string[];
  rewardOptions?: string[];
  visibleServiceKeys?: string[];
  maxParticipants?: number;
  currentParticipants: number;
  startDate?: string;
  endDate?: string;
  trialPeriodDays?: number;
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  targetAmount?: number | null;
  currentAmount?: number;
  trialUnitPrice?: number | null;
  rewardRate?: number;
  amountRate?: number | null;
  recruitRate?: number | null;
  // WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
  forumPostId?: string;
  settlementPreview?: {
    totalAmount: number;
    productQty: number;
    remainder: number;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorTrial extends Trial {
  forumLink?: {
    forumPostId: string;
    slug: string | null;
    url: string;
  } | null;
  // WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
  convertedProductId?: string | null;
  convertedProductName?: string | null;
  conversionNote?: string | null;
}

export type CustomerConversionStatus = 'none' | 'interested' | 'considering' | 'adopted' | 'first_order';

// WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
export type SettlementStatus =
  | 'pending' | 'choice_pending' | 'choice_completed' | 'offline_review' | 'offline_settled';

export interface TrialParticipant {
  id: string;
  name: string;
  type: string;
  rewardType: string | null;
  rewardStatus: string;
  customerConversionStatus: CustomerConversionStatus;
  customerConversionAt: string | null;
  customerConversionNote: string | null;
  // WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
  listingId: string | null;
  organizationId: string | null;
  joinedAt: string;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  contributionAmount: number;
  rewardRate: number;
  totalSettlementAmount: number;
  trialUnitPrice: number | null;
  estimatedProductQty: number | null;
  estimatedRemainder: number | null;
  settlementStatus: SettlementStatus;
  settlementChoice: 'product' | 'cash' | null;
  settlementAmount: number | null;
  settlementProductQty: number | null;
  settlementRemainder: number | null;
  settlementNote: string | null;
  updatedAt: string;
}

export interface ParticipantSummary {
  totalCount: number;
  productCount: number;
  cashCount: number;
  fulfilledCount: number;
  pendingCount: number;
  fulfillmentRate: number;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  settlementPendingCount: number;
  choicePendingCount: number;
  choiceCompletedCount: number;
  offlineReviewCount: number;
  offlineSettledCount: number;
}

export interface ParticipantListResponse {
  summary: ParticipantSummary;
  participants: TrialParticipant[];
}

export interface CreateTrialPayload {
  title: string;
  description?: string;
  visibleServiceKeys: string[];
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  maxParticipants?: number;
  fundingStartAt: string;
  fundingEndAt: string;
  trialPeriodDays: number;
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  targetAmount?: number;
  trialUnitPrice?: number;
  rewardRate?: number;
}

export interface TrialResultsSummary {
  totalCount: number;
  productCount: number;
  cashCount: number;
  fulfilledCount: number;
  pendingCount: number;
  fulfillmentRate: number;
  recruitRate: number | null;
  // WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
  conversionDistribution?: {
    none: number;
    interested: number;
    considering: number;
    adopted: number;
    first_order: number;
  };
  // WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
  listingCount?: number;
}

export interface TrialResults {
  trial: Trial;
  summary: TrialResultsSummary;
  forumPostId: string | null;
}

export interface Participation {
  id: string;
  trialId: string;
  userId: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  createdAt: string;
}

// ============================================================================
// WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1: Participant types
// (KPA-Society marketTrial.ts → Neture canonical 이식)
// ============================================================================

export type CreditProcessStatus = 'not_applicable' | 'pending' | 'planned' | 'completed';

export interface ParticipationInfo {
  id: string;
  trialId: string;
  participantId: string;
  role: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  joinedAt: string;
}

export interface ParticipationInfoDetail extends ParticipationInfo {
  settlementChoice: 'product' | 'cash' | null;
  settlementStatus: SettlementStatus;
  settlementAmount: number | null;
  settlementProductQty: number | null;
  settlementRemainder: number | null;
  creditProcessStatus: CreditProcessStatus;
  settlementNote: string | null;
  contributionAmount?: number;
  rewardRate?: number;
  totalSettlementAmount?: number;
  trialUnitPrice?: number | null;
  estimatedProductQty?: number | null;
  estimatedRemainder?: number | null;
}

export interface MyParticipationSummary extends ParticipationInfoDetail {
  trial?: {
    id: string;
    title: string;
    status: TrialStatus;
    supplierName?: string;
  };
}

export interface ShippingAddress {
  participationId: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  deliveryNote?: string;
  createdAt?: string;
}

export interface Fulfillment {
  participationId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed';
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  rewardType: 'cash' | 'product'
): Promise<Participation> {
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial/${trialId}/join`, { rewardType });
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
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial`, payload);
  return data.data || data;
}

export async function submitTrial(trialId: string): Promise<Trial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/market-trial/${trialId}/submit`);
  return data.data || data;
}

export async function getMyTrials(): Promise<Trial[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/my`);
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

export interface ConvertTrialPayload {
  /** Link to existing ProductMaster (A안) */
  productId?: string;
  /** Create new ProductMaster (B안) */
  productName?: string;
  /** Operator note */
  conversionNote?: string;
}

export interface TrialConversionResult {
  trial: OperatorTrial;
  conversionResult: {
    productId: string;
    productName: string;
    productRewardCount: number;
    note: string | null;
  };
}

export async function convertTrialToProduct(
  trialId: string,
  payload: ConvertTrialPayload,
): Promise<TrialConversionResult> {
  const { data } = await api.post(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/convert`,
    payload,
  );
  return data.data || data;
}

export interface ProductSearchItem {
  id: string;
  name: string;
  supplierName: string;
  categoryName: string;
  regulatoryType: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductSearchResponse {
  data: ProductSearchItem[];
  meta: { total: number; page: number; limit: number };
}

/**
 * WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1:
 * 전환 모달용 상품(SupplierProductOffer) 검색
 */
export async function searchProductsForConversion(
  keyword: string,
  opts?: { supplierUserId?: string; page?: number; limit?: number },
): Promise<ProductSearchResponse> {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (opts?.supplierUserId) params.set('supplierUserId', opts.supplierUserId);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const { data } = await api.get(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/products/search${qs ? `?${qs}` : ''}`,
  );
  return data;
}

// ============================================================================
// WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1: Funnel API
// ============================================================================

export interface TrialFunnel {
  recruitCount: number | null;
  participantCount: number;
  productRewardCount: number;
  convertedProduct: boolean;
  convertedProductId: string | null;
  convertedProductName: string | null;
  conversionDistribution: {
    none: number;
    interested: number;
    considering: number;
    adopted: number;
    first_order: number;
  };
  listingCount: number;
  firstOrderCount: number;
}

export async function getTrialFunnel(trialId: string): Promise<TrialFunnel> {
  const { data } = await api.get(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/funnel`);
  return data.data || data;
}

// ============================================================================
// Neture Operator API — 1차 승인 (WO-O4O-MARKET-TRIAL-PHASE1-V1)
// ============================================================================

export async function getOperatorTrials(status?: string): Promise<OperatorTrial[]> {
  const params = status ? `?status=${status}` : '';
  const { data } = await api.get(`${API_BASE_URL}/api/v1/neture/operator/market-trial${params}`);
  return data.data || data;
}

export async function getOperatorTrialDetail(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.get(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}`);
  return data.data || data;
}

export async function approveTrialFirst(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/approve`);
  return data.data || data;
}

export async function rejectTrialFirst(trialId: string, reason: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/reject`, { reason });
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 목록 JSON (인라인 표시)
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1: 필터 지원 추가
 */
export async function getOperatorTrialParticipants(
  trialId: string,
  filters?: {
    rewardType?: 'product' | 'cash';
    rewardStatus?: 'pending' | 'fulfilled';
    customerConversionStatus?: CustomerConversionStatus;
  },
): Promise<ParticipantListResponse> {
  const params = new URLSearchParams();
  if (filters?.rewardType) params.append('rewardType', filters.rewardType);
  if (filters?.rewardStatus) params.append('rewardStatus', filters.rewardStatus);
  if (filters?.customerConversionStatus) params.append('customerConversionStatus', filters.customerConversionStatus);
  const qs = params.toString();
  const { data } = await api.get(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants${qs ? `?${qs}` : ''}`,
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1:
 * 참여자 고객 전환 단계 변경
 */
export async function updateParticipantConversionStatus(
  trialId: string,
  participantId: string,
  status: CustomerConversionStatus,
  note?: string,
): Promise<{ id: string; customerConversionStatus: CustomerConversionStatus; customerConversionAt: string | null; customerConversionNote: string | null }> {
  const { data } = await api.patch(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants/${participantId}/conversion`,
    { status, note },
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
 * 참여자 이행 상태 변경
 */
export async function updateParticipantRewardStatus(
  trialId: string,
  participantId: string,
  rewardStatus: 'pending' | 'fulfilled',
): Promise<{ id: string; rewardType: string | null; rewardStatus: string }> {
  const { data } = await api.patch(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants/${participantId}/reward-status`,
    { rewardStatus },
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1:
 * 운영자 participant 정산 상태 변경
 * 허용 전이: pending→choice_pending, choice_completed→offline_review, offline_review→offline_settled
 */
export async function updateParticipantSettlementStatus(
  trialId: string,
  participantId: string,
  settlementStatus: SettlementStatus,
  settlementNote?: string,
): Promise<{ id: string; settlementStatus: SettlementStatus; settlementNote: string | null; updatedAt: string | null }> {
  const { data } = await api.patch(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants/${participantId}/settlement-status`,
    { settlementStatus, ...(settlementNote !== undefined && { settlementNote }) },
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1:
 * adopted 참여자 매장에 Trial 상품 진열 등록
 */
export async function createListingFromTrialParticipant(
  trialId: string,
  participantId: string,
  price?: number,
): Promise<{ listingId: string; organizationId: string; offerId: string; masterId: string }> {
  const { data } = await api.post(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants/${participantId}/listing`,
    { price },
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1:
 * Trial 단위 상태 전환
 */
export async function updateTrialStatus(trialId: string, status: TrialStatus): Promise<OperatorTrial> {
  const { data } = await api.patch(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/status`,
    { status },
  );
  return data.data || data;
}

/**
 * WO-MARKET-TRIAL-PARTICIPANT-EXPORT-V1: 참여자 CSV 다운로드
 */
export async function exportParticipantsCSV(trialId: string): Promise<void> {
  const response = await api.get(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/participants/export`,
    { responseType: 'blob' },
  );
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const disposition = response.headers['content-disposition'] || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : `market-trial-${trialId}-participants.csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// WO-MONITOR-1: 포럼 연계 실패 API
// ============================================================================

export type ForumSyncStage = 'category_check' | 'forum_post_create' | 'forum_mapping_save';
export type ForumSyncSeverity = 'critical' | 'warning';

export interface ForumSyncFailure {
  id: string;
  trialId: string;
  trialTitle: string;
  stage: ForumSyncStage;
  severity: ForumSyncSeverity;
  errorMessage: string;
  occurredAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface ForumSyncFailureListResponse {
  data: ForumSyncFailure[];
  meta: { total: number; page: number; limit: number };
}

export async function getForumSyncFailures(params?: {
  trialId?: string;
  resolved?: 'true' | 'false';
  page?: number;
  limit?: number;
}): Promise<ForumSyncFailureListResponse> {
  const sp = new URLSearchParams();
  if (params?.trialId) sp.set('trialId', params.trialId);
  if (params?.resolved) sp.set('resolved', params.resolved);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  const { data } = await api.get(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/forum-sync-failures${qs ? `?${qs}` : ''}`,
  );
  return data;
}

export async function resolveForumSyncFailure(
  failureId: string,
  note?: string,
): Promise<ForumSyncFailure> {
  const { data } = await api.patch(
    `${API_BASE_URL}/api/v1/neture/operator/market-trial/forum-sync-failures/${failureId}/resolve`,
    { note },
  );
  return data.data || data;
}

// ============================================================================
// Shipping / Fulfillment (existing)
// ============================================================================

export async function submitShippingAddress(
  participationId: string,
  address: Omit<ShippingAddress, 'participationId' | 'createdAt'>
): Promise<ShippingAddress> {
  const { data } = await api.post(`${API_BASE_URL}/api/trial-shipping/${participationId}`, address);
  return data.data || data;
}

export async function getShippingAddress(participationId: string): Promise<ShippingAddress | null> {
  try {
    const { data } = await api.get(`${API_BASE_URL}/api/trial-shipping/${participationId}`);
    return data.data || data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

export async function getFulfillment(participationId: string): Promise<Fulfillment | null> {
  try {
    const { data } = await api.get(`${API_BASE_URL}/api/trial-fulfillment/${participationId}`);
    return data.data || data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}
