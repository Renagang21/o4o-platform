/**
 * Groupbuy API for Member (Pharmacy) UI
 * Phase 3: UI Integration
 *
 * Work Order: WO-GROUPBUY-YAKSA-PHASE3-UI-INTEGRATION
 * Note: No price/amount display - quantity only (per Work Order rules)
 */

import { authClient } from '@o4o/auth-client';

// =====================================================
// Types
// =====================================================

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'completed' | 'cancelled';
export type CampaignProductStatus = 'active' | 'threshold_met' | 'closed';
export type GroupbuyOrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface GroupbuyCampaign {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  totalOrderedQuantity: number;
  totalConfirmedQuantity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  products?: CampaignProduct[];
}

export interface CampaignProduct {
  id: string;
  campaignId: string;
  productId: string;
  supplierId: string;
  status: CampaignProductStatus;
  minTotalQuantity: number;
  maxTotalQuantity?: number;
  orderedQuantity: number;
  confirmedQuantity: number;
  startDate: string;
  endDate: string;
  groupPrice: number; // Display only, no calculations
  createdAt: string;
  updatedAt: string;
  // Extended info (populated from backend)
  productName?: string;
  productImage?: string;
  supplierName?: string;
}

export interface GroupbuyOrder {
  id: string;
  campaignId: string;
  campaignProductId: string;
  pharmacyId: string;
  status: GroupbuyOrderStatus;
  quantity: number;
  dropshippingOrderId?: string;
  orderedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Extended info
  campaignTitle?: string;
  productName?: string;
}

export interface CampaignListFilters {
  status?: CampaignStatus;
  includeProducts?: boolean;
}

export interface OrderFilters {
  campaignId?: string;
  status?: GroupbuyOrderStatus;
}

export interface ParticipateData {
  campaignId: string;
  campaignProductId: string;
  pharmacyId: string;
  quantity: number;
  orderedBy?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// =====================================================
// API Functions
// =====================================================

export const groupbuyApi = {
  /**
   * Get active campaigns for member's organization
   * 약국 소속 지부/분회의 active 캠페인 조회
   */
  getCampaigns: async (organizationId: string, filters?: CampaignListFilters): Promise<GroupbuyCampaign[]> => {
    const params: Record<string, string> = { organizationId };
    if (filters?.status) params.status = filters.status;
    if (filters?.includeProducts) params.includeProducts = 'true';

    const response = await authClient.api.get<ApiResponse<GroupbuyCampaign[]>>(
      '/api/v1/yaksa/groupbuy/campaigns',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get campaign detail with products
   * 캠페인 상세 정보 및 상품 목록 조회
   */
  getCampaignDetail: async (campaignId: string): Promise<GroupbuyCampaign> => {
    const response = await authClient.api.get<ApiResponse<GroupbuyCampaign>>(
      `/api/v1/yaksa/groupbuy/campaigns/${campaignId}`
    );
    return response.data.data;
  },

  /**
   * Get products in a campaign
   * 캠페인 내 공동구매 상품 목록
   */
  getCampaignProducts: async (campaignId: string): Promise<CampaignProduct[]> => {
    const response = await authClient.api.get<ApiResponse<CampaignProduct[]>>(
      `/api/v1/yaksa/groupbuy/campaigns/${campaignId}/products`
    );
    return response.data.data;
  },

  /**
   * Get available products for ordering
   * 주문 가능한 상품만 조회 (기간/상태 체크 완료)
   */
  getAvailableProducts: async (campaignId: string): Promise<CampaignProduct[]> => {
    const response = await authClient.api.get<ApiResponse<CampaignProduct[]>>(
      `/api/v1/yaksa/groupbuy/products/available/${campaignId}`
    );
    return response.data.data;
  },

  /**
   * Get product detail
   * 공동구매 상품 상세 정보
   */
  getProductDetail: async (productId: string): Promise<CampaignProduct> => {
    const response = await authClient.api.get<ApiResponse<CampaignProduct>>(
      `/api/v1/yaksa/groupbuy/products/${productId}`
    );
    return response.data.data;
  },

  /**
   * Get pharmacy's order history
   * 약국의 공동구매 참여 이력
   */
  getMyOrders: async (pharmacyId: string, filters?: OrderFilters): Promise<GroupbuyOrder[]> => {
    const params: Record<string, string> = {};
    if (filters?.campaignId) params.campaignId = filters.campaignId;
    if (filters?.status) params.status = filters.status;

    const response = await authClient.api.get<ApiResponse<GroupbuyOrder[]>>(
      `/api/v1/yaksa/groupbuy/orders/pharmacy/${pharmacyId}`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Participate in groupbuy (create order)
   * 공동구매 참여 (주문 생성)
   */
  participate: async (data: ParticipateData): Promise<GroupbuyOrder> => {
    const response = await authClient.api.post<ApiResponse<GroupbuyOrder>>(
      '/api/v1/yaksa/groupbuy/orders',
      data
    );
    return response.data.data;
  },

  /**
   * Cancel pending order
   * 대기 중인 주문 취소
   */
  cancelOrder: async (orderId: string): Promise<GroupbuyOrder> => {
    const response = await authClient.api.post<ApiResponse<GroupbuyOrder>>(
      `/api/v1/yaksa/groupbuy/orders/${orderId}/cancel`
    );
    return response.data.data;
  },

  /**
   * Get campaign quantity summary
   * 캠페인 수량 요약
   */
  getCampaignSummary: async (campaignId: string): Promise<{
    totalOrdered: number;
    totalConfirmed: number;
    productSummaries: Array<{
      productId: string;
      orderedQuantity: number;
      confirmedQuantity: number;
      thresholdMet: boolean;
    }>;
  }> => {
    const response = await authClient.api.get<ApiResponse<any>>(
      `/api/v1/yaksa/groupbuy/campaigns/${campaignId}/summary`
    );
    return response.data.data;
  }
};
