/**
 * TabletStorePage — K-Cosmetics wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. K-Cosmetics 전용 API client (axios 기반 `api` 인스턴스) 주입
 *
 * KPA 와 달리 QR 접속 배지는 사용하지 않는다.
 * UX/styling 변경은 공통 패키지에서 진행한다 — 이 wrapper 는 변경하지 않는다.
 */

import { TabletKioskPage } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
} from '@/api/tablet';

export default function TabletStorePage() {
  return (
    <TabletKioskPage
      api={{
        fetchProducts: fetchTabletProducts,
        submitInterest: submitTabletInterest,
        checkStatus: checkTabletInterestStatus,
      }}
    />
  );
}
