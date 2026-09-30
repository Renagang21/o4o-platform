/**
 * 이메일·비밀번호 인증 페이지 — WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 *   /signup            이메일 회원가입 → 확인 메일 안내(재발송 · 로그인 링크)
 *   /verify-email      메일 링크 토큰으로 이메일 확인
 *   /find-id           이름 + 휴대전화 → 가린 이메일 힌트
 *   /forgot-password   비밀번호 재설정 메일
 *   /reset-password    새 비밀번호 설정
 *
 * 화면 본체는 전부 @o4o/auth-react 공통 컴포넌트다. 이 파일은 카드 레이아웃 · 라우팅 연결만 한다.
 * 로그인은 기존 로그인 모달(`/login` → 모달)을 쓴다. 이미 로그인한 사용자는 가입 화면 대신 홈으로 보낸다.
 * 메일 링크의 1회용 토큰은 읽은 즉시 주소창에서 지운다(기록 · Referer 로 남지 않게).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  EmailSignupForm,
  VerifyEmailView,
  FindLoginIdForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  type EmailAuthLinks,
} from '@o4o/auth-react';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '../../lib/apiClient';

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="text-2xl" aria-hidden>🌿</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function useAuthLinks(): EmailAuthLinks {
  const navigate = useNavigate();
  return {
    login: '/login',
    signup: '/signup',
    findId: '/find-id',
    forgotPassword: '/forgot-password',
    onNavigate: (href) => navigate(href),
  };
}

/** 쿼리의 token 을 한 번 읽고 주소창에서 지운다. */
function useOneTimeToken(): string | null {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', location.pathname);
  }, [token, location.pathname]);
  return token;
}

export function SignupPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const links = useAuthLinks();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <AuthCard title="이메일로 회원가입" subtitle="Google 계정 없이 이메일로 가입합니다">
      <EmailSignupForm api={authClient} links={links} termsHref="/terms" privacyHref="/privacy" />
    </AuthCard>
  );
}

export function VerifyEmailPage() {
  const token = useOneTimeToken();
  const links = useAuthLinks();
  return (
    <AuthCard title="이메일 확인">
      <VerifyEmailView api={authClient} token={token} links={links} />
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
