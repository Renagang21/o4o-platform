/**
 * LoginPage - K-Cosmetics
 * WO-O4O-KCOS-AUTH-DESIGN-POLISH-V1: inline style → Tailwind, hex → theme, Card 적용
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 "Google 로 계속하기" 하나다. 이메일/비밀번호 · 비밀번호 찾기 · 별도 회원가입 화면은 은퇴했다.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type User } from '@/contexts/AuthContext';
import { Card } from '@o4o/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const returnUrl = (location.state as any)?.from;
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 차단은 일반 오류와 분리 표시
  const [isNotMember, setIsNotMember] = useState(false);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
      <Card className="w-full max-w-[400px] p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2 mt-0">로그인</h1>
        <p className="text-sm text-slate-500 mb-8 mt-0">K-Cosmetics에 오신 것을 환영합니다</p>

        {error && !isNotMember && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}
        {isNotMember && error && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4 text-left">
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 로그인 진입은 이 버튼 하나다(미등록이면 약관 동의 → 가입). */}
        <div className="mb-6 text-left">
          <GoogleContinue<User>
            getConfig={getGoogleAuthConfig}
            loginWithGoogle={loginWithGoogle}
            signupWithGoogle={signupWithGoogle}
            onSuccess={() => { setError(null); setIsNotMember(false); if (returnUrl) navigate(returnUrl); }}
            onStart={() => { setError(null); setIsNotMember(false); }}
            onError={({ message, code }) => {
              const notMember = code === 'SERVICE_NOT_MEMBER';
              setIsNotMember(notMember);
              setError(
                notMember
                  ? '이 계정은 K-Cosmetics 서비스 이용 권한이 없습니다. 이용 신청 후 승인되면 로그인할 수 있습니다.'
                  : message,
              );
            }}
            termsHref="/terms"
            privacyHref="/privacy"
          />
        </div>

        <p className="text-sm text-slate-500 mb-0">처음이신가요? 같은 버튼으로 약관 동의 후 계정이 만들어집니다.</p>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <Link to="/" className="text-sm font-medium text-primary no-underline hover:underline">홈으로 돌아가기</Link>
        </div>
      </Card>
    </div>
  );
}
