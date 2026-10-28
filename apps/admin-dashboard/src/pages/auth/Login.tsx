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
import { renderGoogleButton } from '@o4o/auth-client';
import toast from 'react-hot-toast';

type GoogleStage = 'loading' | 'disabled' | 'ready';

/** admin 호스트의 '/' 는 admin 앱 자신이다 — 메인 사이트는 O4O 대표 호스트. */
const MAIN_SITE_URL = 'https://neture.co.kr/';

const Login: FC = () => {
  
  const { loginWithGoogle, getGoogleAuthConfig, isAuthenticated, error, clearError, isAdmin, sessionConflict } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Google 진입: config → GIS 버튼 → ID token → loginWithGoogle (로그인만)
  const [googleStage, setGoogleStage] = useState<GoogleStage>('loading');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);

  // GIS callback 은 mount 시 고정되므로 최신 코드값은 ref 로 읽는다.

  useEffect(() => {
    let alive = true;
    getGoogleAuthConfig()
      .then((cfg) => {
        if (!alive) return;
        setGoogleClientId(cfg.enabled ? cfg.clientId : null);
        setGoogleStage(cfg.enabled && cfg.clientId ? 'ready' : 'disabled');
      })
      .catch(() => { if (alive) setGoogleStage('disabled'); });
    return () => { alive = false; };
  }, [getGoogleAuthConfig]);

  useEffect(() => {
    if (googleStage !== 'ready' || !googleClientId || !googleContainerRef.current) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void renderGoogleButton({
      clientId: googleClientId,
      container: googleContainerRef.current,
      onCredential: (idToken) => { void handleGoogleCredential(idToken); },
      onError: (err) => toast.error(err.message || 'Google 버튼을 불러오지 못했습니다.'),
    }).then((fn) => { if (disposed) fn(); else cleanup = fn; });
    return () => { disposed = true; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleStage, googleClientId]);

  // 리다이렉트 URL 처리
  const redirectUrl = searchParams.get('redirect') || '/admin';
  const fromLocation = (location.state as any)?.from || redirectUrl;

  // 이미 인증된 관리자는 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      toast.success('이미 로그인되어 있습니다.');
    }
  }, [isAuthenticated, isAdmin]);

  if (isAuthenticated) {
    if (isAdmin) {
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
        errorMessage = '이 Google 계정은 아직 O4O 에 등록되지 않았습니다. 서비스 화면에서 먼저 계정을 만들어 주세요.';
      } else if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
        errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
      } else if (errorCode === 'GOOGLE_ID_TOKEN_INVALID') {
        errorMessage = 'Google 인증에 실패했습니다. 다시 시도해 주세요.';
      } else if (error?.response?.status === 429) {
        errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      } else if (serverMessage) {
        errorMessage = serverMessage;
      }
      toast.error(errorMessage);
      clearError();
    }
  };

  return (
    <LoginLayout brand="O4O Admin" tone="slate" headline={<>운영의 시작,<br />명확하고 간결하게.</>} description="O4O 서비스 운영을 위한 관리자 공간입니다.">
      <LoginCard brand="O4O Admin" tone="slate" heading="h1" title="관리자 로그인" description="승인된 관리자 Google 계정으로 로그인하세요.">
        {/* 세션 사용자 교체 안내 — 명시적 재로그인 전까지 기존 화면 · 서버 세션을 쓰지 않는다 */}
        {sessionConflict && (
          <div
            role="alert"
            data-testid="session-conflict-notice"
            className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900"
          >
            다른 계정의 로그인으로 이 브라우저의 관리자 세션이 바뀌었습니다. 보안을 위해 이전 화면을 닫았습니다.
            계속하려면 관리자 계정으로 다시 로그인하세요.
          </div>
        )}

        {/* 로그인 폼 */}
        <div className="o4o-login-provider-panel">
          {/* Google 로 계속하기 — 기본 진입 */}
          <div className="mb-2">
            {googleStage === 'loading' && (
              <p className="text-center text-sm text-slate-600">Google 로그인을 준비하고 있습니다…</p>
            )}
            {googleStage === 'disabled' && (
              <p className="text-center text-sm text-slate-600" data-testid="google-continue-disabled">Google 로그인은 준비 중입니다.</p>
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