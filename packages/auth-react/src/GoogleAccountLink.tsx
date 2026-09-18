/**
 * <GoogleAccountLink /> — 계정 설정의 "로그인 방법 › Google" 카드
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §8·§9
 *
 * 흐름: GET /auth/google/link/status → (연결됨) "Google 계정 연결됨 ✓"
 *                                    → (미연결 · passwordSet) [Google 계정 연결] → 현재 비밀번호 → GIS 버튼 → ID token
 *                                      → linkGoogle(idToken, currentPassword) → "연결됨 ✓"
 * Google-only 계정(passwordSet=false)은 비밀번호 입력 UI 를 보이지 않는다(연결됨 표시만).
 * Google email 은 서버가 돌려주지 않으므로 화면에도 없다. 서비스명 조건문 없음 — <GoogleContinue /> 와 같은 콜백 props 방식.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { renderGoogleButton, type GoogleAuthConfig, type GoogleLinkResult, type GoogleLinkStatus } from '@o4o/auth-client';

export interface GoogleAccountLinkProps {
  /** `authClient.getGoogleAuthConfig` — 공개 Client ID. enabled=false 면 "준비 중". */
  getConfig: () => Promise<GoogleAuthConfig>;
  /** `authClient.getGoogleLinkStatus` — null 이면 카드를 그리지 않는다(미로그인·오류). */
  getStatus: () => Promise<GoogleLinkStatus | null>;
  /** `authClient.linkGoogle` — 실패는 throw(axios 오류). */
  linkGoogle: (idToken: string, currentPassword: string) => Promise<GoogleLinkResult>;
  onLinked?: (result: GoogleLinkResult) => void;
  onError?: (error: { message: string; code?: string }) => void;
  className?: string;
}

type Stage =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'linked' }
  | { kind: 'google-only' }
  | { kind: 'idle' }
  | { kind: 'disabled' }
  | { kind: 'password' }
  | { kind: 'google'; clientId: string; currentPassword: string }
  | { kind: 'busy' };

/** axios 계열 오류에서 서버 `{ error, code }` 를 꺼낸다. */
function readServerError(error: unknown): { message: string; code?: string } {
  const e = error as { response?: { data?: { error?: unknown; message?: unknown; code?: unknown } }; message?: string };
  const data = e?.response?.data;
  const message =
    (typeof data?.error === 'string' && data.error)
    || (typeof data?.message === 'string' && data.message)
    || 'Google 계정 연결에 실패했습니다.';
  return { message, code: typeof data?.code === 'string' ? data.code : undefined };
}

const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const row: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const label: CSSProperties = { fontWeight: 600, fontSize: 14 };
const muted: CSSProperties = { fontSize: 13, color: '#6b7280', margin: 0 };
const okText: CSSProperties = { fontSize: 13, color: '#047857', margin: 0 };
const errorStyle: CSSProperties = { fontSize: 13, color: '#b91c1c', margin: 0 };
const input: CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 };
const primaryBtn: CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: 'none',
  background: '#111827', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
};
const ghostBtn: CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: 'transparent', color: '#374151', cursor: 'pointer', fontSize: 14,
};

export function GoogleAccountLink({ getConfig, getStatus, linkGoogle, onLinked, onError, className }: GoogleAccountLinkProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const callbacksRef = useRef({ getConfig, getStatus, linkGoogle, onLinked, onError });
  callbacksRef.current = { getConfig, getStatus, linkGoogle, onLinked, onError };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadStatus = useCallback(async () => {
    setStage({ kind: 'loading' });
    try {
      const status = await callbacksRef.current.getStatus();
      if (!mountedRef.current) return;
      if (!status) { setStage({ kind: 'hidden' }); return; }
      if (status.linked) { setStage({ kind: 'linked' }); return; }
      setStage(status.passwordSet ? { kind: 'idle' } : { kind: 'google-only' });
    } catch {
      if (mountedRef.current) setStage({ kind: 'hidden' });
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  /** 비밀번호 입력 → 공개 Client ID 조회 → GIS 버튼 단계. 비밀번호는 서버 검증 전까지 state 에만 둔다. */
  const submitPassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const currentPassword = password.trim();
    if (!currentPassword) { setMessage('현재 비밀번호를 입력해 주세요.'); return; }
    setMessage(null);
    setStage({ kind: 'busy' });
    try {
      const cfg = await callbacksRef.current.getConfig();
      if (!mountedRef.current) return;
      if (!cfg.enabled || !cfg.clientId) { setStage({ kind: 'disabled' }); return; }
      setStage({ kind: 'google', clientId: cfg.clientId, currentPassword });
    } catch {
      if (mountedRef.current) setStage({ kind: 'disabled' });
    }
  }, [password]);

  const handleCredential = useCallback(async (idToken: string, currentPassword: string) => {
    setMessage(null);
    setStage({ kind: 'busy' });
    try {
      const result = await callbacksRef.current.linkGoogle(idToken, currentPassword);
      if (!mountedRef.current) return;
      setPassword('');
      setStage({ kind: 'linked' });
      callbacksRef.current.onLinked?.(result);
    } catch (error) {
      if (!mountedRef.current) return;
      const err = readServerError(error);
      setMessage(err.message);
      callbacksRef.current.onError?.(err);
      // 비밀번호 오류면 다시 입력, 그 외(409 등)는 처음 상태로 — 비밀번호는 유지하지 않는다.
      setPassword('');
      setStage(err.code === 'INVALID_PASSWORD' ? { kind: 'password' } : { kind: 'idle' });
    }
  }, []);

  useEffect(() => {
    if (stage.kind !== 'google' || !containerRef.current) return;
    const { clientId, currentPassword } = stage;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void renderGoogleButton({
      clientId,
      container: containerRef.current,
      onCredential: (token) => { void handleCredential(token, currentPassword); },
      onError: (err) => {
        if (mountedRef.current) setMessage(err.message || 'Google 버튼을 불러오지 못했습니다.');
      },
      button: { text: 'continue_with' },
    }).then((fn) => { if (disposed) fn(); else cleanup = fn; });
    return () => { disposed = true; cleanup?.(); };
  }, [stage, handleCredential]);

  if (stage.kind === 'hidden') return null;

  return (
    <section className={className} style={card} data-testid="google-account-link" aria-live="polite">
      <div style={row}>
        <span style={label}>Google</span>
        {stage.kind === 'loading' && <p style={muted}>확인 중…</p>}
        {(stage.kind === 'linked' || stage.kind === 'google-only') && (
          <p style={okText} data-testid="google-account-link-linked">Google 계정 연결됨 ✓</p>
        )}
        {stage.kind === 'idle' && (
          <>
            <p style={muted}>연결되지 않음</p>
            <button type="button" style={primaryBtn} onClick={() => { setMessage(null); setStage({ kind: 'password' }); }}>
              Google 계정 연결
            </button>
          </>
        )}
        {stage.kind === 'disabled' && <p style={muted} data-testid="google-account-link-disabled">Google 로그인은 준비 중입니다.</p>}
        {stage.kind === 'busy' && <p style={muted}>처리 중…</p>}
      </div>

      {stage.kind === 'password' && (
        <form onSubmit={(e) => { void submitPassword(e); }} style={card} data-testid="google-account-link-password">
          <p style={muted}>본인 확인을 위해 현재 비밀번호를 입력한 뒤 연결할 Google 계정을 선택합니다.</p>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="현재 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            aria-label="현재 비밀번호"
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={ghostBtn} onClick={() => { setPassword(''); setMessage(null); setStage({ kind: 'idle' }); }}>취소</button>
            <button type="submit" style={primaryBtn}>다음</button>
          </div>
        </form>
      )}

      {stage.kind === 'google' && (
        <div style={card} data-testid="google-account-link-google">
          <p style={muted}>연결할 Google 계정을 선택해 주세요.</p>
          <div ref={containerRef} />
          <button type="button" style={ghostBtn} onClick={() => { setPassword(''); setMessage(null); setStage({ kind: 'idle' }); }}>취소</button>
        </div>
      )}

      {message && <p style={errorStyle} role="alert">{message}</p>}
    </section>
  );
}
