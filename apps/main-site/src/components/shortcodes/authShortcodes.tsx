/**
 * Auth Shortcodes for Main Site
 * OAuth social login, find-id, find-password shortcodes
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Loader2, Mail, Key, CheckCircle, ArrowLeft } from 'lucide-react';
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
}> = ({
  redirectUrl = '/dashboard',
  showEmailLogin = true,
  title = '로그인',
  subtitle = '계정에 접속하여 서비스를 이용하세요',
  providers,
  showTestPanel
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
      <div className="mt-6 text-center">
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

export const authShortcodes = [
  socialLoginShortcode,
  loginFormShortcode,
  oauthLoginShortcode,
  findIdShortcode,
  findPasswordShortcode
];