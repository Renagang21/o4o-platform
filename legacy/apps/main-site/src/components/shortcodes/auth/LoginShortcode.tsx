/**
 * Login Shortcode
 * Simple login shortcode with redirect and auth state guard
 *
 * Usage: [login]
 *        [login redirect_url="/dashboard"]
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { useAuth } from '@/contexts/AuthContext';
import { SocialLoginComponent } from './SocialLoginShortcode';
import { CheckCircle } from 'lucide-react';

// Login Component with auth state guard
export const LoginComponent: React.FC<{
  redirectUrl?: string;
  title?: string;
  subtitle?: string;
  providers?: string;
  showEmailLogin?: boolean;
  autoRedirect?: boolean; // Auto-redirect if already logged in (default: true)
}> = ({
  redirectUrl,
  title = '로그인',
  subtitle = '계정에 접속하여 서비스를 이용하세요',
  providers,
  showEmailLogin = true,
  autoRedirect = true
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or props or default
  const params = new URLSearchParams(location.search);
  const queryRedirect = params.get('redirect');
  const finalRedirectUrl = queryRedirect || redirectUrl || '/account';

  // Auto-redirect if already logged in (Option 1 from requirements)
  useEffect(() => {
    if (!authLoading && isAuthenticated && autoRedirect) {
      navigate(finalRedirectUrl, { replace: true });
    }
  }, [isAuthenticated, authLoading, autoRedirect, finalRedirectUrl, navigate]);

  // Loading state
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">로딩 중...</span>
        </div>
      </div>
    );
  }

  // Already logged in - show message (Option 2 from requirements)
  // This only shows if autoRedirect is false
  if (isAuthenticated && !autoRedirect) {
    return (
      <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-green-900 mb-2">
              이미 로그인되어 있습니다
            </h3>
            <p className="text-green-700 mb-4">
              계정 페이지로 이동하여 서비스를 이용하실 수 있습니다.
            </p>
            <button
              onClick={() => navigate(finalRedirectUrl)}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              계정 페이지로 가기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show login form
  return (
    <SocialLoginComponent
      redirectUrl={finalRedirectUrl}
      title={title}
      subtitle={subtitle}
      providers={providers}
      showEmailLogin={showEmailLogin}
      showSignupLink={true}
      signupUrl="/register"
    />
  );
};

// Login Shortcode Definition
export const loginShortcode: ShortcodeDefinition = {
  name: 'login',
  description: '로그인 컴포넌트 (인증 상태 가드 포함)',
  attributes: {
    redirectUrl: {
      type: 'string',
      required: false,
      default: '/account'
    },
    title: {
      type: 'string',
      required: false,
      default: '로그인'
    },
    subtitle: {
      type: 'string',
      required: false,
      default: '계정에 접속하여 서비스를 이용하세요'
    },
    providers: {
      type: 'string',
      required: false,
      default: 'google,naver,kakao'
    },
    showEmailLogin: {
      type: 'boolean',
      required: false,
      default: true
    },
    autoRedirect: {
      type: 'boolean',
      required: false,
      default: true
    }
  },
  component: ({ attributes }) => (
    <LoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
      showEmailLogin={attributes.show_email_login !== false && attributes.showEmailLogin !== false}
      autoRedirect={attributes.auto_redirect !== false && attributes.autoRedirect !== false}
    />
  )
};

// Default export
export default LoginComponent;
