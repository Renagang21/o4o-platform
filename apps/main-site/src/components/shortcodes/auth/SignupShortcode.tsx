/**
 * Signup Shortcode
 * User registration with email/password and optional social signup
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2, Mail, User, Lock, CheckCircle } from 'lucide-react';
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
