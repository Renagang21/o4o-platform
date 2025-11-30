import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

export interface GroupbuyParticipant {
  id: string;
  campaignId: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  orderId?: string;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const useParticipants = (campaignId?: string) => {
  const [participants, setParticipants] = useState<GroupbuyParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get(`/api/groupbuy/campaigns/${id}/participants`);
      setParticipants(response.data || []);
    } catch (err: any) {
      const message = err.response?.data?.message || '참여자 목록을 불러오는데 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelParticipant = async (campaignId: string, participantId: string) => {
    try {
      await authClient.api.post(`/api/groupbuy/campaigns/${campaignId}/participants/${participantId}/cancel`);
      toast.success('참여가 취소되었습니다.');
      await fetchParticipants(campaignId);
    } catch (err: any) {
      const message = err.response?.data?.message || '참여 취소에 실패했습니다.';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchParticipants(campaignId);
    }
  }, [campaignId]);

  return {
    participants,
    loading,
    error,
    fetchParticipants,
    cancelParticipant,
    refetch: () => campaignId && fetchParticipants(campaignId)
  };
};
