/**
 * TabletStorePage — KPA-Society wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-IDLE-LAYER-V1 — idle 모드 활성화 (60초 미조작 → 매장 대기 화면)
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1 — 매장 단위 idle playlist fetch 후 prop 전달
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. KPA 전용 API client (fetch 기반) 주입
 *   2. URL 진입 경로 감지 (?from=qr 배지 노출)
 *   3. idle 모드 활성화 (idleTimeoutMs)
 *   4. idle playlist 매장 단위 fetch → idlePlaylist prop 전달
 *      (값이 없거나 fetch 실패 시 빈 배열 → kiosk 는 placeholder 표시)
 *
 * UX/styling 변경은 공통 패키지에서 진행한다 — 이 wrapper 는 변경하지 않는다.
 *
 * 매장별 idle playlist 편집 UI 는 후속 WO 에서 도입.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TabletKioskPage, type IdlePlaylistItem } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
  fetchTabletIdle,
} from '../../api/tablet';

const IDLE_TIMEOUT_MS = 60_000;

export function TabletStorePage() {
  const { slug } = useParams<{ slug: string }>();
  // WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: QR 접속 경로 감지
  const fromQr = new URLSearchParams(window.location.search).get('from') === 'qr';

  const [idlePlaylist, setIdlePlaylist] = useState<IdlePlaylistItem[]>([]);

  useEffect(() => {
    if (!slug) return;
    fetchTabletIdle(slug)
      .then((items) => setIdlePlaylist(items))
      .catch(() => {
        // fetch 실패 시 placeholder 그대로. silent fail (kiosk 정상 동작 우선).
      });
  }, [slug]);

  return (
    <TabletKioskPage
      api={{
        fetchProducts: fetchTabletProducts,
        submitInterest: submitTabletInterest,
        checkStatus: checkTabletInterestStatus,
      }}
      showQrBadge={fromQr}
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      idlePlaylist={idlePlaylist}
    />
  );
}

export default TabletStorePage;
