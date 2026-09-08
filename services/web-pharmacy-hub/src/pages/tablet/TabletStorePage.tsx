/**
 * TabletStorePage — PharmacyHub 공개 태블릿 runtime (kiosk)
 *
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §6·§7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 화면이 없어서 PH 는 **화면 세트를 만들고 적용해도 재생할 URL 이 없었다**
 * (`IR-O4O-TABLET-CANONICAL-COMMON-CORE-BOUNDARY-AND-PH-ADOPTION-GAP-V1` §0 최대 갭).
 *
 * 신규 renderer 를 만들지 않는다 — 화면 본체는 공통 `@o4o/tablet-kiosk-core`,
 * 데이터는 공통 공개 endpoint(`/api/v1/stores/:slug/tablet/*`), 상품은 canonical product_list resolver.
 * 이 wrapper 가 담당하는 것은 **PH adapter + 서비스 격리 게이트**뿐이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canonical URL 계약 (KPA 와 같은 의미)
 *
 *   /tablet/:slug              → 그 매장의 태블릿 (tabletId 없음 = first_active compatibility)
 *   /tablet/:slug?tabletId=…   → 그 코너 태블릿
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * §7 서비스 격리
 *
 *   공개 endpoint 는 service-neutral 이라 slug 만 맞으면 타 서비스 매장도 해석된다.
 *   PH 오리진에서 타 서비스 매장이 렌더되지 않도록 **셸에서 좁힌다**
 *   (공통 resolver 의 격리를 완화하지 않는다 — 서버 응답의 serviceKey 로 확인만 한다).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TabletKioskPage, type IdlePlaylistItem, type TabletKioskDisplaySettings } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  fetchTabletScreen,
  fetchTabletIdle,
  fetchTabletSettings,
  submitInterestUnsupported,
} from '../../lib/api/publicTablet';

const IDLE_TIMEOUT_MS = 60_000;
const PH_SERVICE_KEY = 'pharmacy-hub';

type ScopeState = 'checking' | 'allowed' | 'foreign' | 'unavailable';

export function TabletStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const tabletId = new URLSearchParams(window.location.search).get('tabletId') || undefined;

  const [scope, setScope] = useState<ScopeState>('checking');
  const [idlePlaylist, setIdlePlaylist] = useState<IdlePlaylistItem[]>([]);
  const [displaySettings, setDisplaySettings] = useState<TabletKioskDisplaySettings | undefined>(undefined);

  // §7: 렌더 전에 이 매장이 PH 매장인지 먼저 확정한다.
  useEffect(() => {
    if (!slug) { setScope('unavailable'); return; }
    let cancelled = false;
    fetchTabletScreen(slug, tabletId)
      .then((screen) => {
        if (cancelled) return;
        const key = (screen as unknown as { serviceKey?: string } | null)?.serviceKey;
        if (!screen) { setScope('unavailable'); return; }
        setScope(key === PH_SERVICE_KEY ? 'allowed' : 'foreign');
      })
      .catch(() => { if (!cancelled) setScope('unavailable'); });
    return () => { cancelled = true; };
  }, [slug, tabletId]);

  useEffect(() => {
    if (!slug || scope !== 'allowed') return;
    fetchTabletIdle(slug, tabletId)
      .then(setIdlePlaylist)
      .catch(() => { /* placeholder 유지 — kiosk 정상 동작 우선 */ });
    fetchTabletSettings(slug)
      .then((s) => setDisplaySettings(s as TabletKioskDisplaySettings | undefined))
      .catch(() => { /* 기본값(전부 표시) */ });
  }, [slug, tabletId, scope]);

  if (scope === 'checking') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">불러오는 중…</div>;
  }
  if (scope !== 'allowed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-base font-semibold text-gray-800">태블릿 화면을 열 수 없습니다.</p>
        <p className="text-sm text-gray-500">
          {scope === 'foreign'
            ? '이 주소는 PharmacyHub 매장이 아닙니다.'
            : '매장 주소를 확인해 주세요. 화면이 아직 준비되지 않았을 수 있습니다.'}
        </p>
      </div>
    );
  }

  return (
    <TabletKioskPage
      api={{
        fetchProducts: (s, params) => fetchTabletProducts(s, { ...params, tabletId }) as never,
        // PH kiosk V1 은 상담 요청을 받지 않는다(매장 설정 기본값도 OFF).
        submitInterest: submitInterestUnsupported as never,
        checkStatus: submitInterestUnsupported as never,
        fetchScreen: (s, params) => fetchTabletScreen(s, tabletId, params?.language),
      }}
      showQrBadge={false}
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      idlePlaylist={idlePlaylist}
      displaySettings={displaySettings}
    />
  );
}

export default TabletStorePage;
