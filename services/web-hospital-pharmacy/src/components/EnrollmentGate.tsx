/**
 * Hospital Pharmacy — 이 PC 연결 게이트(로그인리스)
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §0·§1·§11·§12
 *
 * 연결 안 된 PC:  "이 PC 는 아직 병원약국 서비스에 연결되지 않았습니다. [이 PC 연결하기]"
 *   → 코드 입력 → POST /api/hospital/enroll → 서버가 device 쿠키 심음 → refresh → 화면 진입.
 * 연결된 PC:   자식(홈·병동·약제부)을 그대로 렌더 — 로그인 없이 사용(§12).
 *
 * Google 로그인·개인 계정은 이 경로에 없다(§2·§17). 관리자 코드 발급은 별도 /manage 에서만.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { enrollDevice, EnrollError } from '../lib/deviceSession';
import { BRAND } from '../config/service';

export default function EnrollmentGate({ children }: { children: ReactNode }) {
  const { status, refresh } = useDevice();
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  if (status === 'loading') {
    return (
      <div className="tool">
        <p className="muted">연결 상태를 확인하는 중입니다…</p>
      </div>
    );
  }

  if (status === 'enrolled') return <>{children}</>;

  // 연결 직후 확인 화면 — "이 PC 가 병원약국 서비스에 연결되었습니다."
  if (connected) {
    return (
      <div className="tool">
        <h1>이 PC 가 연결되었습니다</h1>
        <p className="muted">
          이제 이 PC 에서는 로그인 없이 {BRAND.name} 를 사용할 수 있습니다. 병동 조사와 약제부 원내 목록 연결을
          바로 이용해 주세요.
        </p>
        <button className="btn" onClick={() => void refresh()}>시작하기</button>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await enrollDevice({ code: trimmed, ...(label.trim() ? { label: label.trim() } : {}) });
      setCode('');
      setLabel('');
      setConnected(true);
      await refresh();
    } catch (err) {
      setError(err instanceof EnrollError ? err.message : '이 PC 를 연결하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tool">
      <h1>이 PC 연결하기</h1>
      <p className="muted">
        이 PC 는 아직 병원약국 서비스에 연결되지 않았습니다. 관리자에게 받은 <b>연결 코드</b>를 입력하면 이 PC 에서
        로그인 없이 서비스를 사용할 수 있습니다. 개인 계정 로그인은 필요하지 않습니다.
      </p>

      <form onSubmit={onSubmit} className="panel">
        <label className="muted" htmlFor="enroll-code">연결 코드</label>
        <input
          id="enroll-code"
          className="field"
          style={{ fontSize: 20, letterSpacing: 2, textTransform: 'uppercase' }}
          placeholder="예: H7K4-29PX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <label className="muted" htmlFor="enroll-label" style={{ marginTop: 12 }}>이 PC 이름 (선택)</label>
        <input
          id="enroll-label"
          className="field"
          placeholder="예: 3병동 스테이션 · 약제부 조제대"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={busy || code.trim().length === 0}>
            {busy ? '연결 중…' : '이 PC 연결하기'}
          </button>
        </div>
      </form>

      {error && <div className="err">{error}</div>}
    </div>
  );
}
