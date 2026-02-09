/**
 * Pharmacy Service Login Page
 *
 * Phase 2-b: WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY
 *
 * Service User login for KPA Pharmacy service.
 * Completely separate from Platform User (member) login.
 *
 * Key differences from Platform login:
 * - Uses /api/v1/auth/service/login
 * - Returns Service JWT (tokenType: 'service')
 * - Does NOT create Platform User records
 * - Cannot access Admin/Operator APIs
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, type ServiceLoginCredentials } from '../../contexts/AuthContext';

// Fixed serviceId for KPA Pharmacy
const SERVICE_ID = 'kpa-pharmacy';

export function ServiceLoginPage() {
  const navigate = useNavigate();
  const { serviceUserLogin, isServiceUserAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isServiceUserAuthenticated) {
    navigate('/pharmacy/service/dashboard', { replace: true });
    return null;
  }

  /**
   * Phase 1 테스트용: OAuth 프로필을 JSON으로 인코딩하여 전송
   * 실제 OAuth 연동은 Phase 3에서 구현
   */
  const handleTestLogin = async (provider: 'google' | 'kakao' | 'naver') => {
    setIsLoading(true);
    setError(null);

    try {
      // Phase 1: Mock OAuth profile (JSON encoded)
      const mockProfile = {
        id: `${provider}_test_user_${Date.now()}`,
        email: `test.${provider}@example.com`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} 테스트 사용자`,
        picture: null,
      };

      const credentials: ServiceLoginCredentials = {
        provider,
        oauthToken: JSON.stringify(mockProfile),
        serviceId: SERVICE_ID,
      };

      await serviceUserLogin(credentials);
      navigate('/pharmacy/service/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            약국 서비스 로그인
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            소셜 계정으로 약국 서비스에 로그인하세요
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Important Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  약국 서비스 전용 로그인
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  이 로그인은 약국 서비스 전용입니다.
                  약사회 회원 로그인은 <Link to="/login" className="font-medium underline">여기</Link>를 이용하세요.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Login */}
            <button
              onClick={() => handleTestLogin('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 계속하기
            </button>

            {/* Kakao Login */}
            <button
              onClick={() => handleTestLogin('kakao')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-gray-900 bg-[#FEE500] hover:bg-[#FDD835] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#000000"
                  d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"
                />
              </svg>
              카카오로 계속하기
            </button>

            {/* Naver Login */}
            <button
              onClick={() => handleTestLogin('naver')}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-[#03C75A] hover:bg-[#02B350] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#FFFFFF"
                  d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"
                />
              </svg>
              네이버로 계속하기
            </button>
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Phase 1 테스트 모드
                </span>
              </div>
            </div>
          </div>

          {/* Phase Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              현재 Phase 1 테스트 모드입니다.<br />
              실제 OAuth 연동 없이 테스트 프로필로 로그인됩니다.
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              to="/pharmacy"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              약국 경영지원 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Service ID: {SERVICE_ID} | Token Type: service
        </p>
      </div>
    </div>
  );
}

export default ServiceLoginPage;
