/**
 * Analytics React Query Hooks
 * Phase 7: Partner Analytics data fetching with 30s cache
 */

import { useQuery } from '@tanstack/react-query';
import {
  analyticsAPI,
  SummaryParams,
  TimeseriesParams,
  FunnelParams,
  AnalyticsSummaryResponse,
  TimeseriesResponse,
  FunnelResponse
} from '../services/analyticsApi';

/**
 * Hook for analytics summary (KPI cards)
 */
export const useAnalyticsSummary = (params: SummaryParams = {}) => {
  return useQuery<AnalyticsSummaryResponse>({
    queryKey: ['analytics', 'summary', params],
    queryFn: () => analyticsAPI.getSummary(params),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });
};

/**
 * Hook for timeseries data (charts)
 */
export const useAnalyticsTimeseries = (params: TimeseriesParams) => {
  return useQuery<TimeseriesResponse>({
    queryKey: ['analytics', 'timeseries', params],
    queryFn: () => analyticsAPI.getTimeseries(params),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    enabled: !!params.from && !!params.to // Only fetch if date range is provided
  });
};

/**
 * Hook for conversion funnel
 */
export const useAnalyticsFunnel = (params: FunnelParams) => {
  return useQuery<FunnelResponse>({
    queryKey: ['analytics', 'funnel', params],
    queryFn: () => analyticsAPI.getFunnel(params),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    enabled: !!params.from && !!params.to // Only fetch if date range is provided
  });
};
