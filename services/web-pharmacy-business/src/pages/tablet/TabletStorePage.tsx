/**
 * TabletStorePage — KPA-Society wrapper for canonical Tablet kiosk
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-IDLE-LAYER-V1 — idle 모드 활성화 (60초 미조작 → 매장 대기 화면)
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1 — 매장 단위 idle playlist fetch 후 prop 전달
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1 — 실제 태블릿(기기) runtime
 *
 * 본체 컴포넌트는 `@o4o/tablet-kiosk-core` 로 추출됨.
 * 이 파일은 다음만 담당한다:
 *   1. KPA 전용 API client (fetch 기반) 주입
 *   2. URL 진입 경로 감지 (?from=qr 배지 노출)
 *   3. idle 모드 활성화 (idleTimeoutMs)
 *   4. idle playlist 매장 단위 fetch → idlePlaylist prop 전달
 *   5. (연결된 기기) heartbeat 폴링 → 현재 위치(tabletId) · version(screenRefreshKey) 반영
 *      — 직원이 현장에서 위치/콘텐츠를 바꾸거나 PC 에서 적용을 바꾸면 새로고침 없이 반영
 *   6. [직원 메뉴] → 기존 O4O 로그인 → 매장 권한자면 직원 화면(위치 변경 · 콘텐츠 변경 · 상품 수정)
 *      별도 PIN / 직원 계정 / 태블릿 전용 identity 없음. 소비자 화면 기본, 직원 화면은 명시 진입만.
 *
 * 연결되지 않은 브라우저(?tabletId= 북마크 방식)는 기존 동작 그대로.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TabletKioskPage, type IdlePlaylistItem, type TabletKioskDisplaySettings } from '@o4o/tablet-kiosk-core';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
  fetchTabletIdle,
  fetchTabletSettings,
  fetchTabletScreen,
  loadStoredTabletDevice,
  clearStoredTabletDevice,
  deviceHeartbeat,
  type StoredTabletDevice,
} from '../../api/tablet';
import {
  fetchRuntimeDevice,
  moveRuntimeDevice,
  switchRuntimeContent,
  fetchRuntimeProductListEditor,
  saveRuntimeProductList,
  type RuntimeSnapshot,
  type RuntimeContent,
} from '../../api/tabletDisplays';
import { useAuth } from '../../contexts/AuthContext';
import { TabletProductListQuickEditor } from './TabletProductListQuickEditor';

const IDLE_TIMEOUT_MS = 60_000;
/** heartbeat 주기 — WO §: 10~30초 가벼운 폴링(WebSocket/SSE 없음) */
const HEARTBEAT_MS = 15_000;

export function TabletStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const search = new URLSearchParams(window.location.search);
  // WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: QR 접속 경로 감지
  const fromQr = search.get('from') === 'qr';
  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: 코너별 태블릿(크롬 북마크용 ?tabletId=).
  //   유효하지 않으면 백엔드가 first active 로 fallback. 없으면 기존 동작.
  const queryTabletId = search.get('tabletId') || undefined;
  const staffRequested = search.get('staff') === '1';

  // ── 연결된 기기(실제 태블릿) ──
  const [device, setDevice] = useState<StoredTabletDevice | null>(() => {
    const d = loadStoredTabletDevice();
    return d && slug && d.storeSlug === slug ? d : null;
  });
  const [deviceLocationId, setDeviceLocationId] = useState<string | null>(device?.locationId ?? null);
  const [runtimeVersion, setRuntimeVersion] = useState<string | null>(null);
  const [heartbeatInfo, setHeartbeatInfo] = useState<{ locationName: string | null; currentScreenSetId: string | null } | null>(null);

  // 위치 = 기기의 현재 위치(연결된 경우) > ?tabletId(북마크) > 없음(first active)
  const tabletId = device ? (deviceLocationId ?? undefined) : queryTabletId;

  const runHeartbeat = useCallback(async () => {
    if (!slug || !device) return;
    try {
      const hb = await deviceHeartbeat(slug, device.deviceToken);
      setDeviceLocationId(hb.locationId);
      setRuntimeVersion(hb.version);
      setHeartbeatInfo({ locationName: hb.location ? (hb.location.location || hb.location.name) : null, currentScreenSetId: hb.currentScreenSetId });
    } catch (e: any) {
      // 토큰 폐기/연결 해제(401) → 저장 정보 제거, 이후 일반(미연결) 동작. 네트워크 오류는 다음 주기에 재시도.
      if (e?.status === 401) {
        clearStoredTabletDevice();
        setDevice(null);
      }
    }
  }, [slug, device]);

  useEffect(() => {
    if (!device) return;
    void runHeartbeat();
    const t = window.setInterval(() => { void runHeartbeat(); }, HEARTBEAT_MS);
    return () => window.clearInterval(t);
  }, [device, runHeartbeat]);

  const [idlePlaylist, setIdlePlaylist] = useState<IdlePlaylistItem[]>([]);
  // WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1: 매장 전시 설정 (가격/QR/상담/전환시간)
  const [displaySettings, setDisplaySettings] = useState<TabletKioskDisplaySettings | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    fetchTabletIdle(slug, tabletId)
      .then((items) => setIdlePlaylist(items))
      .catch(() => {
        // fetch 실패 시 placeholder 그대로. silent fail (kiosk 정상 동작 우선).
      });
    fetchTabletSettings(slug)
      .then((s) => setDisplaySettings(s))
      .catch(() => {
        // fetch 실패 시 undefined → kiosk 기본 동작(전부 표시). silent fail.
      });
  }, [slug, tabletId]);

  // kiosk-core 의 fetchScreen effect 가 api 객체 identity 를 deps 로 쓰므로 tabletId 가 바뀔 때만 새 객체.
  const api = useMemo(() => ({
    // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: 코너별 태블릿 tabletId 주입
    fetchProducts: (s: string, params?: any) => fetchTabletProducts(s, { ...params, tabletId }),
    submitInterest: submitTabletInterest,
    checkStatus: checkTabletInterestStatus,
    // WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1: 적용 screen set 소비(코너별 tabletId 주입)
    // WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1: 이용자 선택 언어 전달(params.language).
    fetchScreen: (s: string, params?: { language?: string }) => fetchTabletScreen(s, tabletId, params?.language),
  }), [tabletId]);

  // ── 직원 화면 ──
  const [staffOpen, setStaffOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 로그인 후 returnTo=/tablet/:slug?staff=1 로 돌아오면 직원 화면 자동 열기(1회) + URL 정리
  useEffect(() => {
    if (!staffRequested || !device) return;
    if (authLoading) return;
    if (isAuthenticated) setStaffOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('staff');
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffRequested, device, authLoading, isAuthenticated]);

  const openStaff = () => {
    if (!slug || !device) return;
    if (!isAuthenticated) {
      const returnTo = `/tablet/${encodeURIComponent(slug)}?staff=1`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    setStaffOpen(true);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <TabletKioskPage
        api={api}
        showQrBadge={fromQr}
        idleTimeoutMs={IDLE_TIMEOUT_MS}
        idlePlaylist={idlePlaylist}
        displaySettings={displaySettings}
        screenRefreshKey={runtimeVersion ?? undefined}
      />
      {device && !staffOpen && (
        <button
          type="button"
          onClick={openStaff}
          data-testid="staff-menu-button"
          aria-label="직원 메뉴"
          style={{
            position: 'fixed', right: 12, bottom: 12, zIndex: 2000, opacity: 0.55,
            fontSize: 13, padding: '6px 10px', borderRadius: 999, border: '1px solid #9ca3af', background: '#fff', color: '#374151', cursor: 'pointer',
          }}
        >
          직원 메뉴
        </button>
      )}
      {device && staffOpen && (
        <TabletStaffPanel
          device={device}
          heartbeatInfo={heartbeatInfo}
          onClose={() => { setStaffOpen(false); void runHeartbeat(); }}
          onChanged={() => { void runHeartbeat(); }}
          onDisconnected={() => { clearStoredTabletDevice(); setDevice(null); setStaffOpen(false); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 직원 화면 — 기기 이름 · 현재 위치 [위치 변경] · 현재 콘텐츠 [콘텐츠 변경] · 빠른 작업 [상품 수정] [소비자 화면으로]
// ────────────────────────────────────────────────────────────────────────────

const panelBtn: React.CSSProperties = { fontSize: 18, padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#111827' };
const panelPrimary: React.CSSProperties = { ...panelBtn, background: '#2563eb', color: '#fff', border: '1px solid #2563eb' };

function TabletStaffPanel({ device, heartbeatInfo, onClose, onChanged, onDisconnected }: {
  device: StoredTabletDevice;
  heartbeatInfo: { locationName: string | null; currentScreenSetId: string | null } | null;
  onClose: () => void;
  onChanged: () => void;
  onDisconnected: () => void;
}) {
  const [snap, setSnap] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [mode, setMode] = useState<'home' | 'location' | 'content' | 'products'>('home');
  const [contents, setContents] = useState<RuntimeContent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const reload = useCallback(async () => {
    try {
      const s = await fetchRuntimeDevice(device.deviceToken);
      if (!mounted.current) return;
      setSnap(s);
      setContents(s.contents);
      setError(null);
      setForbidden(false);
    } catch (e: any) {
      if (!mounted.current) return;
      if (e?.status === 403) { setForbidden(true); return; }
      if (e?.status === 401 && e?.code === 'DEVICE_NOT_CONNECTED') { onDisconnected(); return; }
      setError(e?.message || '직원 화면을 불러오지 못했습니다.');
    }
  }, [device.deviceToken, onDisconnected]);

  useEffect(() => { void reload(); }, [reload]);

  const handleMove = async (locationId: string) => {
    setBusy(true);
    setError(null);
    try {
      const s = await moveRuntimeDevice(device.deviceToken, device.deviceId, locationId);
      setSnap(s);
      setContents(s.contents);
      setMode('home');
      onChanged();
    } catch (e: any) {
      setError(e?.message || '위치를 변경하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitch = async (screenSetId: string) => {
    setBusy(true);
    setError(null);
    try {
      const s = await switchRuntimeContent(device.deviceToken, device.deviceId, screenSetId);
      setSnap(s);
      setContents(s.contents);
      setMode('home');
      onChanged();
    } catch (e: any) {
      setError(e?.code === 'SCREEN_SET_NOT_ACTIVE' ? '활성(active) 콘텐츠만 표시할 수 있습니다. PC 에서 콘텐츠를 활성화하세요.' : (e?.message || '콘텐츠를 변경하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const currentSetId = snap?.currentScreenSet?.id ?? null;
  const loadEditor = useCallback(() => fetchRuntimeProductListEditor(device.deviceToken, currentSetId as string), [device.deviceToken, currentSetId]);
  const saveEditor = useCallback(
    (products: Array<{ productType: 'supplier' | 'local'; productId: string; qrCodeId?: string | null }>) => saveRuntimeProductList(device.deviceToken, currentSetId as string, products),
    [device.deviceToken, currentSetId],
  );

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(17,24,39,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const card: React.CSSProperties = { width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 18, color: '#111827', boxSizing: 'border-box' };
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #e5e7eb' };

  return (
    <div style={overlay} role="dialog" aria-label="직원 화면" data-testid="staff-panel">
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 22 }}>직원 화면</strong>
          <button type="button" style={panelBtn} onClick={onClose} data-testid="staff-back-to-consumer">소비자 화면으로 돌아가기</button>
        </div>
        {forbidden && (
          <div role="alert" style={{ color: '#b91c1c' }} data-testid="staff-forbidden">
            이 매장의 직원 권한이 없는 계정입니다. 매장 구성원(owner/manager) 계정으로 로그인하세요.
          </div>
        )}
        {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
        {!forbidden && !snap && !error && <div>불러오는 중…</div>}
        {snap && mode === 'home' && (
          <>
            <div style={row}>
              <span style={{ color: '#6b7280' }}>기기</span>
              <span data-testid="staff-device-name">{snap.device.name}</span>
            </div>
            <div style={row}>
              <span style={{ color: '#6b7280' }}>현재 위치</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span data-testid="staff-current-location">{snap.location ? (snap.location.location ? `${snap.location.location} · ${snap.location.name}` : snap.location.name) : (heartbeatInfo?.locationName || '(미지정)')}</span>
                <button type="button" style={panelBtn} onClick={() => setMode('location')} data-testid="staff-change-location">위치 변경</button>
              </span>
            </div>
            <div style={row}>
              <span style={{ color: '#6b7280' }}>현재 콘텐츠</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span data-testid="staff-current-content">{snap.currentScreenSet?.name || '(기본 화면)'}</span>
                <button type="button" style={panelBtn} onClick={() => setMode('content')} disabled={!snap.location} data-testid="staff-change-content">콘텐츠 변경</button>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: '#6b7280' }}>빠른 작업</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={panelPrimary} onClick={() => setMode('products')} disabled={!currentSetId} data-testid="staff-edit-products">상품 수정</button>
                <button type="button" style={panelBtn} onClick={onClose}>소비자 화면으로 돌아가기</button>
              </div>
              {!currentSetId && <span style={{ color: '#6b7280', fontSize: 14 }}>표시 중인 콘텐츠가 없어 상품 수정을 할 수 없습니다. 먼저 콘텐츠를 선택하세요.</span>}
            </div>
          </>
        )}
        {snap && mode === 'location' && (
          <>
            <strong>위치 변경 — 이 태블릿을 어느 위치로 옮기나요?</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="staff-location-list">
              {snap.locations.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    style={{ ...panelBtn, width: '100%', textAlign: 'left', background: l.id === snap.location?.id ? '#eff6ff' : '#fff' }}
                    disabled={busy}
                    onClick={() => handleMove(l.id)}
                    data-testid={`staff-location-${l.id}`}
                  >
                    <div style={{ fontWeight: 600 }}>{l.location ? `${l.location} · ${l.name}` : l.name}{l.id === snap.location?.id ? ' (현재)' : ''}</div>
                    <div style={{ color: '#6b7280', fontSize: 14 }}>표시 콘텐츠: {l.currentScreenSetName || '(기본 화면)'} · 연결 태블릿 {l.deviceCount}대</div>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" style={panelBtn} onClick={() => setMode('home')}>뒤로</button>
          </>
        )}
        {snap && mode === 'content' && (
          <>
            <strong>콘텐츠 변경 — 이 위치({snap.location?.location || snap.location?.name})에서 보여줄 콘텐츠</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="staff-content-list">
              {(contents ?? []).length === 0 && <li style={{ color: '#6b7280' }}>이 위치에 연결된 콘텐츠가 없습니다. PC 「내 매장 › 태블릿」에서 콘텐츠를 연결하세요.</li>}
              {(contents ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    style={{ ...panelBtn, width: '100%', textAlign: 'left', background: c.isCurrent ? '#eff6ff' : '#fff', opacity: c.status === 'active' ? 1 : 0.6 }}
                    disabled={busy || c.status !== 'active'}
                    onClick={() => handleSwitch(c.id)}
                    data-testid={`staff-content-${c.id}`}
                  >
                    <div style={{ fontWeight: 600 }}>{c.name}{c.isCurrent ? ' (현재)' : ''}{c.status !== 'active' ? ` · ${c.status}` : ''}</div>
                    {c.description && <div style={{ color: '#6b7280', fontSize: 14 }}>{c.description}</div>}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" style={panelBtn} onClick={() => setMode('home')}>뒤로</button>
          </>
        )}
        {snap && mode === 'products' && currentSetId && (
          <TabletProductListQuickEditor
            large
            load={loadEditor}
            save={saveEditor}
            onSaved={() => { onChanged(); void reload(); }}
            onClose={() => setMode('home')}
          />
        )}
        {snap && (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>
            {snap.store.name} · 직원 기능은 이 태블릿의 위치·표시 콘텐츠·표시 상품만 다룹니다. 콘텐츠 제작·매장 설정은 PC 「내 매장」에서.
          </div>
        )}
        {snap && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={{ ...panelBtn, fontSize: 13, padding: '6px 10px', color: '#6b7280' }}
              onClick={() => { if (window.confirm('이 브라우저의 태블릿 연결을 해제할까요? 다시 쓰려면 PC 에서 새 연결 코드를 발급해야 합니다.')) onDisconnected(); }}
            >
              이 브라우저 연결 해제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TabletStorePage;
