import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleContinue } from '@o4o/auth-react';
import { BRAND, PLATFORM_ORIGIN, WORKSPACE_PATHS } from '../config/workspace';
import { authClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { readReturnTo } from '../lib/returnTo';

/**
 * 로그인 — 기존 공통 Google Continue 경로 재사용(serviceKey 없음). 새 인증 방식을 만들지 않는다.
 * Google authorized origin 에 이 앱의 origin 이 등록돼 있어야 버튼이 동작한다(외부 콘솔 · 사용자 승인 항목).
 */
export default function LoginPage() {
  const { isAuthenticated, loginWithGoogle, signupWithGoogle } = useAuth();
  const navigate = useNavigate();
  // 원래 경로 보존(§21-14) — 같은 앱 경로만
  const next = readReturnTo(useLocation().search) ?? WORKSPACE_PATHS.home;
  if (isAuthenticated) return <Navigate to={next} replace />;
  return <main className="center-card"><section className="card">
    <h1>{BRAND.name} 로그인</h1>
    <p>O4O 계정(Google)으로 로그인하면 이 계정으로 접근할 수 있는 매장 업무공간이 열립니다.</p>
    <GoogleContinue
      getConfig={() => authClient.getGoogleAuthConfig()}
      loginWithGoogle={loginWithGoogle}
      signupWithGoogle={signupWithGoogle}
      onSuccess={() => navigate(next, { replace: true })}
      termsHref={`${PLATFORM_ORIGIN}/terms`}
      privacyHref={`${PLATFORM_ORIGIN}/privacy`}
    />
    <p className="muted">계정 · 약관은 <a href={PLATFORM_ORIGIN}>Neture</a>에서 통합 관리합니다.</p>
  </section></main>;
}
