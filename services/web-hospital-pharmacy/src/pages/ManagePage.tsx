/**
 * Hospital Pharmacy — 관리자 최소 콘솔(연결 코드 발급 · PC 목록 · 해제)
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §2·§10·§16
 *
 * 이 화면만 로그인한다(관리자 = platform:super_admin, 별도 역할 §2). 일반 사용자 흐름과 분리돼 있다.
 * 큰 device 관리 UI 를 만들지 않는다(§10): ①연결 코드 1회 발급 ②발급 코드 상태 ③연결된 PC 목록 + 해제.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPanel from '../components/LoginPanel';
import {
  issueEnrollmentCode,
  listEnrollmentCodes,
  listDevices,
  revokeDevice,
  type EnrollmentCodeRow,
  type DeviceRow,
  type IssuedCode,
} from '../lib/adminApi';

function fmt(ts: string | null): string {
  return ts ? new Date(ts).toLocaleString('ko-KR') : '—';
}

function errMessage(err: unknown): string {
  const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
  if (resp?.status === 403) return '이 작업에는 관리자(super_admin) 권한이 필요합니다.';
  return resp?.data?.error || (err instanceof Error ? err.message : '요청을 처리하지 못했습니다.');
}

function Console() {
  const { user, logout } = useAuth();
  const [codes, setCodes] = useState<EnrollmentCodeRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [c, d] = await Promise.all([listEnrollmentCodes(), listDevices()]);
      setCodes(c);
      setDevices(d);
    } catch (err) {
      setError(errMessage(err));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const onIssue = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await issueEnrollmentCode(label);
      setIssued(code);
      setLabel('');
      await refresh();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await revokeDevice(id);
      await refresh();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tool">
      <h1>병원약국 관리 — PC 연결</h1>
      <div className="ds">
        <div className="meta">{user?.name || user?.email} (관리자)</div>
        <button type="button" className="btn ghost" onClick={logout}>로그아웃</button>
      </div>

      <div className="panel">
        <h3>이 병원 PC 연결 코드 발급</h3>
        <p className="muted">
          공용 PC 한 대당 코드 하나를 발급해 그 PC 에서 입력하게 하세요. 코드는 10분간 유효하고 1회만 쓸 수 있습니다.
        </p>
        <input
          className="field"
          placeholder="용도 메모 (선택) — 예: 3병동 스테이션"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={onIssue} disabled={busy}>연결 코드 발급</button>
        </div>
        {issued && (
          <div className="answer" style={{ marginTop: 12 }}>
            <div className="muted">아래 코드를 해당 PC 에서 입력하세요 (지금만 표시됩니다).</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4, margin: '8px 0' }}>{issued.code}</div>
            <div className="muted">만료: {fmt(issued.expiresAt)}{issued.label ? ` · ${issued.label}` : ''}</div>
          </div>
        )}
      </div>

      {error && <div className="err">{error}</div>}

      <div className="panel">
        <h3>연결된 PC ({devices.length})</h3>
        {devices.length === 0 ? (
          <div className="meta">아직 연결된 PC 가 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>이름</th><th>상태</th><th>연결</th><th>최근 사용</th><th></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{d.label || '(이름 없음)'}</td>
                  <td>{d.status === 'active' ? '활성' : '해제됨'}</td>
                  <td>{fmt(d.createdAt)}</td>
                  <td>{fmt(d.lastSeenAt)}</td>
                  <td>
                    {d.status === 'active' && (
                      <button className="btn ghost" type="button" onClick={() => void onRevoke(d.id)} disabled={busy}>
                        연결 해제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>최근 발급 코드 ({codes.length})</h3>
        {codes.length === 0 ? (
          <div className="meta">발급된 코드가 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>메모</th><th>상태</th><th>발급</th><th>만료</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{c.label || '—'}</td>
                  <td>{c.status === 'active' ? '사용 가능' : c.status === 'consumed' ? '사용됨' : '만료'}</td>
                  <td>{fmt(c.createdAt)}</td>
                  <td>{fmt(c.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function ManagePage() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="tool"><p className="muted">확인 중…</p></div>;
  if (!isAuthenticated) {
    return (
      <div className="tool">
        <h1>병원약국 관리 로그인</h1>
        <p className="muted">PC 연결 코드 발급·관리는 관리자만 할 수 있습니다. 관리자 계정으로 로그인해 주세요.</p>
        <div className="panel"><LoginPanel /></div>
      </div>
    );
  }
  return <Console />;
}
