/**
 * TabletStorePage — KPA-Society wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. KPA 전용 API client (fetch 기반) 주입
 *   2. URL 진입 경로 감지 (?from=qr 배지 노출)
 *
 * UX/styling 변경은 공통 패키지에서 진행한다 — 이 wrapper 는 변경하지 않는다.
 */

import { TabletKioskPage } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
} from '../../api/tablet';

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
    />
  );
}

export default TabletStorePage;
