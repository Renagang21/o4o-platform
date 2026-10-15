import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginCard, LoginLayout, LoginMethods } from '@o4o/auth-react';
import { BRAND, PLATFORM_ORIGIN, WORKSPACE_PATHS } from '../config/workspace';
import { authClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { readReturnTo } from '../lib/returnTo';

/**
 * 로그인 — 공통 <LoginMethods />(플랫폼 이메일 계정 + Google, serviceKey 없음). 새 인증 방식을 만들지 않는다.
 * 가입 · 아이디/비밀번호 찾기는 계정 센터(Neture) 정식 화면 — WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1.
 * Google authorized origin 에 이 앱의 origin 이 등록돼 있어야 Google 버튼이 동작한다(외부 콘솔 · 사용자 승인 항목).
 */
export default function LoginPage() {
  const { isAuthenticated, loginWithEmail, loginWithGoogle, signupWithGoogle, loginWithKakao, signupWithKakao } = useAuth();
  const navigate = useNavigate();
  // 원래 경로 보존(§21-14) — 같은 앱 경로만
  const next = readReturnTo(useLocation().search) ?? WORKSPACE_PATHS.home;
  if (isAuthenticated) return <Navigate to={next} replace />;
  return <LoginLayout tone="blue" brand={BRAND.name} headline={<>매장의 하루를,<br />한곳에서.</>} description="매장에 필요한 업무와 서비스를 O4O 계정으로 이어가세요.">
    <LoginCard tone="blue" brand={BRAND.name} title={`${BRAND.name} 로그인`} heading="h1" description="O4O 계정으로 내 매장 업무공간에 연결하세요.">
    <LoginMethods
      loginWithEmail={loginWithEmail}
      api={authClient}
      onSuccess={() => navigate(next, { replace: true })}
      kakao={{ client: authClient, loginWithKakao, signupWithKakao, returnTo: next }}
          google={{
              getSignupTerms: () => authClient.getSignupTerms(),
        getConfig: () => authClient.getGoogleAuthConfig(),
        loginWithGoogle,
        signupWithGoogle,
        termsHref: `${PLATFORM_ORIGIN}/terms`,
        privacyHref: `${PLATFORM_ORIGIN}/privacy`,
      }}
    />
    <p className="o4o-login-footnote">계정 · 약관은 <a href={PLATFORM_ORIGIN}>Neture</a>에서 통합 관리합니다.</p>
  </LoginCard></LoginLayout>;
}
