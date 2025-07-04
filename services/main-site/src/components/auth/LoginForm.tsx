import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const COMMON_CORE_AUTH_URL = import.meta.env.VITE_COMMON_CORE_AUTH_URL || 'http://localhost:5000';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSocialLogin = (provider: 'google' | 'naver' | 'kakao') => {
    const returnUrl = window.location.origin + '/auth/callback';
    const state = btoa(JSON.stringify({ 
      service: 'o4o-platform',
      returnUrl: returnUrl
    }));
    
    window.location.href = `${COMMON_CORE_AUTH_URL}/auth/${provider}?state=${state}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-text-main">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            O4O 플랫폼에 오신 것을 환영합니다
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            소셜 로그인으로 간편하게 시작하세요 🚀
          </p>
          {location.state?.message && (
            <p className="mt-2 text-center text-sm text-success">
              {location.state.message}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {/* Google 로그인 */}
          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 로그인
          </button>

          {/* Naver 로그인 */}
          <button
            onClick={() => handleSocialLogin('naver')}
            className="w-full flex items-center justify-center px-4 py-3 border border-green-500 rounded-lg shadow-sm bg-green-500 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
          >
            <span className="w-5 h-5 mr-2 font-bold text-white">N</span>
            네이버로 로그인
          </button>

          {/* Kakao 로그인 */}
          <button
            onClick={() => handleSocialLogin('kakao')}
            className="w-full flex items-center justify-center px-4 py-3 border border-yellow-400 rounded-lg shadow-sm bg-yellow-400 text-sm font-medium text-gray-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.8 0 10.5 3.7 10.5 8.3 0 2.9-1.9 5.5-4.8 7.1l1.3 4.8c.1.4-.3.7-.6.4l-5.7-3.8c-.6.1-1.1.1-1.7.1-5.8 0-10.5-3.7-10.5-8.3S6.2 3 12 3z"/>
            </svg>
            카카오로 로그인
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">개인정보 보호가 강화된 인증 시스템</span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>🔒 이메일, 전화번호 등 개인정보를 저장하지 않습니다</p>
          <p>🛡 소셜 로그인으로 안전하게 이용하세요</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 