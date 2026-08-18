/**
 * AccountPage — 매장 셸(설정 › 내 계정) 진입점
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1  (범위 B)
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   개인 계정 화면 본체를 `pages/account/MyProfilePage` 로 승격(모든 로그인 사용자용
 *   canonical route `/account`). 이 파일은 매장 셸 URL(`/store-owner/account`)을
 *   유지하기 위한 thin wrapper 다 — 같은 화면을 두 벌 구현하지 않는다.
 *   공통 store-ui-core 사이드바(설정 › 내 계정)가 이 URL 을 가리키므로 route 는 유지한다.
 */

import MyProfilePage from '../account/MyProfilePage';

export default function AccountPage() {
  // 매장 셸 상단바에는 알림 벨이 없으므로 화면이 직접 렌더한다(기존 동작 보존).
  return <MyProfilePage showNotifications />;
}
