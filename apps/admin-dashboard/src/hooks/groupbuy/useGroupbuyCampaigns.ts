/**
 * Groupbuy Campaigns Hook
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

/**
 * 캠페인 상태
 */
export type CampaignStatus = 'draft' | 'active' | 'closed' | 'completed' | 'cancelled';

/**
 * 캠페인 상품 상태
 */
export type CampaignProductStatus = 'active' | 'threshold_met' | 'closed';

/**
 * 캠페인 상품 (Phase 2 backend 정렬)
 * 금액 필드 제외 (Work Order 제약)
 */
export interface CampaignProduct {
  id: string;
  campaignId: string;
  productId: string;
  supplierId: string;
  minTotalQuantity: number;
  maxTotalQuantity?: number;
  orderedQuantity: number;
  confirmedQuantity: number;
  status: CampaignProductStatus;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 공동구매 캠페인 (Phase 2 backend 정렬)
 * 금액 필드 제외 (Work Order 제약)
 */
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
  participantCount: number;
  createdBy: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  products?: CampaignProduct[];
}

interface UseGroupbuyCampaignsOptions {
  organizationId?: string;
  status?: string;
  autoFetch?: boolean;
}

export const useGroupbuyCampaigns = (options: UseGroupbuyCampaignsOptions = {}) => {
  const { organizationId, status, autoFetch = true } = options;

  const [campaigns, setCampaigns] = useState<GroupbuyCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (organizationId) params.organizationId = organizationId;
      if (status) params.status = status;

      const response = await authClient.api.get('/api/groupbuy/campaigns', { params });
      // Handle new API response format: { success: true, data: [...] }
      const data = response.data?.data || response.data || [];
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '캠페인 목록을 불러오는데 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (data: Partial<GroupbuyCampaign>) => {
    try {
      const response = await authClient.api.post('/api/groupbuy/campaigns', data);
      toast.success('캠페인이 생성되었습니다.');
      await fetchCampaigns();
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 생성에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const updateCampaign = async (id: string, data: Partial<GroupbuyCampaign>) => {
    try {
      const response = await authClient.api.put(`/api/groupbuy/campaigns/${id}`, data);
      toast.success('캠페인이 수정되었습니다.');
      await fetchCampaigns();
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 수정에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await authClient.api.delete(`/api/groupbuy/campaigns/${id}`);
      toast.success('캠페인이 삭제되었습니다.');
      await fetchCampaigns();
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 삭제에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const activateCampaign = async (id: string) => {
    try {
      await authClient.api.post(`/api/groupbuy/campaigns/${id}/activate`);
      toast.success('캠페인이 활성화되었습니다.');
      await fetchCampaigns();
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 활성화에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const closeCampaign = async (id: string) => {
    try {
      const response = await authClient.api.post(`/api/groupbuy/campaigns/${id}/close`);
      toast.success('캠페인이 마감되었습니다.');
      await fetchCampaigns();
      return response.data?.data || response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '캠페인 마감에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const completeCampaign = async (id: string) => {
    try {
      const response = await authClient.api.post(`/api/groupbuy/campaigns/${id}/complete`);
      toast.success('캠페인이 완료되었습니다.');
      await fetchCampaigns();
      return response.data?.data || response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '캠페인 완료에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  const cancelCampaign = async (id: string) => {
    try {
      const response = await authClient.api.post(`/api/groupbuy/campaigns/${id}/cancel`);
      toast.success('캠페인이 취소되었습니다.');
      await fetchCampaigns();
      return response.data?.data || response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '캠페인 취소에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchCampaigns();
    }
  }, [organizationId, status, autoFetch]);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    activateCampaign,
    closeCampaign,
    completeCampaign,
    cancelCampaign
  };
};
