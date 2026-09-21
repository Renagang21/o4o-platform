/**
 * StoreAssetsPage — 매장 자산 운영 대시보드 (KPA adapter)
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1: thin wrapper over @o4o/store-asset-policy-core
 * WO-O4O-KPA-STORE-ASSETS-PAGE-DIRECT-SECTION-REMOVE-V1: direct 콘텐츠 섹션 제거
 *   → StoreLibraryContentsPage(/store/library/contents)가 canonical 편집 진입점
 * WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1: 게시 상태 변경 실패 안내
 *   → 공통 StoreAssetsView 의 기본 동작으로 이관(3서비스 동일).
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1:
 *   조회·상태전이 controller 를 공통 StoreAssetsView 로 이관. 이 파일은 API 주입만 담는다.
 */

import { StoreAssetsView } from '@o4o/store-asset-policy-core';
import { storeAssetControlApi } from '../../api/assetSnapshot';

export default function StoreAssetsPage() {
  return (
    <StoreAssetsView
      api={storeAssetControlApi}
      dashboardPath="/store"
      contentListPath="/store/content"
    />
  );
}
