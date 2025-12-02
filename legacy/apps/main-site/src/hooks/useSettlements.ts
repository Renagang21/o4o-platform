import { useQuery } from '@tanstack/react-query';
import { settlementAPI, SettlementListParams } from '../services/settlementApi';
import toast from 'react-hot-toast';

/**
 * React Query Hooks for Settlement API
 * Cache TTL: 30 seconds
 */

const SETTLEMENT_CACHE_TIME = 30 * 1000; // 30 seconds

/**
 * Hook: Settlement List
 * Usage: const { data, isLoading, error } = useSettlementList(params);
 */
export const useSettlementList = (params?: SettlementListParams) => {
  return useQuery({
    queryKey: ['settlements', 'list', params],
    queryFn: () => settlementAPI.list(params),
    staleTime: SETTLEMENT_CACHE_TIME,
    retry: 1,
    onError: (error: any) => {
      const message = error?.response?.data?.error || '정산 목록을 불러오는데 실패했습니다.';
      toast.error(message);
    },
  });
};

/**
 * Hook: Settlement Detail
 * Usage: const { data, isLoading } = useSettlementDetail(id);
 */
export const useSettlementDetail = (id: string | null) => {
  return useQuery({
    queryKey: ['settlements', 'detail', id],
    queryFn: () => settlementAPI.get(id!),
    enabled: !!id, // Only fetch when ID is provided
    staleTime: SETTLEMENT_CACHE_TIME,
    retry: 1,
    onError: (error: any) => {
      const message = error?.response?.data?.error || '정산 상세 정보를 불러오는데 실패했습니다.';
      toast.error(message);
    },
  });
};

/**
 * Hook: Settlement Summary
 * Usage: const { data, isLoading } = useSettlementSummary();
 */
export const useSettlementSummary = () => {
  return useQuery({
    queryKey: ['settlements', 'summary'],
    queryFn: () => settlementAPI.summary(),
    staleTime: SETTLEMENT_CACHE_TIME,
    retry: 1,
    onError: (error: any) => {
      const message = error?.response?.data?.error || '정산 요약 정보를 불러오는데 실패했습니다.';
      toast.error(message);
    },
  });
};
