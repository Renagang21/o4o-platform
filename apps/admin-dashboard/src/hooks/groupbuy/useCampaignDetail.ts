/**
 * Groupbuy Campaign Detail Hook
 * Phase 3: UI Integration
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import type { GroupbuyCampaign } from './useGroupbuyCampaigns';

export const useCampaignDetail = (campaignId?: string) => {
  const [campaign, setCampaign] = useState<GroupbuyCampaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get(`/api/groupbuy/campaigns/${id}`);
      // Handle new API response format: { success: true, data: {...} }
      const data = response.data?.data || response.data;
      setCampaign(data);
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '캠페인 정보를 불러오는데 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  return {
    campaign,
    loading,
    error,
    fetchCampaign,
    refetch: () => campaignId && fetchCampaign(campaignId)
  };
};
