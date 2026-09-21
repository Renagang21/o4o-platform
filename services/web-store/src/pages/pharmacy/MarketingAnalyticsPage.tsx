/**
 * MarketingAnalyticsPage — 매장 마케팅 분석 (KPA)
 *
 * WO-O4O-MARKETING-ANALYTICS-V1
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreMarketingAnalyticsView 로 이관.
 *   이 파일은 API adapter + 팔레트/breadcrumb config 만 담는 thin adapter 다.
 *
 * breadcrumb 상위 '분석' 은 KPA 사이드바 그룹명과 일치시킨 값이다
 * (WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1).
 */

import { StoreMarketingAnalyticsView } from '@o4o/store-ui-core';
import { colors } from '../../styles/theme';
import { getMarketingAnalytics } from '../../api/storeAnalytics';

export function MarketingAnalyticsPage() {
  return (
    <StoreMarketingAnalyticsView
      fetchAnalytics={getMarketingAnalytics}
      primaryColor={colors.primary}
      breadcrumbRootLabel="분석"
    />
  );
}
