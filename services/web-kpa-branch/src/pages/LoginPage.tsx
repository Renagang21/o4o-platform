/**
 * LoginPage — KPA Branch
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 서비스별 비밀번호(service_credentials) 로그인은 은퇴했다.
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1:
 *   플랫폼 이메일 계정 + Google(공통 <LoginMethods />). 세션 서비스는 서버가 요청 Origin 으로 정한다.
 *   로그인 후 온 곳(state.from · `?returnTo`)으로 돌아가고, 없으면 /me.
 */
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginMethods } from '@o4o/auth-react';
import { useAuth, type BranchUser } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { BRAND } from '../config/service';

/** 분회 서비스는 자체 약관/개인정보 화면이 없다 — 대표 도메인의 게시본으로 연결한다. */
const PLATFORM_TERMS_URL = 'https://neture.co.kr/terms';
const PLATFORM_PRIVACY_URL = 'https://neture.co.kr/privacy';

/** 같은 앱 안의 경로만 허용한다(외부 · protocol-relative 차단). */
function safeReturnPath(raw: unknown): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/me';
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, loginWithEmail, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get('returnTo') ?? (location.state as { from?: string } | null)?.from);

  if (!isLoading && isAuthenticated) return <Navigate to={returnPath} replace />;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 로그인</h1>

      <div className="mt-6">
        <LoginMethods<BranchUser>
          loginWithEmail={loginWithEmail}
          api={authClient}
          onSuccess={() => navigate(returnPath, { replace: true })}
          google={{
            getConfig: getGoogleAuthConfig,
            loginWithGoogle,
            signupWithGoogle,
            termsHref: PLATFORM_TERMS_URL,
            privacyHref: PLATFORM_PRIVACY_URL,
          }}
        />
      </div>

      <p className="mt-6 text-sm text-gray-500">
        분회 서비스 이용은 승인이 필요합니다.{' '}
        <Link to="/join" className="font-medium text-primary-600 underline">
          가입 신청
        </Link>
      </p>
    </div>
  );
}
