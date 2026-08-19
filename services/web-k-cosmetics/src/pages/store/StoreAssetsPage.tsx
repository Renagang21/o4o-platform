/**
 * StoreAssetsPage — K-Cosmetics 매장 자산 운영 대시보드 (adapter)
 *
 * WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1:
 *   KPA·GP 와 동일했던 조회·상태전이 controller 를 공통 StoreAssetsView 로 이관.
 *   상태 변경 실패가 조용히 삼켜지던 동작도 공통 View 의 안내 배너로 대체된다.
 */

import { StoreAssetsView } from '@o4o/store-asset-policy-core';
import { storeAssetControlApi } from '@/api/assetSnapshot';

export default function StoreAssetsPage() {
  return (
    <StoreAssetsView
      api={storeAssetControlApi}
      dashboardPath="/store"
      contentListPath="/store/content"
    />
  );
}
