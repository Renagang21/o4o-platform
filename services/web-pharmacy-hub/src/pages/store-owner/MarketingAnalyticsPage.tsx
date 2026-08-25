/**
 * MarketingAnalyticsPage — 매장 마케팅 분석 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *   KPA / GlycoPharm / K-Cosmetics 와 **같은 공통 View** 를 소비하는 thin adapter.
 *   차이는 API adapter · accent · breadcrumb 뿐이다 (화면 본체 복제 0).
 */
import { StoreMarketingAnalyticsView } from '@o4o/store-ui-core';
import { getMarketingAnalytics } from '../../lib/api/pharmacyHubStoreAnalytics';

export default function MarketingAnalyticsPage() {
  return (
    <StoreMarketingAnalyticsView
      fetchAnalytics={getMarketingAnalytics}
      breadcrumbRootLabel="매장 실행"
      backTo="/store-owner"
    />
  );
}
