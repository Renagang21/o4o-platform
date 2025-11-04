/**
 * React Query hooks for Phase 2.4 Dashboard API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

// ===== Types =====

interface SystemMetrics {
  cache: {
    hitRate: number;
    l1HitRate: number;
    l2HitRate: number;
    errors: number;
    memorySize: number;
    circuitBreakerState: string;
  };
  api: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
}

interface PartnerStats {
  partner: {
    id: string;
    userId: string;
    status: string;
    tier: string;
  };
  commissions: {
    total: number;
    confirmed: number;
    pending: number;
    confirmationRate: string;
  };
  revenue: {
    total: string;
    last7Days: string;
    currency: string;
  };
  trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

interface OperationsStats {
  webhooks: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    avgResponseTime: number;
  };
  batchJobs: {
    totalRuns: number;
    itemsProcessed: number;
    lastRunAt: string | null;
    nextScheduledAt: string | null;
  };
  cache: {
    hitRate: number;
    errors: number;
    memorySize: number;
  };
}

// ===== Query Keys =====

export const dashboardKeys = {
  all: ['dashboard'] as const,
  system: () => [...dashboardKeys.all, 'system'] as const,
  partner: (id: string) => [...dashboardKeys.all, 'partner', id] as const,
  operations: () => [...dashboardKeys.all, 'operations'] as const,
};

// ===== Hooks =====

/**
 * GET /api/v1/admin/dashboard/system
 * Fetch system metrics (Prometheus + Cache stats)
 */
export function useSystemMetrics() {
  return useQuery({
    queryKey: dashboardKeys.system(),
    queryFn: async () => {
      const response = await authClient.api.get('/admin/dashboard/system');
      return response.data.data as SystemMetrics;
    },
    refetchInterval: 60000, // Refetch every 60s (matches cache TTL)
    staleTime: 30000, // Consider stale after 30s
  });
}

/**
 * GET /api/v1/admin/dashboard/partners/:id
 * Fetch partner statistics
 */
export function usePartnerStats(partnerId: string) {
  return useQuery({
    queryKey: dashboardKeys.partner(partnerId),
    queryFn: async () => {
      const response = await authClient.api.get(`/admin/dashboard/partners/${partnerId}`);
      return response.data.data as PartnerStats;
    },
    enabled: !!partnerId,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * GET /api/v1/admin/dashboard/operations
 * Fetch operations statistics (webhooks, batch jobs)
 */
export function useOperationsStats() {
  return useQuery({
    queryKey: dashboardKeys.operations(),
    queryFn: async () => {
      const response = await authClient.api.get('/admin/dashboard/operations');
      return response.data.data as OperationsStats;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * POST /api/v1/admin/dashboard/operations/webhook/retry
 * Manually retry a failed webhook delivery
 */
export function useWebhookRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await authClient.api.post('/admin/dashboard/operations/webhook/retry', {
        webhookId,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate operations stats to reflect the retry
      queryClient.invalidateQueries({ queryKey: dashboardKeys.operations() });
    },
  });
}

/**
 * POST /api/v1/admin/dashboard/operations/batch/trigger
 * Manually trigger a batch job
 */
export function useBatchJobTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobType: string) => {
      const response = await authClient.api.post('/admin/dashboard/operations/batch/trigger', {
        jobType,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate operations stats to show the triggered job
      queryClient.invalidateQueries({ queryKey: dashboardKeys.operations() });
    },
  });
}
