/**
 * Social Login Shortcodes
 * OAuth social login, email/password login
 *
 * R-5-2: Simplified login flow with AuthContext
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/contexts/AuthContext';

interface OAuthProvider {
  enabled: boolean;
  clientId: string;
  name: string;
}

interface OAuthProviders {
  google?: OAuthProvider;
  kakao?: OAuthProvider;
  naver?: OAuthProvider;
}

// Social Login Component (exported for use in pages)
export const SocialLoginComponent: React.FC<{
  redirectUrl?: string;
  showEmailLogin?: boolean;
  title?: string;
  subtitle?: string;
  providers?: string; // Comma-separated list: "google,naver,kakao"
  showSignupLink?: boolean; // Show signup link (default: true)
  signupUrl?: string; // Signup page URL (default: '/register')
  signupText?: string; // Signup prompt text (default: '계정이 없으신가요?')
  signupLinkText?: string; // Signup link text (default: '회원가입')
}> = ({
  redirectUrl = '/account',
  showEmailLogin = true,
  title = '로그인',
  subtitle = '계정에 접속하여 서비스를 이용하세요',
  providers,
  showSignupLink = true,
  signupUrl = '/register',
  signupText = '계정이 없으신가요?',
  signupLinkText = '회원가입'
}) => {
  // R-5-2: Use AuthContext for login
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  // Parse providers filter
  const allowedProviders = providers
    ? providers.split(',').map(p => p.trim() as 'google' | 'kakao' | 'naver')
    : null;

  // Social login configuration
  const socialLoginConfig = {
    google: {
      enabled: oauthProviders?.google?.enabled || false,
      name: 'Google로 로그인',
      icon: 'google',
      color: 'bg-white border border-gray-300',
      hoverColor: 'hover:bg-gray-50',
      textColor: 'text-gray-700'
    },
    kakao: {
      enabled: oauthProviders?.kakao?.enabled || false,
      name: '카카오로 로그인',
      icon: 'kakao',
      color: 'bg-[#FEE500]',
      hoverColor: 'hover:bg-[#FDDC00]',
      textColor: 'text-black'
    },
    naver: {
      enabled: oauthProviders?.naver?.enabled || false,
      name: '네이버로 로그인',
      icon: 'naver',
      color: 'bg-[#03C75A]',
      hoverColor: 'hover:bg-[#02B350]',
      textColor: 'text-white'
    }
  };

  // Fetch OAuth providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        console.log('[SocialLoginShortcode] 📡 OAuth 설정 가져오는 중...');
        const response = await authClient.api.get('/settings/oauth');

        console.log('[SocialLoginShortcode] 📥 OAuth 설정 응답:', response.data);

        if (response.data.success) {
          setOauthProviders(response.data.data);
          console.log('[SocialLoginShortcode] ✅ OAuth providers 설정됨:', response.data.data);
        }
      } catch (error) {
        console.error('[SocialLoginShortcode] ❌ OAuth providers 가져오기 실패:', error);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  /**
   * R-5-2: Simplified login handler
   * - Uses AuthContext.login() for state management
   * - Unified redirect logic: redirectUrl prop (from query param) → /account
   * - Standardized error messages
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SocialLoginShortcode] 📝 Form submit 시작:', formData);
    setLoading(true);
    setError('');

    try {
      console.log('[SocialLoginShortcode] 🔐 login 함수 호출 전');
      const success = await login(formData.email, formData.password);
      console.log('[SocialLoginShortcode] ✅ login 결과:', success);

      if (success) {
        // R-5-2: Unified redirect logic
        const targetUrl = redirectUrl || '/account';
        console.log('[SocialLoginShortcode] 🚀 리다이렉트:', targetUrl);
        navigate(targetUrl, { replace: true });
      }
    } catch (err: any) {
      console.error('[SocialLoginShortcode] ❌ 로그인 실패:', err);
      // R-5-2: Standardized error message
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
      console.log('[SocialLoginShortcode] ✅ Form submit 완료');
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    // R-3-2: Use authClient.api.defaults.baseURL safely
    const baseUrl = authClient.api.defaults.baseURL || '';

    // R-3-2: Add redirect parameter (unified to /account)
    const redirect = redirectUrl || '/account';
    const redirectParam = encodeURIComponent(redirect);

    // Build social login URL
    const socialLoginUrl = `${baseUrl}/social/${provider}?redirect=${redirectParam}`;

    console.log('[SocialLoginShortcode] 🔐 소셜 로그인 시작:', {
      provider,
      baseUrl,
      redirect,
      socialLoginUrl
    });

    // Navigate to social login endpoint
    window.location.href = socialLoginUrl;
  };

  const renderSocialIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'kakao':
        return (
          <div className="w-5 h-5 mr-3 bg-black rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
        );
      case 'naver':
        return (
          <div className="w-5 h-5 mr-3 font-bold text-white flex items-center justify-center">
            <span>N</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Filter providers based on enabled status AND allowedProviders prop
  const enabledProviders = Object.entries(socialLoginConfig).filter(
    ([provider, config]) => {
      const isEnabled = config.enabled;
      const isAllowed = allowedProviders ? allowedProviders.includes(provider as any) : true;
      return isEnabled && isAllowed;
    }
  );

  // Debug log for enabled providers
  useEffect(() => {
    console.log('[SocialLoginShortcode] 📋 활성화된 providers:', {
      allowedProviders,
      enabledProviders: enabledProviders.map(([name]) => name),
      oauthProviders,
      providersLoading
    });
  }, [oauthProviders, providersLoading]);

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Social Login Buttons */}
      {!providersLoading && enabledProviders.length > 0 && (
        <div className="mb-6">
          <div className="space-y-3">
            {enabledProviders.map(([provider, config]) => (
              <button
                key={provider}
                onClick={() => handleSocialLogin(provider as 'google' | 'kakao' | 'naver')}
                disabled={loading}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${config.color} ${config.hoverColor} ${config.textColor} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {renderSocialIcon(config.icon)}
                {config.name}
              </button>
            ))}
          </div>

          {showEmailLogin && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는 이메일로 로그인</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state for providers */}
      {providersLoading && (
        <div className="mb-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Email/Password Form */}
      {showEmailLogin && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 주소
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="이메일을 입력하세요"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  로그인
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer */}
      <div className="mt-6 text-center space-y-4">
        {/* Signup Link */}
        {showSignupLink && (
          <div className="text-sm text-gray-600">
            {signupText}{' '}
            <a
              href={signupUrl}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {signupLinkText}
            </a>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center justify-center text-blue-200">
          <Shield className="w-5 h-5 mr-2" />
          <span className="text-sm text-gray-500">안전하고 신뢰할 수 있는 로그인</span>
        </div>
      </div>
    </div>
  );
};

// OAuth Only Component (social buttons only)
const OAuthOnlyComponent: React.FC<{
  redirectUrl?: string;
  title?: string;
  providers?: string;
}> = ({
  redirectUrl = '/account',
  title = '소셜 로그인',
  providers
}) => {
  return (
    <SocialLoginComponent
      redirectUrl={redirectUrl}
      showEmailLogin={false}
      title={title}
      subtitle="소셜 계정으로 간편하게 로그인하세요"
      providers={providers}
    />
  );
};

// Auth shortcode definitions
export const socialLoginShortcode: ShortcodeDefinition = {
  name: 'social_login',
  description: '소셜 로그인 컴포넌트',
  attributes: {
    providers: {
      type: 'string',
      required: false,
      default: 'google,naver,kakao'
    },
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
    showEmailLogin: {
      type: 'boolean',
      required: false,
      default: true
    },
    showSignupLink: {
      type: 'boolean',
      required: false,
      default: true
    },
    signupUrl: {
      type: 'string',
      required: false,
      default: '/register'
    },
    signupText: {
      type: 'string',
      required: false,
      default: '계정이 없으신가요?'
    },
    signupLinkText: {
      type: 'string',
      required: false,
      default: '회원가입'
    }
  },
  component: ({ attributes }) => (
    <SocialLoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showEmailLogin={attributes.show_email_login !== false}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
      showSignupLink={attributes.show_signup_link !== false && attributes.showSignupLink !== false}
      signupUrl={attributes.signup_url as string || attributes.signupUrl as string}
      signupText={attributes.signup_text as string || attributes.signupText as string}
      signupLinkText={attributes.signup_link_text as string || attributes.signupLinkText as string}
    />
  )
};

export const loginFormShortcode: ShortcodeDefinition = {
  name: 'login_form',
  component: ({ attributes }) => (
    <SocialLoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showEmailLogin={attributes.show_email_login !== false}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
    />
  )
};

export const oauthLoginShortcode: ShortcodeDefinition = {
  name: 'oauth_login',
  component: ({ attributes }) => (
    <OAuthOnlyComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      title={attributes.title as string}
      providers={attributes.providers as string}
    />
  )
};

// Export shortcodes as array for auto-registration
export const authShortcodes: ShortcodeDefinition[] = [
  socialLoginShortcode,
  loginFormShortcode,
  oauthLoginShortcode
];

// Default export for auto-registration (SocialLoginShortcode.tsx → SocialLogin)
export default SocialLoginComponent;
