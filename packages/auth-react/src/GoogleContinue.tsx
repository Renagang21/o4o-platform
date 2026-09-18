/**
 * <GoogleContinue /> — 공통 "Google로 계속하기" 진입 UI
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
 *
 * 흐름: GET /auth/google/config → GIS 버튼 → ID token → loginWithGoogle
 *   → 성공: onSuccess
 *   → code === 'GOOGLE_SIGNUP_REQUIRED': 약관/개인정보(+마케팅) 동의 → signupWithGoogle → onSuccess
 * 서비스명 조건문 없음. 스타일은 inline 최소값(서비스 Tailwind 와 충돌하지 않도록 className 으로 덮어쓸 수 있다).
 * 서버 allowlist 가 비어 있으면(enabled=false) "준비 중" 안내만 보여준다.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { renderGoogleButton, type GoogleAuthConfig } from '@o4o/auth-client';
import type { AuthLoginResult, GoogleSignupConsents } from './types';

export interface GoogleContinueProps<TUser = unknown> {
  /** `authClient.getGoogleAuthConfig` — 공개 Client ID 조회. */
  getConfig: () => Promise<GoogleAuthConfig>;
  /** `useServiceAuth().loginWithGoogle` */
  loginWithGoogle: (idToken: string) => Promise<AuthLoginResult<TUser>>;
  /** `useServiceAuth().signupWithGoogle` */
  signupWithGoogle: (idToken: string, consents: GoogleSignupConsents) => Promise<AuthLoginResult<TUser>>;
  /** 세션 성립(로그인 또는 신규 가입) 시 호출. `isNewUser` 로 안내 문구를 나눌 수 있다. */
  onSuccess: (result: { user: TUser; isNewUser: boolean }) => void;
  /** 서버 오류 표시용(선택). `code` 는 서버 응답 code(ACCOUNT_NOT_ACTIVE · EMAIL_IN_USE 등). */
  onError?: (error: { message: string; code?: string; accountStatus?: string }) => void;
  /** 동의 화면의 약관/개인정보 링크. 기본값은 대표 도메인 상대 경로. */
  termsHref?: string;
  privacyHref?: string;
  className?: string;
}

type Stage =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'button'; clientId: string }
  | { kind: 'consent'; idToken: string }
  | { kind: 'busy' };

const box: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const muted: CSSProperties = { fontSize: 13, color: '#6b7280', textAlign: 'center', margin: 0 };
const errorStyle: CSSProperties = { fontSize: 13, color: '#b91c1c', margin: 0 };
const checkRow: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 };
const primaryBtn: CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
  background: '#111827', color: '#fff', fontWeight: 600, cursor: 'pointer',
};
const ghostBtn: CSSProperties = {
  width: '100%', padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: 'transparent', color: '#374151', cursor: 'pointer',
};

export function GoogleContinue<TUser = unknown>({
  getConfig,
  loginWithGoogle,
  signupWithGoogle,
  onSuccess,
  onError,
  termsHref = '/terms',
  privacyHref = '/privacy',
  className,
}: GoogleContinueProps<TUser>) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [message, setMessage] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** 공개 Client ID 조회 → button | disabled. 실패 시 disabled(준비 중). */
  const loadConfig = useCallback(async () => {
    setStage({ kind: 'loading' });
    try {
      const cfg = await getConfig();
      if (!mountedRef.current) return;
      setStage(cfg.enabled && cfg.clientId ? { kind: 'button', clientId: cfg.clientId } : { kind: 'disabled' });
    } catch {
      if (mountedRef.current) setStage({ kind: 'disabled' });
    }
  }, [getConfig]);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  const fail = useCallback((result: AuthLoginResult<TUser>) => {
    const msg = result.error || 'Google 인증에 실패했습니다.';
    setMessage(msg);
    onError?.({ message: msg, code: result.code, accountStatus: result.accountStatus });
  }, [onError]);

  /** credential → login → (미등록) consent */
  const handleCredential = useCallback(async (idToken: string) => {
    setMessage(null);
    setStage({ kind: 'busy' });
    const result = await loginWithGoogle(idToken);
    if (!mountedRef.current) return;
    if (result.success && result.user) {
      onSuccess({ user: result.user, isNewUser: false });
      return;
    }
    if (result.code === 'GOOGLE_SIGNUP_REQUIRED') {
      setStage({ kind: 'consent', idToken });
      return;
    }
    fail(result);
    void loadConfig();
  }, [loginWithGoogle, onSuccess, fail, loadConfig]);

  // GIS 버튼 렌더
  useEffect(() => {
    if (stage.kind !== 'button' || !containerRef.current) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void renderGoogleButton({
      clientId: stage.clientId,
      container: containerRef.current,
      onCredential: (token) => { void handleCredential(token); },
      onError: (err) => {
        if (mountedRef.current) setMessage(err.message || 'Google 버튼을 불러오지 못했습니다.');
      },
    }).then((fn) => { if (disposed) fn(); else cleanup = fn; });
    return () => { disposed = true; cleanup?.(); };
  }, [stage, handleCredential]);

  /** consent → signup */
  const submitSignup = useCallback(async () => {
    if (stage.kind !== 'consent') return;
    if (!terms || !privacy) {
      setMessage('이용약관과 개인정보 처리방침에 동의해야 계정을 만들 수 있습니다.');
      return;
    }
    const idToken = stage.idToken;
    setMessage(null);
    setStage({ kind: 'busy' });
    const result = await signupWithGoogle(idToken, { terms, privacy, marketing });
    if (!mountedRef.current) return;
    if (result.success && result.user) {
      onSuccess({ user: result.user, isNewUser: true });
      return;
    }
    fail(result);
    // ID token 은 짧게 유효 — 동의 화면으로 되돌려 재시도를 허용한다(EMAIL_IN_USE 등은 메시지로 안내).
    setStage({ kind: 'consent', idToken });
  }, [stage, terms, privacy, marketing, signupWithGoogle, onSuccess, fail]);

  return (
    <div className={className} style={box} data-testid="google-continue">
      {stage.kind === 'loading' && <p style={muted}>Google 로그인을 준비하고 있습니다…</p>}
      {stage.kind === 'busy' && <p style={muted}>Google 계정을 확인하고 있습니다…</p>}
      {stage.kind === 'disabled' && (
        <p style={muted} data-testid="google-continue-disabled">Google 로그인은 준비 중입니다.</p>
      )}
      {stage.kind === 'button' && (
        <div
          ref={containerRef}
          style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}
          data-testid="google-continue-button"
        />
      )}
      {stage.kind === 'consent' && (
        <div style={box} data-testid="google-continue-consent">
          <p style={{ fontSize: 14, color: '#111827', margin: 0 }}>
            처음 오셨네요. 계정을 만들려면 아래 항목에 동의해 주세요.
          </p>
          <label style={checkRow}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span><a href={termsHref} target="_blank" rel="noreferrer">이용약관</a>에 동의합니다. (필수)</span>
          </label>
          <label style={checkRow}>
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
            <span><a href={privacyHref} target="_blank" rel="noreferrer">개인정보 처리방침</a>에 동의합니다. (필수)</span>
          </label>
          <label style={checkRow}>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>마케팅 정보 수신에 동의합니다. (선택)</span>
          </label>
          <button type="button" style={primaryBtn} onClick={() => { void submitSignup(); }}>
            동의하고 계정 만들기
          </button>
          <button type="button" style={ghostBtn} onClick={() => { setMessage(null); void loadConfig(); }}>
            취소
          </button>
        </div>
      )}
      {message && <p style={errorStyle} role="alert">{message}</p>}
    </div>
  );
}
