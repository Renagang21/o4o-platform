import type { AxiosInstance } from 'axios';
import type { TrialStatus, OperatorTrial, SettlementStatus, ParticipantListResponse, ParticipantFilters, UpdateParticipantPaymentInput, UpdateParticipantPaymentResult, ForumSyncFailure, ForumSyncFailureListResponse, MarketTrialKpiSnapshot, MarketTrialDetailKpi } from './types';


function marketTrialCommerceDisabled(message: string): never {
  const err = new Error(message) as Error & { response?: { data?: { message?: string } } };
  err.response = { data: { message } };
  throw err;
}
export function createFundingOperatorApi(api: AxiosInstance) {
async function getOperatorTrials(status?: string): Promise<OperatorTrial[]> {
  const params = status ? `?status=${status}` : '';
  const { data } = await api.get(`/neture/operator/market-trial${params}`);
  return data.data || data;
}

async function getOperatorTrialDetail(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.get(`/neture/operator/market-trial/${trialId}`);
  return data.data || data;
}

async function approveTrialFirst(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`/neture/operator/market-trial/${trialId}/approve`);
  return data.data || data;
}

async function rejectTrialFirst(trialId: string, reason: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`/neture/operator/market-trial/${trialId}/reject`, { reason });
  return data.data || data;
}

async function getOperatorTrialParticipants(
  trialId: string,
  filters?: ParticipantFilters,
): Promise<ParticipantListResponse> {
  const params = new URLSearchParams();
  if (filters?.rewardType) params.append('rewardType', filters.rewardType);
  if (filters?.rewardStatus) params.append('rewardStatus', filters.rewardStatus);
  if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  const qs = params.toString();
  const { data } = await api.get(
    `/neture/operator/market-trial/${trialId}/participants${qs ? `?${qs}` : ''}`,
  );
  return data.data || data;
}

async function updateParticipantRewardStatus(
  trialId: string,
  participantId: string,
  rewardStatus: 'pending' | 'fulfilled',
): Promise<{ id: string; rewardType: string | null; rewardStatus: string }> {
  const { data } = await api.patch(
    `/neture/operator/market-trial/${trialId}/participants/${participantId}/reward-status`,
    { rewardStatus },
  );
  return data.data || data;
}

async function updateParticipantSettlementStatus(
  trialId: string,
  participantId: string,
  settlementStatus: SettlementStatus,
  settlementNote?: string,
): Promise<{ id: string; settlementStatus: SettlementStatus; settlementNote: string | null; updatedAt: string | null }> {
  marketTrialCommerceDisabled('유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다.');
  // eslint-disable-next-line no-unreachable -- 정책 비활성화. 기존 로직 보존.
  const { data } = await api.patch(
    `/neture/operator/market-trial/${trialId}/participants/${participantId}/settlement-status`,
    { settlementStatus, ...(settlementNote !== undefined && { settlementNote }) },
  );
  return data.data || data;
}

async function updateParticipantPaymentStatus(
  trialId: string,
  participantId: string,
  input: UpdateParticipantPaymentInput,
): Promise<UpdateParticipantPaymentResult> {
  // WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1: 오프라인 입금(payment) 확인 재활성화
  // (settlement·매장 진열·전환은 content-only 로 계속 차단). 입금 확인 기록일 뿐 온라인 결제 아님.
  const { data } = await api.patch(
    `/neture/operator/market-trial/${trialId}/participants/${participantId}/payment-status`,
    input,
  );
  return data.data || data;
}

async function updateTrialStatus(trialId: string, status: TrialStatus): Promise<OperatorTrial> {
  const { data } = await api.patch(
    `/neture/operator/market-trial/${trialId}/status`,
    { status },
  );
  return data.data || data;
}

async function exportParticipantsCSV(trialId: string, filters?: ParticipantFilters): Promise<void> {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(filters || {})) if (value) params.set(field, value);
  const query = params.toString();
  const response = await api.get(
    `/neture/operator/market-trial/${trialId}/participants/export${query ? `?${query}` : ''}`,
    { responseType: 'blob' },
  );
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const disposition = response.headers['content-disposition'] || '';
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const fallback = disposition.match(/filename="([^"]+)"/i);
  let filename = fallback?.[1] || `market-trial-${trialId}-participants.csv`;
  if (utf8Name) { try { filename = decodeURIComponent(utf8Name[1]); } catch { /* Use ASCII fallback. */ } }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function getForumSyncFailures(params?: {
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
    `/neture/operator/market-trial/forum-sync-failures${qs ? `?${qs}` : ''}`,
  );
  return data;
}

async function resolveForumSyncFailure(
  failureId: string,
  note?: string,
): Promise<ForumSyncFailure> {
  const { data } = await api.patch(
    `/neture/operator/market-trial/forum-sync-failures/${failureId}/resolve`,
    { note },
  );
  return data.data || data;
}

async function retryTrialForumSync(
  trialId: string,
): Promise<{ status: 'created' | 'already_linked'; forumId: string }> {
  const { data } = await api.post(
    `/neture/operator/market-trial/${trialId}/forum-sync/retry`,
  );
  return data.data || data;
}

async function getOperatorMarketTrialKpi(): Promise<MarketTrialKpiSnapshot> {
  const { data } = await api.get(
    `/neture/operator/market-trial/kpi`,
  );
  return data.data || data;
}

async function getOperatorTrialKpi(trialId: string): Promise<MarketTrialDetailKpi> {
  const { data } = await api.get(
    `/neture/operator/market-trial/${trialId}/kpi`,
  );
  return data.data || data;
}
return { getOperatorTrials, getOperatorTrialDetail, approveTrialFirst, rejectTrialFirst, getOperatorTrialParticipants, updateParticipantRewardStatus, updateParticipantSettlementStatus, updateParticipantPaymentStatus, updateTrialStatus, exportParticipantsCSV, getForumSyncFailures, resolveForumSyncFailure, retryTrialForumSync, getOperatorMarketTrialKpi, getOperatorTrialKpi };
}
export type FundingOperatorApi = ReturnType<typeof createFundingOperatorApi>;
