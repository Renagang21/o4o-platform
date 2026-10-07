/**
 * Store Analytics API Client — K-Cosmetics
 *
 * WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1
 *
 * 매장 마케팅 성과 분석 데이터 조회.
 * Backend: /api/v1/cosmetics/pharmacy/analytics/marketing
 *   (createStoreAnalyticsController with serviceKey='cosmetics')
 */

import { api } from '../lib/apiClient';

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
  const res = await api.get<{ success: boolean; data: MarketingAnalyticsData }>(
    '/cosmetics/pharmacy/analytics/marketing',
  );
  return res.data;
}
