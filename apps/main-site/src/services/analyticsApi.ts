/**
 * Analytics API Service
 * Phase 7: Partner Analytics API client
 */

import { authClient } from '@o4o/auth-client';

// Types for Analytics API responses

export interface AnalyticsSummaryResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
      days: number;
    };
    metrics: {
      clicks: {
        value: number;
        change: number;
        changeType: 'increase' | 'decrease' | 'neutral';
      };
      conversions: {
        value: number;
        change: number;
        changeType: 'increase' | 'decrease' | 'neutral';
      };
      cvr: {
        value: number;
        unit: 'percent';
        change: number;
        changeType: 'increase' | 'decrease' | 'neutral';
      };
      aov: {
        value: number;
        unit: 'KRW';
        change: number;
        changeType: 'increase' | 'decrease' | 'neutral';
      };
      epc: {
        value: number;
        unit: 'KRW';
        change: number;
        changeType: 'increase' | 'decrease' | 'neutral';
      };
      pendingExposure: {
        value: number;
        unit: 'KRW';
        breakdown: {
          scheduled: number;
          processing: number;
          pending: number;
        };
      };
      paidRate: {
        value: number;
        unit: 'percent';
        amounts: {
          confirmed: number;
          paid: number;
        };
      };
      returningRatio: {
        value: number;
        unit: 'percent';
        breakdown: {
          returning: number;
          total: number;
        };
      };
    };
    comparison: {
      previousPeriod: {
        start: string;
        end: string;
      };
    };
  };
  metadata: {
    timezone: string;
    cacheHit: boolean;
    computedAt: string;
  };
}

export interface TimeseriesDataPoint {
  timestamp: string;
  value: number;
  cumulative?: number;
  filled?: boolean;
}

export interface TimeseriesResponse {
  success: boolean;
  data: {
    metric: string;
    interval: string;
    unit: string;
    period: {
      start: string;
      end: string;
    };
    dataPoints: TimeseriesDataPoint[];
    summary: {
      total: number;
      average: number;
      min: number;
      max: number;
      dataPointsCount: number;
    };
  };
  metadata: {
    timezone: string;
    cacheHit: boolean;
    computedAt: string;
  };
}

export interface FunnelStage {
  name: string;
  label: string;
  value: number;
  rate: number;
  dropoff: number;
  dropoffRate?: number;
}

export interface FunnelResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
    };
    stages: FunnelStage[];
    totals: {
      clicks: number;
      conversions: number;
      confirmedCommission: {
        count: number;
        amount: number;
        currency: string;
      };
      paid: {
        count: number;
        amount: number;
        currency: string;
      };
    };
    uniqueCustomers: boolean;
    breakdown: null | any;
  };
  metadata: {
    timezone: string;
    cacheHit: boolean;
    computedAt: string;
  };
}

export interface SummaryParams {
  partnerId?: string;
  range?: 'last_7d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month';
  from?: string;
  to?: string;
}

export interface TimeseriesParams {
  metric: 'clicks' | 'conversions' | 'commission' | 'revenue' | 'cvr';
  interval?: 'hour' | 'day' | 'week' | 'month';
  from: string;
  to: string;
  partnerId?: string;
  cumulative?: boolean;
  fillMissing?: boolean;
}

export interface FunnelParams {
  from: string;
  to: string;
  partnerId?: string;
  uniqueCustomers?: boolean;
  breakdown?: 'source' | 'campaign' | 'product';
}

/**
 * Analytics API client
 */
export const analyticsAPI = {
  /**
   * Get analytics summary (KPI cards)
   */
  getSummary: async (params: SummaryParams = {}): Promise<AnalyticsSummaryResponse> => {
    const response = await authClient.api.get('/api/v1/analytics/partner/summary', {
      params: {
        partnerId: params.partnerId || 'me',
        range: params.range || 'last_30d',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to })
      }
    });
    return response.data;
  },

  /**
   * Get timeseries data for charts
   */
  getTimeseries: async (params: TimeseriesParams): Promise<TimeseriesResponse> => {
    const response = await authClient.api.get('/api/v1/analytics/partner/timeseries', {
      params: {
        metric: params.metric,
        interval: params.interval || 'day',
        from: params.from,
        to: params.to,
        partnerId: params.partnerId || 'me',
        cumulative: params.cumulative || false,
        fillMissing: params.fillMissing !== false
      }
    });
    return response.data;
  },

  /**
   * Get conversion funnel data
   */
  getFunnel: async (params: FunnelParams): Promise<FunnelResponse> => {
    const response = await authClient.api.get('/api/v1/analytics/partner/funnel', {
      params: {
        from: params.from,
        to: params.to,
        partnerId: params.partnerId || 'me',
        uniqueCustomers: params.uniqueCustomers || false,
        ...(params.breakdown && { breakdown: params.breakdown })
      }
    });
    return response.data;
  }
};
