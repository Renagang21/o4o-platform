/**
 * 공통 Google 진입 1개소 — 로그인 페이지와 **작업 중 인증 요구** 두 곳이 같은 것을 쓴다.
 *
 * 병원약국은 자체 인증을 만들지 않는다: 버튼·동의·토큰 저장은 전부 `@o4o/auth-react` 의 `GoogleContinue`
 * (→ `@o4o/auth-client` GIS 로더 · `/auth/google/*`) 안에 있다. 이 파일이 하는 일은 배치와 문구뿐이다.
 *
 * `getConfig` 는 **모듈 상수**여야 한다 — 렌더마다 새 참조를 넘기면 동의 화면이 초기화된다(공통 계층 기존 결함).
 */
import { GoogleContinue } from '@o4o/auth-react';
import { authClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { PLATFORM_ORIGIN } from '../config/service';

const getGoogleAuthConfig = () => authClient.getGoogleAuthConfig();

export default function LoginPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { loginWithGoogle, signupWithGoogle } = useAuth();
  return (
    <>
      <GoogleContinue
        getConfig={getGoogleAuthConfig}
        loginWithGoogle={loginWithGoogle}
        signupWithGoogle={signupWithGoogle}
        onSuccess={() => onSuccess?.()}
        termsHref={`${PLATFORM_ORIGIN}/terms`}
        privacyHref={`${PLATFORM_ORIGIN}/privacy`}
      />
      <p className="muted">
        계정 · 약관은 <a href={PLATFORM_ORIGIN} target="_blank" rel="noopener noreferrer">Neture</a> 에서 통합 관리합니다.
        원내 자료는 로그인과 무관하게 이 브라우저에만 저장됩니다.
      </p>
    </>
  );
}
