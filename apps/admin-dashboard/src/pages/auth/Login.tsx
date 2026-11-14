/**
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기 = 기본 진입.
 * Admin 은 가입을 제공하지 않는다 — 미등록 Google 계정(GOOGLE_SIGNUP_REQUIRED)은 서비스 화면 가입 안내만.
 *
 * Admin 의 로그인 수단은 Google 하나다. 이메일/비밀번호 로그인 UI 와 [비밀번호 찾기] 진입은 없다.
 *
 * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1:
 *   - 종전 주석의 "서버의 password 로그인 경로는 다른 surface 를 위해 남아 있다" 는 **더 이상 사실이 아니다.**
 *     password 로그인 경로는 런타임·스키마 양쪽에서 은퇴했다.
 *   - 관리자 Google 최초 연결(1회용 bootstrap) UI 도 제거했다. 목적이던 기존 관리자 계정의
 *     Google 연결은 완료됐고, 서버 경로 자체가 은퇴했다.
 *
 * GIS 버튼은 하나만 둔다 — 같은 페이지에서 두 번 initialize 하면 마지막 callback 만 살아남는다.
 */
import { LoginCard, LoginLayout } from '@o4o/auth-react';

import { FC, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { loadGoogleIdentityScript, renderGoogleButton } from '@o4o/auth-client';
import toast from 'react-hot-toast';

type GoogleStage = 'loading' | 'disabled' | 'ready';

/** admin 호스트의 '/' 는 admin 앱 자신이다 — 메인 사이트는 O4O 대표 호스트. */
const MAIN_SITE_URL = 'https://neture.co.kr/';
/** 이 시간이 지나도 설정을 못 받으면 서버가 켜지는 중이라고 안내한다. */
const GOOGLE_SLOW_NOTICE_MS = 5_000;
/** 설정 요청 최대 횟수(처음 1회 포함)와 다시 묻기 전 대기 시간. */
const GOOGLE_CONFIG_ATTEMPTS = 3;
const GOOGLE_RETRY_DELAY_MS = 3_000;

const Login: FC = () => {
  
  const { loginWithGoogle, getGoogleAuthConfig, isAuthenticated, error, clearError, user, sessionConflict, logout } = useAuth();
  const isPlatformAdmin = user?.roles?.includes('platform:super_admin') === true;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Google 진입: config → GIS 버튼 → ID token → loginWithGoogle (로그인만)
  const [googleStage, setGoogleStage] = useState<GoogleStage>('loading');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);

  // GIS callback 은 mount 시 고정되므로 최신 코드값은 ref 로 읽는다.

  // AuthProvider 는 렌더마다 새 getGoogleAuthConfig 함수를 만든다. deps 에 넣으면 세션 확인이 끝나 다시 그려질 때
  // 설정 요청이 처음부터 다시 시작돼 Google 버튼이 늦게 뜬다 — 화면이 뜰 때 한 번만 요청한다.
  const getGoogleAuthConfigRef = useRef(getGoogleAuthConfig);
  // API 서버는 한동안 요청이 없으면 내려가 있다가 첫 요청에 다시 켜진다(Cloud Run min-instances=0).
  // 그동안 화면이 멈춘 것처럼 보이지 않게 5초가 넘으면 이유를 보이고, 실패하면 자동으로 다시 묻는다(2026-11-14).
  const [googleSlow, setGoogleSlow] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(1);
  const [googleReload, setGoogleReload] = useState(0);
  useEffect(() => {
    let alive = true;
    // Google 스크립트는 설정 응답을 기다리지 않고 바로 받기 시작한다(실패해도 버튼 렌더 단계에서 다시 시도·안내).
    void loadGoogleIdentityScript().catch(() => undefined);
    const slowTimer = setTimeout(() => { if (alive) setGoogleSlow(true); }, GOOGLE_SLOW_NOTICE_MS);
    void (async () => {
      for (let attempt = 1; attempt <= GOOGLE_CONFIG_ATTEMPTS; attempt += 1) {
        if (attempt > 1) {
          setGoogleAttempt(attempt);
          await new Promise((resolve) => setTimeout(resolve, GOOGLE_RETRY_DELAY_MS));
          if (!alive) return;
        }
        // getGoogleAuthConfig 는 실패를 { enabled: false } 로 돌려준다 — 미설정과 구분되지 않으므로 같은 횟수만큼 다시 묻는다.
        const cfg = await getGoogleAuthConfigRef.current().catch(() => ({ enabled: false, clientId: null }));
        if (!alive) return;
        if (cfg.enabled && cfg.clientId) {
          setGoogleClientId(cfg.clientId);
          setGoogleStage('ready');
          return;
        }
      }
      setGoogleClientId(null);
      setGoogleStage('disabled');
    })();
    return () => { alive = false; clearTimeout(slowTimer); };
  }, [googleReload]);
  const retryGoogle = () => {
    setGoogleSlow(false);
    setGoogleAttempt(1);
    setGoogleStage('loading');
    setGoogleReload((value) => value + 1);
  };

  useEffect(() => {
    if (googleStage !== 'ready' || !googleClientId || !googleContainerRef.current) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void renderGoogleButton({
      clientId: googleClientId,
      container: googleContainerRef.current,
      button: { size: 'medium', text: 'continue_with' },
      onCredential: (idToken) => { void handleGoogleCredential(idToken); },
      onError: (err) => toast.error(err.message || 'Google 버튼을 불러오지 못했습니다.'),
    }).then((fn) => { if (disposed) fn(); else cleanup = fn; });
    return () => { disposed = true; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleStage, googleClientId]);

  // 업무 위임이 없는 일반 회원: 업무 화면이 여기로 돌려보낸다. 세션을 끝내고 이유를 보인다.
  const operatorsOnlyDenied = searchParams.get('denied') === 'operators-only';
  const [operatorsOnlyNotice, setOperatorsOnlyNotice] = useState(operatorsOnlyDenied);
  useEffect(() => {
    if (!operatorsOnlyDenied) return;
    setOperatorsOnlyNotice(true);
    // 로그아웃이 끝나면 주소의 표시를 지운다 — 다른 계정으로 다시 로그인할 때 또 로그아웃되지 않게 한다.
    if (isAuthenticated) logout();
    else setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('denied'); return next; }, { replace: true });
  }, [operatorsOnlyDenied, isAuthenticated, logout, setSearchParams]);

  // 리다이렉트 URL 처리
  const redirectUrl = searchParams.get('redirect') || '/admin';
  const fromLocation = (location.state as any)?.from || redirectUrl;

  // 이미 인증된 관리자는 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && isPlatformAdmin) {
      toast.success('이미 로그인되어 있습니다.');
    }
  }, [isAuthenticated, isPlatformAdmin]);

  if (isAuthenticated && !operatorsOnlyDenied) {
    if (isPlatformAdmin) {
      return <Navigate to={fromLocation} replace />;
    } else {
      // The server checks Google proof and explicit central delegation before rendering any work.
      return <Navigate to="/operations" replace />;
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    clearError();
    try {
      await loginWithGoogle(idToken, 'neture');
      toast.success('관리자 로그인 성공!');
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const serverMessage = error?.response?.data?.error;
      let errorMessage = 'Google 로그인에 실패했습니다.';
      if (errorCode === 'GOOGLE_SIGNUP_REQUIRED') {
        errorMessage = '이 Google 계정은 아직 O4O 에 등록되지 않았습니다. 서비스 화면에서 먼저 계정을 만들어 주시기 바랍니다.';
      } else if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
        errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하시기 바랍니다.';
      } else if (errorCode === 'GOOGLE_ID_TOKEN_INVALID') {
        errorMessage = 'Google 인증에 실패했습니다. 다시 시도해 주시기 바랍니다.';
      } else if (error?.response?.status === 429) {
        errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주시기 바랍니다.';
      } else if (serverMessage) {
        errorMessage = serverMessage;
      }
      toast.error(errorMessage);
      clearError();
    }
  };

  return (
    <LoginLayout logoSrc={`${import.meta.env.BASE_URL}brand/admin/logo-mark.svg`} brand="O4O Admin" tone="slate" headline={<>운영의 시작,<br />명확하고 간결하게.</>} description="O4O 서비스 운영을 위한 관리자 공간입니다.">
      <LoginCard logoSrc={`${import.meta.env.BASE_URL}brand/admin/logo-mark.svg`} brand="O4O Admin" tone="slate" heading="h1" title="관리자 로그인" description="승인된 관리자 Google 계정으로 로그인하시기 바랍니다.">
        {/* 세션 사용자 교체 안내 — 명시적 재로그인 전까지 기존 화면 · 서버 세션을 쓰지 않는다 */}
        {sessionConflict && (
          <div
            role="alert"
            data-testid="session-conflict-notice"
            className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900"
          >
            다른 계정의 로그인으로 이 브라우저의 관리자 세션이 바뀌었습니다. 보안을 위해 이전 화면을 닫았습니다.
            계속하려면 관리자 계정으로 다시 로그인하시기 바랍니다.
          </div>
        )}

        {operatorsOnlyNotice && (
          <div role="alert" data-testid="operators-only-notice" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            관리자 사이트는 전체 관리자와 운영자만 이용할 수 있습니다. 이 계정에는 업무 위임이 없거나 회수되어 로그아웃했습니다.
            업무 운영자로 초대받으셨다면 초대를 먼저 수락한 뒤 다시 로그인해 주시기 바랍니다.
          </div>
        )}

        {/* 로그인 폼 */}
        <div className="o4o-login-provider-panel">
          {/* Google 로 계속하기 — 기본 진입 */}
          <div className="mb-2">
            {googleStage === 'loading' && (
              <div role="status" className="space-y-1 text-center text-sm text-slate-600">
                <p>Google 로그인을 준비하고 있습니다…</p>
                {googleSlow && (
                  <p data-testid="google-continue-slow">서버를 깨우는 중입니다(최대 30초 정도). 한동안 사용이 없으면 첫 접속이 느릴 수 있습니다.</p>
                )}
                {googleAttempt > 1 && (
                  <p data-testid="google-continue-retrying">연결이 되지 않아 다시 시도하고 있습니다 ({googleAttempt}/{GOOGLE_CONFIG_ATTEMPTS}).</p>
                )}
              </div>
            )}
            {googleStage === 'disabled' && (
              <div className="space-y-2 text-center text-sm text-slate-600">
                <p data-testid="google-continue-disabled">Google 로그인을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주시기 바랍니다.</p>
                <button type="button" onClick={retryGoogle} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">다시 시도</button>
              </div>
            )}
            {googleStage === 'ready' && (
              <div ref={googleContainerRef} className="flex justify-center min-h-[44px]" data-testid="google-continue-button" />
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div role="alert" className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 하단 링크 */}
        <div className="o4o-login-footnote text-center">
          <a
            href={MAIN_SITE_URL}
            className="text-sm underline underline-offset-4"
          >
            메인 사이트로 돌아가기
          </a>
        </div>
      </LoginCard>
    </LoginLayout>
  );
};

export default Login;
