import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

export interface GroupbuyCampaign {
  id: string;
  organizationId?: string;
  productId: string;
  name: string;
  description?: string;
  groupPrice: number;
  regularPrice: number;
  minQuantity: number;
  maxQuantity?: number;
  currentQuantity: number;
  participantCount: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed' | 'failed' | 'closed' | 'cancelled';
  isOrganizationExclusive: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
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
      setCampaigns(response.data || []);
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 목록을 불러오는데 실패했습니다.';
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
      await authClient.api.post(`/api/groupbuy/campaigns/${id}/close`);
      toast.success('캠페인이 마감되었습니다.');
      await fetchCampaigns();
    } catch (err: any) {
      const message = err.response?.data?.message || '캠페인 마감에 실패했습니다.';
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
    closeCampaign
  };
};
