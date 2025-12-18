/**
 * Groupbuy Participants Hook
 * Phase 3: UI Integration
 *
 * Work Order 제약: 금액/수수료/정산 정보 UI 노출 절대 금지
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

/**
 * 참여자(약국) 수량 정보
 * 금액 필드 없음 (Work Order 제약)
 */
export interface GroupbuyParticipant {
  pharmacyId: string;
  pharmacyName?: string;
  totalQuantity: number;
  pendingQuantity: number;
  confirmedQuantity: number;
  orderCount: number;
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
      // Handle new API response format: { success: true, data: [...] }
      const data = response.data?.data || response.data || [];
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '참여자 목록을 불러오는데 실패했습니다.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await authClient.api.post(`/api/groupbuy/orders/${orderId}/cancel`);
      toast.success('주문이 취소되었습니다.');
      if (campaignId) {
        await fetchParticipants(campaignId);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || '주문 취소에 실패했습니다.';
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
    cancelOrder,
    refetch: () => campaignId && fetchParticipants(campaignId)
  };
};
