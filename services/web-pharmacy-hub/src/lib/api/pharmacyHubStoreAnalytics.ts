/**
 * Pharmacy-Hub 매장 마케팅 분석 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *
 * 계약은 KPA / GlycoPharm / K-Cosmetics 와 **동일한 공통 controller**
 * (routes/o4o-store/controllers/store-analytics.controller.ts) 다:
 *   GET /pharmacy-hub/pharmacy/analytics/marketing
 *   GET /pharmacy-hub/pharmacy/analytics/recent-scans
 * 집계 원장 = 공통 store_qr_scan_events / store_qr_codes (organization_id 축).
 */
import { api } from '../apiClient';
import type { StoreMarketingAnalyticsData } from '@o4o/store-ui-core';

const BASE = '/pharmacy-hub/pharmacy/analytics';

export async function getMarketingAnalytics(): Promise<{
  success: boolean;
  data: StoreMarketingAnalyticsData;
}> {
  const res = await api.get(`${BASE}/marketing`);
  return res.data;
}
