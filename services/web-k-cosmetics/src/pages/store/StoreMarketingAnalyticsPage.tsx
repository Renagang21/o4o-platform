/**
 * StoreMarketingAnalyticsPage — 매장 마케팅 분석 (K-Cosmetics)
 *
 * WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreMarketingAnalyticsView 로 이관.
 *
 * Backend: /api/v1/cosmetics/pharmacy/analytics/marketing (변경 없음)
 */

import { StoreMarketingAnalyticsView } from '@o4o/store-ui-core';
import { getMarketingAnalytics } from '../../api/storeAnalytics';

export function StoreMarketingAnalyticsPage() {
  return (
    <StoreMarketingAnalyticsView
      fetchAnalytics={getMarketingAnalytics}
      primaryColor="#0ea5e9"
      breadcrumbRootLabel="매장 실행"
    />
  );
}
