/**
 * StoreAssetsPage — K-Cosmetics legacy compatibility route (은퇴)
 *
 * WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1
 *
 * 과거 동작(제거됨):
 *   `/store/content` 가 `StoreAssetsView`(@o4o/store-asset-policy-core) 를 `storeAssetControlApi`
 *   (`/cosmetics/store-assets`) 로 띄웠다. 그 route 는 KPA 전용 `createStoreAssetControlController`
 *   (`isStoreOwner(…,'kpa')` + `KpaMember` fallback · `kpa_store_asset_controls`) 를 그대로 마운트한 것이라
 *   K-Cosmetics 사용자에게 **KPA 약국 조직**의 스냅샷 게시 상태를 보여주고, 토글하면 KPA 조직 행을 썼다.
 *   K-Cosmetics 에는 이 축(본사 강제 배포·게시·채널 매핑)의 원장·데이터·업무가 없다
 *   (프로덕션: KCos 조직 스냅샷 0 · controls 0 · 60일 mutation 0).
 *
 * 현재 역할:
 *   메뉴 진입점이 없던 경로이므로 남은 딥링크만 K-Cosmetics canonical 자료함으로 보낸다.
 */

import { Navigate } from 'react-router-dom';

export default function StoreAssetsPage() {
  return <Navigate to="/store/library/contents" replace />;
}
