/**
 * Store Analytics API Client
 *
 * WO-O4O-MARKETING-ANALYTICS-V1
 *
 * 매장 마케팅 성과 분석 데이터 조회.
 */

import { apiClient } from './client';

export interface MarketingAnalyticsData {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  activeQrCount: number;
  topQrCodes: Array<{
    id: string;
    title: string;
    slug: string;
    scanCount: number;
  }>;
  deviceStats: { mobile: number; tablet: number; desktop: number };
  dailyScans: Array<{ date: string; count: number }>;
}

export async function getMarketingAnalytics(): Promise<{
  success: boolean;
  data: MarketingAnalyticsData;
}> {
  return apiClient.get('/pharmacy/analytics/marketing');
}
