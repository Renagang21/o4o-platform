/**
 * LoginPage — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 "Google 로 계속하기" 하나다. 이메일/비밀번호 폼 · 비밀번호 찾기는 은퇴했다.
 *
 * 공통 users 인증을 재사용하고 serviceKey='pharmacy-hub' 를 명시한다.
 * Pharmacy-Hub 미가입자는 backend 에서 401 SERVICE_NOT_MEMBER 로 차단된다
 * (다른 서비스 회원 자동 편입 없음).
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type PharmacyHubUser } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

export default function LoginPage() {
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1:
  //   guard 가 `state.from` 에 원래 가려던 경로를 담아 보낸다(4개 서비스 공통 계약).
  //   Pharmacy-Hub 만 이를 버리고 항상 '/' 로 보내고 있었다 → 복원 경로를 사용한다.
  const returnUrl = (useLocation().state as { from?: string } | null)?.from;

  /** 로그인 성공 후처리. */
  const finishLogin = (user: PharmacyHubUser | undefined) => {
    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-F:
    //   제한 로그인 계정(users.status=pending)은 가입 상태 확인 화면으로만 보낸다.
    //   상품·주문·콘텐츠 진입점은 노출하지 않는다.
    const accountAccess = (user as { accountAccess?: string } | undefined)?.accountAccess;
    if (accountAccess === 'restricted') {
      navigate('/join/status');
    } else {
      navigate(returnUrl || '/');
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 로그인</h1>
      <p className="mb-6 text-sm text-gray-500">{BRAND.nameKo}</p>

      {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 로그인 진입은 이 버튼 하나다(미등록이면 약관 동의 → 가입). */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5">
        <GoogleContinue<PharmacyHubUser>
          getConfig={getGoogleAuthConfig}
          loginWithGoogle={loginWithGoogle}
          signupWithGoogle={signupWithGoogle}
          onSuccess={({ user }) => { setError(null); finishLogin(user); }}
          onStart={() => setError(null)}
          onError={(e) => setError(e.message)}
          termsHref="/terms"
          privacyHref="/privacy"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
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
