/**
 * TabletSetupPage — 실제 태블릿 연결(온보딩)
 *
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * PC(위치 카드 [태블릿 연결])에서 발급한 6자리 연결 코드를 태블릿 브라우저에서 입력한다.
 *   코드 입력 → 매장 확인 → 기기 이름 → 위치 선택 → 연결 → /tablet/:slug 로 이동
 * 기기 토큰은 이 브라우저(localStorage)에만 보관하고 서버는 hash 만 가진다.
 * 별도 태블릿 계정/PIN 없음. 이미 연결된 브라우저는 바로 매장 화면으로 보낸다.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  loadStoredTabletDevice,
  saveStoredTabletDevice,
  pairingLookup,
  pairingClaim,
  type PairingLookupResult,
} from '../../api/tablet';

const wrap: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 24, boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' };
const card: React.CSSProperties = { width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 30px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', gap: 16, fontSize: 18, color: '#111827' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 22, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1' };
const btn: React.CSSProperties = { fontSize: 18, padding: '12px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' };
const primary: React.CSSProperties = { ...btn, background: '#2563eb', color: '#fff', border: '1px solid #2563eb' };

export function TabletSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [lookup, setLookup] = useState<PairingLookupResult | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 연결된 브라우저 → 매장 화면. (?reset=1 이면 재연결 허용)
  useEffect(() => {
    if (searchParams.get('reset') === '1') return;
    const stored = loadStoredTabletDevice();
    if (stored) navigate(`/tablet/${encodeURIComponent(stored.storeSlug)}`, { replace: true });
  }, [navigate, searchParams]);

  const handleLookup = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await pairingLookup(code.replace(/\D/g, ''));
      setLookup(r);
      setLocationId(r.defaultLocationId || r.locations[0]?.id || '');
      const loc = r.locations.find((l) => l.id === (r.defaultLocationId || r.locations[0]?.id));
      setDeviceName(loc ? `${loc.location || loc.name} 태블릿` : `${r.storeName} 태블릿`);
    } catch (e: any) {
      setError(e?.code === 'PAIRING_CODE_INVALID' ? '연결 코드가 올바르지 않거나 만료되었습니다. PC 에서 코드를 다시 발급하세요.' : (e?.message || '연결 코드를 확인할 수 없습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!lookup) return;
    setBusy(true);
    setError(null);
    try {
      const device = await pairingClaim({ code: code.replace(/\D/g, ''), deviceName: deviceName.trim() || undefined, locationId: locationId || null });
      saveStoredTabletDevice(device);
      navigate(`/tablet/${encodeURIComponent(device.storeSlug)}`, { replace: true });
    } catch (e: any) {
      setError(e?.code === 'PAIRING_CODE_CONSUMED' ? '이미 사용된 연결 코드입니다. PC 에서 새 코드를 발급하세요.' : (e?.message || '태블릿을 연결할 수 없습니다.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card} data-testid="tablet-setup">
        <h1 style={{ margin: 0, fontSize: 24 }}>태블릿 연결</h1>
        {!lookup ? (
          <>
            <p style={{ margin: 0, color: '#4b5563' }}>PC 「내 매장 › 태블릿」의 위치 카드에서 [태블릿 연결] 을 눌러 받은 6자리 코드를 입력하세요.</p>
            <input
              style={{ ...input, letterSpacing: 6, textAlign: 'center' }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="000000"
              aria-label="연결 코드"
              data-testid="pairing-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.replace(/\D/g, '').length === 6) void handleLookup(); }}
            />
            {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
            <button type="button" style={primary} disabled={busy || code.replace(/\D/g, '').length !== 6} onClick={handleLookup} data-testid="pairing-lookup">
              {busy ? '확인 중…' : '매장 확인'}
            </button>
          </>
        ) : (
          <>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
              <div style={{ color: '#6b7280', fontSize: 14 }}>연결할 매장</div>
              <div style={{ fontSize: 22, fontWeight: 700 }} data-testid="pairing-store-name">{lookup.storeName}</div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>기기 이름</span>
              <input style={input} value={deviceName} onChange={(e) => setDeviceName(e.target.value)} maxLength={100} data-testid="pairing-device-name" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>설치 위치</span>
              <select style={input} value={locationId} onChange={(e) => setLocationId(e.target.value)} data-testid="pairing-location">
                {lookup.locations.length === 0 && <option value="">(위치 없음 — 나중에 지정)</option>}
                {lookup.locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.location ? `${l.location} · ${l.name}` : l.name}</option>
                ))}
              </select>
            </label>
            {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={btn} disabled={busy} onClick={() => { setLookup(null); setError(null); }}>다른 코드</button>
              <button type="button" style={primary} disabled={busy} onClick={handleClaim} data-testid="pairing-claim">{busy ? '연결 중…' : '이 매장에 연결'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TabletSetupPage;
