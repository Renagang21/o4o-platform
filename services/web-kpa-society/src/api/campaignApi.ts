/**
 * Campaign API — Neture TimeLimitedPriceCampaign 조회
 *
 * WO-NETURE-CAMPAIGN-SIMPLIFICATION-V2
 * KPA-c (분회 executor) / KPA-b (지부 observer) 공동구매 UI 연동.
 * 1 Campaign = 1 product_id. CampaignTarget 제거됨.
 * 캠페인 생성/수정 API는 의도적으로 포함하지 않음 (KPA는 UI-only).
 */

import { ApiClient } from './client';
import { apiClient } from './client';

const NETURE_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/neture`
  : '/api/v1/neture';

const netureClient = new ApiClient(NETURE_API_BASE);

/** 서버 조인 결과: campaign + listing 뷰 */
export interface CampaignGroupbuyView {
  campaignId: string;
  campaignName: string;
  campaignDescription: string | null;
  startAt: string;
  endAt: string;
  productId: string;
  campaignPrice: number;
  listingId: string;
  productName: string;
}

/** Campaign — 1 campaign = 1 product_id */
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  supplierId: string;
  productId: string;
  campaignPrice: number;
  status: string;
  startAt: string;
  endAt: string;
}

/**
 * 캠페인 집계 (KPA-b read-only)
 *
 * WO-KPA-CAMPAIGN-STATUS-CLARITY-V1:
 * - totalOrders : 참여(주문) 건수 — status='PAID' 기준 카운트
 * - totalQuantity : 총 수량 — 동일 기준 SUM(quantity)
 * - totalAmount : 의도적 제외 — KPA에 금액 데이터 전달 금지 (FREEZE §7.3)
 */
export interface CampaignAggregation {
  id: string;
  campaignId: string;
  productId: string;
  organizationId: string | null;
  /** 참여(주문) 건수 — status='PAID' 기준 */
  totalOrders: number;
  /** 총 수량 — status='PAID' 기준 SUM(quantity) */
  totalQuantity: number;
}

export const campaignApi = {
  /** 서버 조인 뷰: 활성 캠페인 + 리스팅 */
  getCampaignGroupbuys: () =>
    apiClient.get<{ success: boolean; data: CampaignGroupbuyView[] }>('/campaign-groupbuys'),

  /** 활성 캠페인 목록 — KPA-b 상태 페이지용 */
  getActiveCampaigns: () =>
    netureClient.get<{ success: boolean; data: Campaign[] }>('/campaigns/active'),

  /** 캠페인 상세 */
  getCampaignById: (id: string) =>
    netureClient.get<{ success: boolean; data: Campaign }>(`/campaigns/${id}`),

  /** 캠페인 집계 — KPA-b 수량 현황 (금액 표시 금지) */
  getCampaignAggregations: (id: string) =>
    netureClient.get<{ success: boolean; data: CampaignAggregation[] }>(`/campaigns/${id}/aggregations`),
};
