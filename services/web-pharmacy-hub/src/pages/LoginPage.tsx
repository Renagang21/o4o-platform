/**
 * LoginPage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 서비스별 비밀번호(service_credentials) 로그인은 은퇴했다.
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1:
 *   플랫폼 이메일 계정 + Google(공통 <LoginMethods />). 세션 서비스는 서버가 요청 Origin 으로 정한다.
 *   서비스 가입 여부는 로그인 뒤 가입 신청 · 상태 화면이 판정한다(다른 서비스 회원 자동 편입 없음).
 *   오류는 각 폼이 표시한다. 이미 로그인했으면 목적지로 바로 이동.
 */

import { Navigate, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { LoginMethods } from '@o4o/auth-react';
import { useAuth, type PharmacyHubUser } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { BRAND } from '../config/service';

export default function LoginPage() {
  const { user: currentUser, isAuthenticated, isLoading, loginWithEmail, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   guard 가 `state.from` 에 원래 가려던 경로를 담아 보낸다(4개 서비스 공통 계약).
  //   Pharmacy-Hub 만 이를 버리고 항상 '/' 로 보내고 있었다 → 복원 경로를 사용한다.
  const rawReturn = searchParams.get('returnTo') ?? (location.state as { from?: string } | null)?.from;
  const returnUrl = rawReturn && rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : null;

  /** 로그인 후 목적지. */
  const destinationFor = (user: PharmacyHubUser | null | undefined) => {
    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-F:
    //   제한 로그인 계정(users.status=pending)은 가입 상태 확인 화면으로만 보낸다.
    //   상품·주문·콘텐츠 진입점은 노출하지 않는다.
    const accountAccess = (user as { accountAccess?: string } | undefined)?.accountAccess;
    return accountAccess === 'restricted' ? '/join/status' : returnUrl || '/';
  };

  if (!isLoading && isAuthenticated) return <Navigate to={destinationFor(currentUser)} replace />;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 로그인</h1>
      <p className="mb-6 text-sm text-gray-500">{BRAND.nameKo}</p>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5">
        <LoginMethods<PharmacyHubUser>
          loginWithEmail={loginWithEmail}
          api={authClient}
          onSuccess={(user) => navigate(destinationFor(user))}
          google={{
            getConfig: getGoogleAuthConfig,
            loginWithGoogle,
            signupWithGoogle,
            termsHref: '/terms',
            privacyHref: '/privacy',
          }}
        />
      </div>

      <p className="mt-2 text-center text-sm">
        <Link to="/join" className="text-primary-600 underline">
          가입 신청
        </Link>
        {' · '}
        <Link to="/join/status" className="text-primary-600 underline">
          신청 상태 확인
        </Link>
        {' · '}
        <Link to="/" className="text-gray-500 underline">
          처음으로
        </Link>
      </p>
    </div>
  );
}
