import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth, type ServiceLoginCredentials } from '@/contexts/AuthContext';
import { Activity, AlertCircle, User, Key } from 'lucide-react';

/**
 * Service User Login Page
 *
 * Phase 2: Service User 인증 적용 (WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM)
 *
 * Service User는 Platform User와 완전히 분리된 인증 경로를 사용합니다.
 * - API: /api/v1/auth/service/login
 * - JWT: tokenType: 'service'
 * - serviceId: 'glycopharm' (고정)
 */

// OAuth Provider 타입
type OAuthProvider = 'google' | 'kakao' | 'naver';

// 테스트용 OAuth 프로필 (Phase 1)
// 실제 Phase 2에서는 OAuth 플로우로 대체됨
const TEST_PROFILES: Record<OAuthProvider, { id: string; email: string; displayName: string }> = {
  google: {
    id: 'google_test_user_001',
    email: 'test.user@gmail.com',
    displayName: 'Google 테스트 사용자',
  },
  kakao: {
    id: 'kakao_test_user_001',
    email: 'test.user@kakao.com',
    displayName: '카카오 테스트 사용자',
  },
  naver: {
    id: 'naver_test_user_001',
    email: 'test.user@naver.com',
    displayName: '네이버 테스트 사용자',
  },
};

export default function ServiceLoginPage() {
  const navigate = useNavigate();
  const { serviceUserLogin, isServiceUserAuthenticated } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미 Service User로 로그인된 경우 리다이렉트
  if (isServiceUserAuthenticated) {
    navigate('/service/dashboard');
    return null;
  }

  const handleProviderLogin = async (provider: OAuthProvider) => {
    setError('');
    setIsSubmitting(true);
    setSelectedProvider(provider);

    try {
      // Phase 1: JSON 프로필로 테스트 로그인
      // Phase 2에서는 실제 OAuth 플로우로 대체됨
      const testProfile = TEST_PROFILES[provider];

      const credentials: ServiceLoginCredentials = {
        provider,
        // Phase 1: OAuth 프로필을 JSON으로 전달 (테스트용)
        oauthToken: JSON.stringify({
          id: testProfile.id,
          email: testProfile.email,
          displayName: testProfile.displayName,
        }),
        serviceId: 'glycopharm', // Phase 2 Context 고정
      };

      await serviceUserLogin(credentials);

      // 로그인 성공 시 서비스 대시보드로 이동
      navigate('/service/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Service User 로그인에 실패했습니다.';
      setError(errorMessage);
      setIsSubmitting(false);
      setSelectedProvider(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">서비스 사용자 로그인</h1>
          <p className="text-slate-500 mt-2">GlycoPharm 서비스에 간편하게 접속하세요</p>
        </div>

        {/* Service Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Service ID 표시 */}
          <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <Key className="w-4 h-4" />
              <span className="text-sm font-medium">서비스: GlycoPharm</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              소셜 계정으로 로그인하면 GlycoPharm 서비스 전용 접근 권한을 받습니다.
            </p>
          </div>

          {/* OAuth Provider Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 mb-3">소셜 계정으로 로그인</p>

            {/* Google */}
            <button
              type="button"
              onClick={() => handleProviderLogin('google')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-medium text-slate-700">
                {isSubmitting && selectedProvider === 'google' ? '로그인 중...' : 'Google로 계속하기'}
              </span>
            </button>

            {/* Kakao */}
            <button
              type="button"
              onClick={() => handleProviderLogin('kakao')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] rounded-xl hover:bg-[#FDD800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#000000" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
              </svg>
              <span className="font-medium text-slate-900">
                {isSubmitting && selectedProvider === 'kakao' ? '로그인 중...' : '카카오로 계속하기'}
              </span>
            </button>

            {/* Naver */}
            <button
              type="button"
              onClick={() => handleProviderLogin('naver')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#03C75A] rounded-xl hover:bg-[#02B350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="w-5 h-5 flex items-center justify-center font-bold text-white text-sm">N</span>
              <span className="font-medium text-white">
                {isSubmitting && selectedProvider === 'naver' ? '로그인 중...' : '네이버로 계속하기'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">또는</span>
            </div>
          </div>

          {/* Platform Login Link */}
          <div className="text-center">
            <p className="text-sm text-slate-500">
              플랫폼 계정이 있으신가요?{' '}
              <NavLink to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                일반 로그인
              </NavLink>
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="text-xs text-slate-500">
              <p className="font-medium text-slate-600 mb-1">서비스 사용자 로그인이란?</p>
              <p>
                소셜 계정을 사용하여 GlycoPharm 서비스에 빠르게 접속할 수 있습니다.
                별도의 플랫폼 계정 등록 없이 서비스 기능을 이용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
