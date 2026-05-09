/**
 * TabletStorePage — KPA-Society wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-IDLE-LAYER-V1 — idle 모드 활성화 (60초 미조작 → 매장 대기 화면)
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. KPA 전용 API client (fetch 기반) 주입
 *   2. URL 진입 경로 감지 (?from=qr 배지 노출)
 *   3. idle 모드 활성화 (idleTimeoutMs + idlePlaylist)
 *
 * UX/styling 변경은 공통 패키지에서 진행한다 — 이 wrapper 는 변경하지 않는다.
 *
 * idle playlist 는 현재 단계에서 빈 배열 → "화면을 터치해주세요" placeholder.
 * 매장별 playlist 선택 UI 는 후속 WO 에서 도입 (store_tablets.idle_playlist_id 등).
 */

import { TabletKioskPage } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
} from '../../api/tablet';

const IDLE_TIMEOUT_MS = 60_000;

export function TabletStorePage() {
  // WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: QR 접속 경로 감지
  const fromQr = new URLSearchParams(window.location.search).get('from') === 'qr';
  return (
    <TabletKioskPage
      api={{
        fetchProducts: fetchTabletProducts,
        submitInterest: submitTabletInterest,
        checkStatus: checkTabletInterestStatus,
      }}
      showQrBadge={fromQr}
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      idlePlaylist={[]}
    />
  );
}

export default TabletStorePage;
