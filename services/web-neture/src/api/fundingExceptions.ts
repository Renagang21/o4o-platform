import { api } from "../lib/apiClient";
export const FUNDING_EXCEPTION_LABELS: Record<string, string> = {
  payment_pending: "입금 확인 대기",
  payment_failed: "입금 확인 실패",
  amount_missing: "확인 금액 누락",
  refund_pending: "철회·중지 후 환급 확인 대기",
  pledge_missing: "약정 참여금 미등록",
  amount_mismatch: "참여금·확인 금액 불일치",
  fulfillment_pending: "결과 확정 후 이행 미확인",
  fulfilled_without_payment: "이행 완료·입금 미확인",
};
export interface FundingException {
  participantId: string;
  trialId: string;
  trialTitle: string;
  trialStatus: string;
  participantName: string;
  paymentStatus: string;
  rewardStatus: string;
  contributionAmount: string | number;
  paidAmount: string | number | null;
  updatedAt: string;
  types: string[];
}
export interface FundingHistoryItem {
  offlineAction?: string | null;
  reason?: string | null;
  beforeRefundAmount?: string | null;
  afterRefundAmount?: string | null;
  id: string;
  action: string;
  actorId: string | null;
  at: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  beforeAmount: string | null;
  afterAmount: string | null;
  referenceChanged: boolean | null;
  noteChanged: boolean | null;
}
const base = "/neture/operator/market-trial";
export const fundingExceptionsApi = {
  async list(
    type: string,
    page: number,
  ): Promise<{ items: FundingException[]; hasMore: boolean; page: number }> {
    const res = await api.get(
      `${base}/exceptions?${new URLSearchParams({ type, page: String(page) })}`,
    );
    if (!res.data?.success || !Array.isArray(res.data.data?.items))
      throw new Error("예외 현황을 조회하지 못했습니다.");
    return res.data.data;
  },
  async history(
    trialId: string,
    participantId: string,
    page = 1,
  ): Promise<{ items: FundingHistoryItem[]; page: number; hasMore: boolean }> {
    const res = await api.get(
      `${base}/${encodeURIComponent(trialId)}/participants/${encodeURIComponent(participantId)}/history?page=${page}`,
    );
    if (!res.data?.success || !Array.isArray(res.data.data))
      throw new Error("처리 이력을 조회하지 못했습니다.");
    return { items: res.data.data, page: res.data.page ?? page, hasMore: res.data.hasMore === true };
  },
};
