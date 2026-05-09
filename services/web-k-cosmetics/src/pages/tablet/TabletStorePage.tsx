/**
 * TabletStorePage — K-Cosmetics wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-IDLE-LAYER-V1 — idle 모드 활성화 (60초 미조작 → 매장 대기 화면)
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1 — 매장 단위 idle playlist fetch 후 prop 전달
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. K-Cosmetics 전용 API client (axios 기반 `api` 인스턴스) 주입
 *   2. idle 모드 활성화 (idleTimeoutMs)
 *   3. idle playlist 매장 단위 fetch → idlePlaylist prop 전달
 *      (값이 없거나 fetch 실패 시 빈 배열 → kiosk 는 placeholder 표시)
 *
 * KPA 와 달리 QR 접속 배지는 사용하지 않는다.
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
} from '@/api/tablet';

const IDLE_TIMEOUT_MS = 60_000;

export default function TabletStorePage() {
  const { slug } = useParams<{ slug: string }>();
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
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      idlePlaylist={idlePlaylist}
    />
  );
}
