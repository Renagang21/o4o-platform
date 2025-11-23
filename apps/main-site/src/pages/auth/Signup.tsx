/**
 * Signup Page
 * Email signup page with OAuth options
 */

import { FC, useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cookieAuthClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';

const Signup: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [tos, setTos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Get redirect URL from query params or default to account page
  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get('redirect') || '/account';

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, authLoading, redirectUrl, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 이메일 검증
    if (!email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }

    // 비밀번호 검증
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      newErrors.password = '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다';
    }

    // 비밀번호 확인 검증
    if (!passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // 약관 동의 검증
    if (!tos) {
      newErrors.tos = '이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await cookieAuthClient.register({
        email,
        password,
        passwordConfirm,
        name: name || undefined,
        tos: true
      });

      const { user, redirectUrl: apiRedirectUrl } = response.data;

      // 쿠키에 토큰 자동 저장됨 (localStorage 불필요)
      // Set auth hint for future sessions
      localStorage.setItem('auth_session_hint', '1');

      toast.success('회원가입이 완료되었습니다!');

      // 리다이렉트 (우선순위: URL 파라미터 > API 응답 > 기본 경로)
      const targetUrl = redirectUrl || apiRedirectUrl || '/';
      setTimeout(() => {
        navigate(targetUrl, { replace: true });
      }, 500);
    } catch (error: any) {
      console.error('Signup error:', error);

      const errorData = error.response?.data;
      const errorCode = errorData?.errorCode;
      const errorMessage = errorData?.message;

      // 에러 메시지 한글화
      let displayMessage = '회원가입에 실패했습니다';

      if (errorCode === 'EMAIL_EXISTS') {
        displayMessage = '이미 사용 중인 이메일입니다';
        setErrors({ email: displayMessage });
      } else if (errorCode === 'PASSWORD_MISMATCH') {
        displayMessage = '비밀번호가 일치하지 않습니다';
        setErrors({ passwordConfirm: displayMessage });
      } else if (errorCode === 'TOS_NOT_ACCEPTED') {
        displayMessage = '이용약관에 동의해주세요';
        setErrors({ tos: displayMessage });
      } else if (errorCode === 'SIGNUP_DISABLED') {
        displayMessage = '현재 회원가입이 제한되어 있습니다';
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }

      toast.error(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            이메일로 가입하거나 소셜 계정으로 가입하세요
          </p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* 이름 (선택사항) */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="홍길동"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                  placeholder="비밀번호 (8자 이상)"
                  disabled={isLoading}
                />
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

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인 *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                  placeholder="비밀번호 재입력"
                  disabled={isLoading}
                />
              </div>
              {errors.passwordConfirm && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.passwordConfirm}
                </p>
              )}
            </div>

            {/* 약관 동의 */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tos}
                  onChange={(e) => setTos(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">
                  <Link to="/terms" className="text-blue-600 hover:text-blue-800 underline">
                    이용약관
                  </Link>
                  {' '}및{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                    개인정보처리방침
                  </Link>
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

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* R-3-2: 소셜 로그인 버튼들 - Inline SVG로 변경 */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={() => {
                // R-3-2: Use api.defaults.baseURL instead of getBaseUrl()
                const baseUrl = cookieAuthClient.api.defaults.baseURL || '';
                window.location.href = `${baseUrl}/social/google?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
            >
              {/* Google Icon - Inline SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 가입
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-[#03C75A] hover:bg-[#02B350] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors text-white"
              onClick={() => {
                // R-3-2: Use api.defaults.baseURL instead of getBaseUrl()
                const baseUrl = cookieAuthClient.api.defaults.baseURL || '';
                window.location.href = `${baseUrl}/social/naver?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
            >
              {/* Naver Icon - Text-based */}
              <div className="w-5 h-5 font-bold text-white flex items-center justify-center">
                <span>N</span>
              </div>
              네이버로 가입
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium bg-[#FEE500] hover:bg-[#FDDC00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors text-black"
              onClick={() => {
                // R-3-2: Use api.defaults.baseURL instead of getBaseUrl()
                const baseUrl = cookieAuthClient.api.defaults.baseURL || '';
                window.location.href = `${baseUrl}/social/kakao?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
            >
              {/* Kakao Icon - Text-based */}
              <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              카카오로 가입
            </button>
          </div>
        </div>

        {/* 로그인 링크 */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/auth/login"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
