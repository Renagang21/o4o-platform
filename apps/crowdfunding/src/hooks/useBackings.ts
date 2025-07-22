import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  Backing, 
  BackingStatus,
  PaymentMethod 
} from '@o4o/crowdfunding-types';

interface CreateBackingData {
  projectId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  rewards?: Array<{
    rewardId: string;
    quantity: number;
    selectedOptions?: any;
  }>;
  isAnonymous?: boolean;
  displayName?: string;
  backerMessage?: string;
  isMessagePublic?: boolean;
}

// 프로젝트 후원하기
export function useCreateBacking() {
  const queryClient = useQueryClient();

  return useMutation<Backing, Error, CreateBackingData>({
    mutationFn: async (data) => {
      const response = await authClient.api.post('/api/crowdfunding/backings', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['my-backings'] });
    },
  });
}

// 후원 취소
export function useCancelBacking() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { backingId: string; reason?: string }>({
    mutationFn: async ({ backingId, reason }) => {
      await authClient.api.post(`/api/crowdfunding/backings/${backingId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-backings'] });
    },
  });
}

// 내 후원 목록 조회
export function useMyBackings(status?: BackingStatus) {
  return useQuery<Backing[]>({
    queryKey: ['my-backings', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }
      
      const response = await authClient.api.get(`/api/crowdfunding/my-backings?${params}`);
      return response.data;
    },
  });
}

// 프로젝트 후원자 목록 조회
export function useProjectBackers(projectId: string, options?: {
  showAnonymous?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['project-backers', projectId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options) {
        if (options.showAnonymous !== undefined) {
          params.append('showAnonymous', String(options.showAnonymous));
        }
        if (options.page) {
          params.append('page', String(options.page));
        }
        if (options.limit) {
          params.append('limit', String(options.limit));
        }
      }

      const response = await authClient.api.get(
        `/api/crowdfunding/projects/${projectId}/backers?${params}`
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}