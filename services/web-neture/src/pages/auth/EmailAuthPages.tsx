/**
 * 이메일·비밀번호 인증 페이지 — WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 *   /signup            **가입 화면(정본)** — Google·카카오·이메일(아이디) 가입
 *   /verify-email      메일 링크 토큰으로 이메일 확인
 *   /find-id           이름 + 휴대전화 → 가린 이메일 힌트
 *   /forgot-password   비밀번호 재설정 메일
 *   /reset-password    새 비밀번호 설정
 *
 * 화면 본체는 전부 @o4o/auth-react 공통 컴포넌트다. 이 파일은 카드 레이아웃 · 라우팅 연결만 한다.
 * 로그인은 기존 로그인 모달(`/login` → 모달)을 쓴다. 이미 로그인한 사용자는 가입 화면 대신 홈으로 보낸다.
 *
 * `/signup` 은 Google·카카오·이메일(아이디) 가입을 함께 제공한다.
 * 소셜 가입은 긴 이메일 폼보다 먼저 보여 별도 정보를 입력하지 않고도 시작할 수 있게 한다.
 * `/register` 는 이 화면으로 보낸다 — 가입 진입점이 두 곳으로 갈라지지 않게.
 * 메일 링크의 1회용 토큰은 URL fragment(`#token=`)로 받고, 읽은 즉시 주소창에서 지운다
 * (서버 요청 로그 · 방문 기록 · Referer 로 남지 않게).
 */
import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  O4OHomeButton,
  GoogleContinue, KakaoContinue,
  EmailSignupForm,
  VerifyEmailView,
  FindLoginIdForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  type EmailAuthLinks,
} from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../contexts/AuthContext';
import { authClient } from '../../lib/apiClient';
import { operatorInvitationReturnPath, recoverOperatorInvitationContinuation } from '../../lib/operatorInvitationReturn';

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="text-2xl" aria-hidden>🌿</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 break-keep">{subtitle}</p>}
          </div>
        </div>
        <div className="p-6">{children}
          <div className="mt-6"><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} label="O4O 메인으로" className="o4o-home-link" /></div>
        </div>
      </div>
    </div>
  );
}

function useAuthLinks(): EmailAuthLinks {
  const navigate = useNavigate();
  return {
    login: operatorInvitationReturnPath() === '/operator-invite' ? '/login?returnTo=%2Foperator-invite' : '/login',
    signup: '/signup',
    findId: '/find-id',
    forgotPassword: '/forgot-password',
    onNavigate: (href) => navigate(href),
  };
}

/**
 * 메일 링크 fragment(`#token=...`)의 1회용 토큰을 읽는다. query(`?token=`)는 읽지 않는다.
 * fragment 는 HTTP 요청에 실리지 않으므로 웹 서버 · 인프라 요청 로그에 토큰이 남지 않는다.
 */
export function readHashToken(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const token = new URLSearchParams(raw).get('token');
  return token ? token : null;
}

/**
 * 토큰을 메모리(state)에 확보한 직후 주소창 · history 에서 fragment 를 지운다.
 * useLayoutEffect 라 하위 화면의 API 호출(useEffect)보다 먼저 실행된다 — 응답을 기다리지 않는다.
 */
function useOneTimeToken(): string | null {
  const location = useLocation();
  const [token] = useState(() => readHashToken(location.hash));
  useLayoutEffect(() => {
    // router navigate 는 첫 렌더에서 무시되므로 주소창(history)을 직접 바꾼다. history.state(router idx)는 유지.
    const { hash, pathname, search } = window.location;
    if (hash) window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  }, []);
  return token;
}

export function SignupPage() {
  const { isAuthenticated, isLoading, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig, loginWithKakao, signupWithKakao } = useAuth();
  const links = useAuthLinks();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [emailSignup, setEmailSignup] = useState(false);
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={operatorInvitationReturnPath()} replace />;
  return (
    <AuthCard title="회원가입" subtitle={emailSignup ? '이메일(아이디)로 가입' : '개인정보 보호를 위해 Google·카카오 가입을 권장합니다.'}>
      {emailSignup ? (
        <>
          <button type="button" className="mb-4 min-h-11 text-sm text-gray-600 underline" onClick={() => { setEmailSignup(false); setGoogleError(null); }}>
            다른 방법으로 가입
          </button>
          <EmailSignupForm api={authClient} links={links} termsHref="/terms" privacyHref="/privacy" />
        </>
      ) : (
        <>
          <section aria-label="소셜 계정으로 가입" className="space-y-3">
            <GoogleContinue<User>
              personalizedButton={false}
              getSignupTerms={() => authClient.getSignupTerms()}
              getConfig={getGoogleAuthConfig}
              loginWithGoogle={loginWithGoogle}
              signupWithGoogle={signupWithGoogle}
              onStart={() => setGoogleError(null)}
              onSuccess={() => { setGoogleError(null); navigate(operatorInvitationReturnPath(), { replace: true }); }}
              onError={({ message }) => setGoogleError(message)}
              termsHref="/terms"
              privacyHref="/privacy"
            />
            <KakaoContinue<User> client={authClient} loginWithKakao={loginWithKakao} signupWithKakao={signupWithKakao}
              returnTo={new URLSearchParams(window.location.search).get('returnTo') ?? '/'}
              onSuccess={() => { navigate(operatorInvitationReturnPath(), { replace: true }); }} />
            {googleError && (
              <p role="alert" className="mt-3 text-sm text-red-600">{googleError}</p>
            )}
          </section>
          <div className="my-5 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            또는
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <button type="button" className="min-h-11 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setEmailSignup(true)}>
            이메일(아이디)로 가입
          </button>
        </>
      )}
    </AuthCard>
  );
}

export function VerifyEmailPage() {
  const [, refreshContinuation] = useState(0);
  const verificationApi = useMemo(() => ({
    verifyEmail: async (token: string) => {
      const result = await authClient.verifyEmail(token);
      if (await recoverOperatorInvitationContinuation()) refreshContinuation(value => value + 1);
      return result;
    },
  }), []);
  const token = useOneTimeToken();
  const links = useAuthLinks();
  return (
    <AuthCard title="이메일 확인">
      <VerifyEmailView api={verificationApi} token={token} links={links} />
    </AuthCard>
  );
}

export function FindIdPage() {
  const links = useAuthLinks();
  return (
    <AuthCard title="아이디 찾기" subtitle="로그인 아이디는 가입한 이메일입니다">
      <FindLoginIdForm api={authClient} links={links} />
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const links = useAuthLinks();
  return (
    <AuthCard title="비밀번호 찾기">
      <ForgotPasswordForm api={authClient} links={links} />
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const token = useOneTimeToken();
  const links = useAuthLinks();
  return (
    <AuthCard title="새 비밀번호 설정">
      <ResetPasswordForm api={authClient} token={token} links={links} />
    </AuthCard>
  );
}
