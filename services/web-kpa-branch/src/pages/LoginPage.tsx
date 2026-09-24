/**
 * LoginPage — KPA Branch
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 "Google 로 계속하기" 하나다(미등록이면 약관 동의 → 가입).
 *   이메일/비밀번호 폼은 은퇴했다.
 *
 * serviceKey 는 config/service.ts 한 곳에서만 온다
 * (로그인 API 는 serviceKey 가 없으면 다른 축으로 검증돼 정상 계정도 401 이 된다).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type BranchUser } from '../contexts/AuthContext';
import { BRAND } from '../config/service';

/** 분회 서비스는 자체 약관/개인정보 화면이 없다 — 대표 도메인의 게시본으로 연결한다. */
const PLATFORM_TERMS_URL = 'https://neture.co.kr/terms';
const PLATFORM_PRIVACY_URL = 'https://neture.co.kr/privacy';

export default function LoginPage() {
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 로그인</h1>

      {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 로그인 진입은 이 버튼 하나다. */}
      <div className="mt-6">
        <GoogleContinue<BranchUser>
          getConfig={getGoogleAuthConfig}
          loginWithGoogle={loginWithGoogle}
          signupWithGoogle={signupWithGoogle}
          onSuccess={() => { setError(null); navigate('/me'); }}
          onStart={() => setError(null)}
          onError={(e) => setError(e.message)}
          termsHref={PLATFORM_TERMS_URL}
          privacyHref={PLATFORM_PRIVACY_URL}
        />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <p className="mt-6 text-sm text-gray-500">
        분회 서비스 이용은 승인이 필요합니다.{' '}
        <Link to="/join" className="font-medium text-primary-600 underline">
          가입 신청
        </Link>
      </p>
    </div>
  );
}
