/**
 * Auth Shortcodes for Main Site
 * OAuth social login, find-id, find-password shortcodes
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Loader2, Mail, Key, CheckCircle, ArrowLeft, User, Lock, Building2, UserCircle2, Phone, MapPin, FileText } from 'lucide-react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { authClient } from '@o4o/auth-client';
import { getRedirectForRole } from '@/config/roleRedirects';

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
  showTestPanel?: string | boolean; // "env:dev", "true", "false"
  showSignupLink?: boolean; // Show signup link (default: true)
  signupUrl?: string; // Signup page URL (default: '/register')
  signupText?: string; // Signup prompt text (default: '계정이 없으신가요?')
  signupLinkText?: string; // Signup link text (default: '회원가입')
}> = ({
  redirectUrl = '/dashboard',
  showEmailLogin = true,
  title = '로그인',
  subtitle = '계정에 접속하여 서비스를 이용하세요',
  providers,
  showTestPanel,
  showSignupLink = true,
  signupUrl = '/register',
  signupText = '계정이 없으신가요?',
  signupLinkText = '회원가입'
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [testAccounts, setTestAccounts] = useState<Array<{role: string; email: string}>>([]);

  // Parse providers filter
  const allowedProviders = providers
    ? providers.split(',').map(p => p.trim() as 'google' | 'kakao' | 'naver')
    : null;

  // Determine if test panel should show
  const shouldShowTestPanel = (() => {
    if (showTestPanel === true || showTestPanel === 'true') return true;
    if (showTestPanel === false || showTestPanel === 'false') return false;
    if (showTestPanel === 'env:dev') {
      return import.meta.env.MODE === 'development' || import.meta.env.MODE === 'staging';
    }
    // Default: show in dev/staging only
    return import.meta.env.MODE === 'development' || import.meta.env.MODE === 'staging';
  })();

  // Prevent test panel in production (double guard)
  const showTestPanelSafe = shouldShowTestPanel && import.meta.env.MODE !== 'production';

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

  // Fetch OAuth providers and test accounts
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await authClient.api.get('/settings/oauth');

        if (response.data.success) {
          setOauthProviders(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
      } finally {
        setProvidersLoading(false);
      }
    };

    const fetchTestAccounts = async () => {
      if (!showTestPanelSafe) return;

      try {
        const response = await authClient.api.get('/auth/test-accounts');
        if (response.data.success) {
          setTestAccounts(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch test accounts:', error);
      }
    };

    fetchProviders();
    fetchTestAccounts();
  }, [showTestPanelSafe]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authClient.api.post('/auth/login', formData);

      if (response.data.success) {
        // Determine redirect based on user role
        const userRole = response.data.user?.role || response.data.user?.currentRole;
        const roleRedirect = userRole ? getRedirectForRole(userRole) : redirectUrl;

        // Redirect on success (prefer role-based redirect over custom redirect)
        window.location.href = roleRedirect;
      } else {
        setError(response.data.message || '로그인에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    const baseUrl = authClient.api.defaults.baseURL || '';
    window.location.href = `${baseUrl}/social/${provider}`;
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
                value={formData.password}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                placeholder="비밀번호를 입력하세요"
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

      {/* Test Account Panel (dev/staging only) */}
      {showTestPanelSafe && testAccounts.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="text-sm font-medium text-gray-700 mb-3">테스트 계정 (개발용)</div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="pb-2">역할</th>
                  <th className="pb-2">이메일</th>
                  <th className="pb-2 text-center">복사</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {testAccounts.map((account, index) => (
                  <tr key={index}>
                    <td className="py-1">{account.role}</td>
                    <td className="py-1 font-mono text-xs">{account.email}</td>
                    <td className="py-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ email: account.email, password: '' });
                          navigator.clipboard.writeText(account.email);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        복사
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-yellow-700 mt-2">
              ⚠️ 프로덕션 환경에서는 자동으로 숨겨집니다. 비밀번호는 보안상 표시되지 않습니다.
            </p>
          </div>
        </div>
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
}> = ({
  redirectUrl = '/dashboard',
  title = '소셜 로그인'
}) => {
  return (
    <SocialLoginComponent
      redirectUrl={redirectUrl}
      showEmailLogin={false}
      title={title}
      subtitle="소셜 계정으로 간편하게 로그인하세요"
    />
  );
};

// Auth shortcode definitions
export const socialLoginShortcode: ShortcodeDefinition = {
  name: 'social_login',
  component: ({ attributes }) => (
    <SocialLoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showEmailLogin={attributes.show_email_login !== false}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
      showTestPanel={attributes.showTestPanel as string | boolean}
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
      showTestPanel={attributes.showTestPanel as string | boolean}
    />
  )
};

export const oauthLoginShortcode: ShortcodeDefinition = {
  name: 'oauth_login',
  component: ({ attributes }) => (
    <OAuthOnlyComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      title={attributes.title as string}
    />
  )
};

// Find ID Component (exported for shortcode use)
export const FindIdComponent: React.FC<{
  title?: string;
  subtitle?: string;
  successMessage?: string;
  backUrl?: string;
}> = ({
  title = '아이디 찾기',
  subtitle = '가입 시 등록한 이메일 주소를 입력해주세요',
  successMessage = '입력하신 이메일로 아이디 정보를 발송했습니다.',
  backUrl = '/login'
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await authClient.api.post('/auth/find-id', { email });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || successMessage);
      } else {
        setStatus('error');
        setMessage(response.data.message || '아이디 찾기에 실패했습니다.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {status === 'success' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-4">{message}</p>
            <p className="text-xs text-gray-500">
              이메일을 확인하고 아이디를 찾아주세요.
            </p>
          </div>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하기
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{message}</span>
            </div>
          )}

          <div>
            <label htmlFor="find-id-email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소
            </label>
            <input
              id="find-id-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '아이디 찾기'
              )}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인으로 돌아가기
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-gray-500">
        <a href="/find-password" className="text-blue-600 hover:underline">
          비밀번호를 잊으셨나요?
        </a>
      </div>
    </div>
  );
};

// Find Password Component (exported for shortcode use)
export const FindPasswordComponent: React.FC<{
  title?: string;
  subtitle?: string;
  successMessage?: string;
  backUrl?: string;
}> = ({
  title = '비밀번호 찾기',
  subtitle = '가입 시 등록한 이메일 주소를 입력해주세요',
  successMessage = '비밀번호 재설정 링크를 이메일로 발송했습니다.',
  backUrl = '/login'
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await authClient.api.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || successMessage);
      } else {
        setStatus('error');
        setMessage(response.data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {status === 'success' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-4">{message}</p>
            <p className="text-xs text-gray-500">
              이메일을 확인하고 비밀번호 재설정 링크를 클릭해주세요.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              링크는 10분간 유효합니다.
            </p>
          </div>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하기
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{message}</span>
            </div>
          )}

          <div>
            <label htmlFor="find-password-email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소
            </label>
            <input
              id="find-password-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '비밀번호 재설정 링크 발송'
              )}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인으로 돌아가기
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-gray-500">
        <a href="/find-id" className="text-blue-600 hover:underline">
          아이디를 잊으셨나요?
        </a>
      </div>
    </div>
  );
};

// Find ID Shortcode
export const findIdShortcode: ShortcodeDefinition = {
  name: 'find_id',
  component: ({ attributes }) => (
    <FindIdComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      successMessage={attributes.success_message as string}
      backUrl={attributes.back_url as string || attributes.backUrl as string}
    />
  )
};

// Find Password Shortcode
export const findPasswordShortcode: ShortcodeDefinition = {
  name: 'find_password',
  component: ({ attributes }) => (
    <FindPasswordComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      successMessage={attributes.success_message as string}
      backUrl={attributes.back_url as string || attributes.backUrl as string}
    />
  )
};

// Signup Component (exported for shortcode use)
export const SignupComponent: React.FC<{
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
  showSocialSignup?: boolean;
  loginUrl?: string;
  loginText?: string;
  loginLinkText?: string;
}> = ({
  title = '회원가입',
  subtitle = '이메일로 가입하거나 소셜 계정으로 가입하세요',
  redirectUrl = '/',
  showSocialSignup = true,
  loginUrl = '/login',
  loginText = '이미 계정이 있으신가요?',
  loginLinkText = '로그인'
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    tos: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);

  // Fetch OAuth providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await authClient.api.get('/settings/oauth');
        if (response.data.success) {
          setOauthProviders(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
      }
    };
    fetchProviders();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다';
    }

    // Password confirmation
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // TOS validation
    if (!formData.tos) {
      newErrors.tos = '이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await authClient.api.post('/auth/signup', {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        name: formData.name || undefined,
        tos: true
      });

      if (response.data.success) {
        // Determine redirect based on user role
        const userRole = response.data.user?.role || response.data.user?.currentRole;
        const roleRedirect = userRole ? getRedirectForRole(userRole) : redirectUrl;

        // Redirect on success
        window.location.href = roleRedirect;
      } else {
        setErrors({ general: response.data.message || '회원가입에 실패했습니다.' });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorCode = errorData?.errorCode;
      const errorMessage = errorData?.message;

      if (errorCode === 'EMAIL_EXISTS') {
        setErrors({ email: '이미 사용 중인 이메일입니다' });
      } else if (errorCode === 'PASSWORD_MISMATCH') {
        setErrors({ passwordConfirm: '비밀번호가 일치하지 않습니다' });
      } else if (errorCode === 'TOS_NOT_ACCEPTED') {
        setErrors({ tos: '이용약관에 동의해주세요' });
      } else {
        setErrors({ general: errorMessage || '회원가입에 실패했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider: 'google' | 'kakao' | 'naver') => {
    const baseUrl = authClient.api.defaults.baseURL || '';
    window.location.href = `${baseUrl}/social/${provider}`;
  };

  const socialLoginConfig = {
    google: {
      enabled: oauthProviders?.google?.enabled || false,
      name: 'Google로 가입',
      color: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
    },
    kakao: {
      enabled: oauthProviders?.kakao?.enabled || false,
      name: '카카오로 가입',
      color: 'bg-[#FEE500] text-black hover:bg-[#FDDC00]'
    },
    naver: {
      enabled: oauthProviders?.naver?.enabled || false,
      name: '네이버로 가입',
      color: 'bg-[#03C75A] text-white hover:bg-[#02B350]'
    }
  };

  const enabledSocialProviders = Object.entries(socialLoginConfig).filter(
    ([_, config]) => config.enabled
  );

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{errors.general}</span>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일 주소 *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`block w-full pl-10 pr-3 py-2 border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Name (optional) */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름 (선택사항)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="홍길동"
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`block w-full pl-10 pr-10 py-2 border ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="비밀번호 (8자 이상)"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.password}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            대문자, 소문자, 숫자, 특수문자를 포함해야 합니다
          </p>
        </div>

        {/* Password Confirm */}
        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인 *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? 'text' : 'password'}
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
              className={`block w-full pl-10 pr-10 py-2 border ${
                errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="비밀번호 재입력"
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            >
              {showPasswordConfirm ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.passwordConfirm && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.passwordConfirm}
            </p>
          )}
        </div>

        {/* TOS */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.tos}
              onChange={(e) => setFormData({ ...formData, tos: e.target.checked })}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700">
              <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                이용약관
              </a>
              {' '}및{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                개인정보처리방침
              </a>
              에 동의합니다 *
            </span>
          </label>
          {errors.tos && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.tos}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              가입 처리 중...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              회원가입
            </>
          )}
        </button>
      </form>

      {/* Social Signup */}
      {showSocialSignup && enabledSocialProviders.length > 0 && (
        <>
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            {enabledSocialProviders.map(([provider, config]) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleSocialSignup(provider as 'google' | 'kakao' | 'naver')}
                className={`w-full py-2 px-4 border rounded-lg text-sm font-medium transition-colors ${config.color}`}
                disabled={loading}
              >
                {config.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Login Link */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {loginText}{' '}
        <a
          href={loginUrl}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {loginLinkText}
        </a>
      </div>
    </div>
  );
};

// Signup Shortcode
export const signupShortcode: ShortcodeDefinition = {
  name: 'signup',
  component: ({ attributes }) => (
    <SignupComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showSocialSignup={attributes.show_social_signup !== false && attributes.showSocialSignup !== false}
      loginUrl={attributes.login_url as string || attributes.loginUrl as string}
      loginText={attributes.login_text as string || attributes.loginText as string}
      loginLinkText={attributes.login_link_text as string || attributes.loginLinkText as string}
    />
  )
};

// Business Register Component (Multi-step registration for businesses)
export const BusinessRegisterComponent: React.FC<{
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
  loginUrl?: string;
  loginText?: string;
  loginLinkText?: string;
}> = ({
  title = '사업자 등록',
  subtitle = '사업자로 등록하여 서비스를 이용하세요',
  redirectUrl = '/',
  loginUrl = '/login',
  loginText = '이미 계정이 있으신가요?',
  loginLinkText = '로그인'
}) => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<'individual' | 'corporate' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: 로그인 정보
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    tos: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Step 3: 상세 정보 (개인)
  const [individualData, setIndividualData] = useState({
    name: '',
    phone: '',
    residentNumber: '', // 주민등록번호
    memo: ''
  });

  // Step 3: 상세 정보 (사업체)
  const [corporateData, setCorporateData] = useState({
    businessNumber: '', // 사업자 등록번호
    businessName: '', // 사업자명
    ceoName: '', // 대표자
    businessAddress: '', // 사업장 소재지
    businessPhone: '', // 사업자 전화번호
    taxEmail: '', // 세금계산서용 이메일
    managerName: '', // 담당자 이름
    managerPhone: '', // 담당자 전화번호
    managerEmail: '', // 담당자 이메일
    memo: ''
  });

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!authData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }

    // Password validation
    if (!authData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (authData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다';
    }

    // Password confirmation
    if (!authData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
    } else if (authData.password !== authData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // TOS validation
    if (!authData.tos) {
      newErrors.tos = '이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (businessType === 'individual') {
      if (!individualData.name) newErrors.name = '이름을 입력해주세요';
      if (!individualData.phone) newErrors.phone = '연락처를 입력해주세요';
      if (!individualData.residentNumber) newErrors.residentNumber = '주민등록번호를 입력해주세요';
    } else if (businessType === 'corporate') {
      if (!corporateData.businessNumber) newErrors.businessNumber = '사업자 등록번호를 입력해주세요';
      if (!corporateData.businessName) newErrors.businessName = '사업자명을 입력해주세요';
      if (!corporateData.ceoName) newErrors.ceoName = '대표자명을 입력해주세요';
      if (!corporateData.businessAddress) newErrors.businessAddress = '사업장 소재지를 입력해주세요';
      if (!corporateData.businessPhone) newErrors.businessPhone = '사업자 전화번호를 입력해주세요';
      if (!corporateData.taxEmail) newErrors.taxEmail = '세금계산서용 이메일을 입력해주세요';
      if (!corporateData.managerName) newErrors.managerName = '담당자 이름을 입력해주세요';
      if (!corporateData.managerPhone) newErrors.managerPhone = '담당자 전화번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    if (!businessType) {
      setErrors({ businessType: '사업자 유형을 선택해주세요' });
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare business info based on type
      let businessInfo: any = {
        type: businessType
      };

      if (businessType === 'individual') {
        businessInfo = {
          ...businessInfo,
          name: individualData.name,
          phone: individualData.phone,
          residentNumber: individualData.residentNumber,
          memo: individualData.memo
        };
      } else {
        businessInfo = {
          ...businessInfo,
          businessNumber: corporateData.businessNumber,
          businessName: corporateData.businessName,
          ceoName: corporateData.ceoName,
          businessAddress: corporateData.businessAddress,
          businessPhone: corporateData.businessPhone,
          taxEmail: corporateData.taxEmail,
          managerName: corporateData.managerName,
          managerPhone: corporateData.managerPhone,
          managerEmail: corporateData.managerEmail,
          memo: corporateData.memo
        };
      }

      // Submit registration
      const response = await authClient.api.post('/auth/signup', {
        email: authData.email,
        password: authData.password,
        passwordConfirm: authData.passwordConfirm,
        tos: true,
        businessInfo
      });

      if (response.data.success) {
        // Determine redirect based on user role
        const userRole = response.data.user?.role || response.data.user?.currentRole;
        const roleRedirect = userRole ? getRedirectForRole(userRole) : redirectUrl;

        // Redirect on success
        window.location.href = roleRedirect;
      } else {
        setErrors({ general: response.data.message || '등록에 실패했습니다.' });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMessage = errorData?.message;
      setErrors({ general: errorMessage || '등록에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-full h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  style={{ minWidth: '80px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>로그인 정보</span>
          <span>유형 선택</span>
          <span>상세 정보</span>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{errors.general}</span>
        </div>
      )}

      {/* Step 1: 로그인 정보 */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="your@email.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                className={`block w-full pl-10 pr-10 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="비밀번호 (8자 이상)"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Password Confirm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={authData.passwordConfirm}
                onChange={(e) => setAuthData({ ...authData, passwordConfirm: e.target.value })}
                className={`block w-full pl-10 pr-10 py-2 border ${
                  errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="비밀번호 재입력"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.passwordConfirm && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.passwordConfirm}
              </p>
            )}
          </div>

          {/* TOS */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={authData.tos}
                onChange={(e) => setAuthData({ ...authData, tos: e.target.checked })}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                  이용약관
                </a>
                {' '}및{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                  개인정보처리방침
                </a>
                에 동의합니다 *
              </span>
            </label>
            {errors.tos && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.tos}
              </p>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={handleStep1Next}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다음 단계
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Step 2: 유형 선택 */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              사업자 유형을 선택해주세요 *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setBusinessType('individual')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  businessType === 'individual'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <UserCircle2 className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <div className="font-semibold text-gray-900">개인</div>
                <div className="text-xs text-gray-500 mt-1">개인 사업자</div>
              </button>
              <button
                type="button"
                onClick={() => setBusinessType('corporate')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  businessType === 'corporate'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Building2 className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <div className="font-semibold text-gray-900">사업체</div>
                <div className="text-xs text-gray-500 mt-1">법인 사업자</div>
              </button>
            </div>
            {errors.businessType && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.businessType}
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleStep2Next}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다음 단계
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 상세 정보 - 개인 */}
      {step === 3 && businessType === 'individual' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
              <UserCircle2 className="h-5 w-5" />
              개인 사업자 정보
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 *
            </label>
            <input
              type="text"
              value={individualData.name}
              onChange={(e) => setIndividualData({ ...individualData, name: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="홍길동"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연락처 *
            </label>
            <input
              type="tel"
              value={individualData.phone}
              onChange={(e) => setIndividualData({ ...individualData, phone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="010-0000-0000"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Resident Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주민등록번호 *
            </label>
            <input
              type="text"
              value={individualData.residentNumber}
              onChange={(e) => setIndividualData({ ...individualData, residentNumber: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.residentNumber ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="000000-0000000"
            />
            {errors.residentNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.residentNumber}</p>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모 (선택사항)
            </label>
            <textarea
              value={individualData.memo}
              onChange={(e) => setIndividualData({ ...individualData, memo: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="추가 정보를 입력하세요"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  등록 완료
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 상세 정보 - 사업체 */}
      {step === 3 && businessType === 'corporate' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
              <Building2 className="h-5 w-5" />
              법인 사업자 정보
            </div>
          </div>

          {/* Business Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자 등록번호 *
            </label>
            <input
              type="text"
              value={corporateData.businessNumber}
              onChange={(e) => setCorporateData({ ...corporateData, businessNumber: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessNumber ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="000-00-00000"
            />
            {errors.businessNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.businessNumber}</p>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자명 *
            </label>
            <input
              type="text"
              value={corporateData.businessName}
              onChange={(e) => setCorporateData({ ...corporateData, businessName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="(주)회사명"
            />
            {errors.businessName && (
              <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
            )}
          </div>

          {/* CEO Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              대표자 *
            </label>
            <input
              type="text"
              value={corporateData.ceoName}
              onChange={(e) => setCorporateData({ ...corporateData, ceoName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.ceoName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="홍길동"
            />
            {errors.ceoName && (
              <p className="mt-1 text-sm text-red-600">{errors.ceoName}</p>
            )}
          </div>

          {/* Business Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업장 소재지 *
            </label>
            <input
              type="text"
              value={corporateData.businessAddress}
              onChange={(e) => setCorporateData({ ...corporateData, businessAddress: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessAddress ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="서울특별시 강남구 테헤란로 123"
            />
            {errors.businessAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
            )}
          </div>

          {/* Business Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자 전화번호 *
            </label>
            <input
              type="tel"
              value={corporateData.businessPhone}
              onChange={(e) => setCorporateData({ ...corporateData, businessPhone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessPhone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="02-0000-0000"
            />
            {errors.businessPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>
            )}
          </div>

          {/* Tax Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              세금계산서용 이메일 *
            </label>
            <input
              type="email"
              value={corporateData.taxEmail}
              onChange={(e) => setCorporateData({ ...corporateData, taxEmail: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.taxEmail ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="tax@company.com"
            />
            {errors.taxEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.taxEmail}</p>
            )}
          </div>

          {/* Manager Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 이름 *
            </label>
            <input
              type="text"
              value={corporateData.managerName}
              onChange={(e) => setCorporateData({ ...corporateData, managerName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.managerName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="김담당"
            />
            {errors.managerName && (
              <p className="mt-1 text-sm text-red-600">{errors.managerName}</p>
            )}
          </div>

          {/* Manager Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 전화번호 *
            </label>
            <input
              type="tel"
              value={corporateData.managerPhone}
              onChange={(e) => setCorporateData({ ...corporateData, managerPhone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.managerPhone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="010-0000-0000"
            />
            {errors.managerPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.managerPhone}</p>
            )}
          </div>

          {/* Manager Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 이메일 (선택사항)
            </label>
            <input
              type="email"
              value={corporateData.managerEmail}
              onChange={(e) => setCorporateData({ ...corporateData, managerEmail: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="manager@company.com"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모 (선택사항)
            </label>
            <textarea
              value={corporateData.memo}
              onChange={(e) => setCorporateData({ ...corporateData, memo: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="추가 정보를 입력하세요"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  등록 완료
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Login Link */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {loginText}{' '}
        <a
          href={loginUrl}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {loginLinkText}
        </a>
      </div>
    </div>
  );
};

// Business Register Shortcode
export const businessRegisterShortcode: ShortcodeDefinition = {
  name: 'business_register',
  component: ({ attributes }) => (
    <BusinessRegisterComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      loginUrl={attributes.login_url as string || attributes.loginUrl as string}
      loginText={attributes.login_text as string || attributes.loginText as string}
      loginLinkText={attributes.login_link_text as string || attributes.loginLinkText as string}
    />
  )
};

export const authShortcodes = [
  socialLoginShortcode,
  loginFormShortcode,
  oauthLoginShortcode,
  findIdShortcode,
  findPasswordShortcode,
  signupShortcode,
  businessRegisterShortcode
];