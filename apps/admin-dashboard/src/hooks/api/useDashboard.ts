/**
 * React Query hooks for Admin Dashboard API
 *
 * WO-ADMIN-API-IMPLEMENT-P0: Real database queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

// ===== P0 Types (WO-ADMIN-API-IMPLEMENT-P0) =====

interface SalesSummary {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  breakdown: {
    neture: { revenue: number; orders: number };
    glycopharm: { revenue: number; orders: number };
  };
}

interface OrderStatusItem {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface UserGrowthData {
  period: string;
  totalUsers: number;
  activeUsers: number;
  growth: Array<{ date: string; newUsers: number }>;
}

interface SystemHealthData {
  api: {
    status: 'healthy' | 'warning' | 'critical' | 'error';
    uptime: string;
    lastCheck: string;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical' | 'error';
    type: string;
    connectionCount: number;
    maxConnections: number;
    lastCheck: string;
  };
  memory: {
    status: 'healthy' | 'warning' | 'critical';
    usedMB: number;
    totalMB: number;
    percent: number;
  };
}

interface PartnerListData {
  data: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    userId: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CosmeticsMetricsData {
  catalog: {
    totalProducts: number;
    activeProducts: number;
    totalBrands: number;
  };
  performance: {
    clicks: number;
    conversions: number;
    revenue: number;
    message: string;
  };
}

// ===== Legacy Types (Phase 2.4) =====

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

// ===== P0 Hooks (WO-ADMIN-API-IMPLEMENT-P0) =====

/**
 * GET /api/v1/admin/dashboard/sales-summary
 * Fetch aggregated sales data from real orders
 */
export function useSalesSummary(period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'sales-summary', period] as const,
    queryFn: async () => {
      const response = await authClient.api.get(`/admin/dashboard/sales-summary?period=${period}`);
      return response.data.data as SalesSummary;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * GET /api/v1/admin/dashboard/order-status
 * Fetch order status distribution (real counts)
 */
export function useOrderStatus() {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'order-status'] as const,
    queryFn: async () => {
      const response = await authClient.api.get('/admin/dashboard/order-status');
      return response.data.data as OrderStatusItem[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * GET /api/v1/admin/dashboard/user-growth
 * Fetch user registration counts by day/week
 */
export function useUserGrowth(period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'user-growth', period] as const,
    queryFn: async () => {
      const response = await authClient.api.get(`/admin/dashboard/user-growth?period=${period}`);
      return response.data.data as UserGrowthData;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * GET /api/v1/admin/system/health
 * Fetch system health status (real checks)
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'system-health'] as const,
    queryFn: async () => {
      const response = await authClient.api.get('/admin/system/health');
      return response.data.data as SystemHealthData;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

/**
 * GET /api/v1/admin/partners
 * Fetch partner list from real database
 */
export function usePartnerList(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'partners', page, limit] as const,
    queryFn: async () => {
      const response = await authClient.api.get(`/admin/partners?page=${page}&limit=${limit}`);
      return response.data as PartnerListData;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * GET /api/v1/admin/cosmetics/partner-metrics
 * Fetch cosmetics partner metrics
 */
export function useCosmeticsPartnerMetrics() {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'cosmetics-metrics'] as const,
    queryFn: async () => {
      const response = await authClient.api.get('/admin/cosmetics/partner-metrics');
      return response.data.data as CosmeticsMetricsData;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
