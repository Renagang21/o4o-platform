import { FC, FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';

const Login: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { login, isAuthenticated, isLoading, error, clearError, isAdmin } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 리다이렉트 URL 처리
  const redirectUrl = searchParams.get('redirect') || '/home';
  const fromLocation = (location.state as any)?.from || redirectUrl;

  // 이미 인증된 관리자는 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      toast.success('이미 로그인되어 있습니다.');
    }
  }, [isAuthenticated, isAdmin]);

  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to={fromLocation} replace />;
    } else {
      // 일반 사용자가 관리자 페이지에 접근하려는 경우
      return (
        <div className="min-h-screen bg-wp-bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-6 text-center text-3xl font-bold text-wp-text-primary">
                접근 권한 없음
              </h2>
              <p className="mt-2 text-center text-sm text-wp-text-secondary">
                관리자 권한이 필요합니다
              </p>
              <div className="mt-4">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-admin-blue hover:text-admin-blue-dark"
                >
                  메인 사이트로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await login({ email, password });
      
      toast.success('관리자 로그인 성공!');
    } catch (error: any) {
    // Error logging - use proper error handler
      
      // 구체적인 에러 메시지 표시
      let errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      
      if (errorMessage.includes('Invalid credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (errorMessage.includes('Account not active')) {
        errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
      } else if (errorMessage.includes('insufficient_role')) {
        errorMessage = '관리자 권한이 없습니다.';
      } else if (errorMessage.includes('Account is temporarily locked')) {
        errorMessage = '계정이 임시로 잠겼습니다. 잠시 후 다시 시도하세요.';
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        {/* 헤더 */}
        <div className="relative">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-center text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            O4O Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            관리자 계정으로 로그인하세요
          </p>
        </div>

        {/* SSO 시스템 안내 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-5 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-blue-800 text-sm font-semibold">새로운 SSO 인증 시스템</p>
          </div>
          <div className="text-blue-700 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">🔐</span>
              <span>관리자 전용 보안 강화</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">⚡</span>
              <span>자동 토큰 갱신 (15분 Access + 7일 Refresh)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">🛡️</span>
              <span>역할 기반 접근 제어</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-500">📊</span>
              <span>실시간 세션 모니터링</span>
            </div>
          </div>
        </div>

        {/* 테스트 계정 정보 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl p-5 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-amber-800 text-sm font-semibold">테스트 계정 정보</p>
          </div>
          <div className="text-amber-700 text-sm space-y-2">
            <div>
              <strong className="text-amber-900">관리자 계정:</strong>
              <div className="mt-1 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-xs border border-amber-100">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-amber-600" />
                  <span>admin@neture.co.kr</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>Test@1234</span>
                </div>
              </div>
            </div>
            <div>
              <strong className="text-amber-900">일반 관리자:</strong>
              <div className="mt-1 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-xs border border-amber-100">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-amber-600" />
                  <span>manager@neture.co.kr</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>Test@1234</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-amber-600 mt-2">
              ⚠️ 테스트 환경에서만 사용하세요
            </div>
          </div>
          
          {/* 빠른 로그인 버튼 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@neture.co.kr');
                setPassword('Test@1234');
              }}
              className="flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 font-medium"
            >
              <Shield className="h-3 w-3" />
              <span>관리자로 로그인</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('manager@neture.co.kr');
                setPassword('Test@1234');
              }}
              className="flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 font-medium"
            >
              <Shield className="h-3 w-3" />
              <span>일반 관리자로 로그인</span>
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="wp-notice-error">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 로그인 폼 */}
        <form className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100" onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* 이메일 입력 */}
            <div className="form-group">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">
                이메일 주소
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  className="login-input w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-sm"
                  placeholder="admin@neture.co.kr"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div className="form-group">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="login-input w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-sm"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 hover:bg-gray-100/50 rounded-r-lg transition-colors duration-200"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 옵션 */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e: any) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-3 text-sm text-gray-600">
                30일간 로그인 상태 유지
              </label>
            </div>

            <div className="text-sm">
              <Link 
                to="/forgot-password" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" />
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>관리자 로그인</span>
                </>
              )}
            </button>
          </div>

          {/* 추가 정보 */}
          <div className="text-center space-y-2">
            <p className="text-xs text-wp-text-secondary">
              관리자 계정이 필요하신가요?{' '}
              <a 
                href="mailto:admin@neture.co.kr?subject=관리자 계정 요청" 
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                문의하기
              </a>
            </p>
            
            <p className="text-xs text-wp-text-secondary">
              <a 
                href="/"
                className="hover:text-wp-text-primary"
              >
                메인 사이트로 돌아가기
              </a>
            </p>
          </div>
        </form>

        {/* 보안 정보 */}
        <div className="mt-8 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200/50 backdrop-blur-sm shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🔒</span>
            보안 안내
          </h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>세션은 8시간 후 자동 만료됩니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>비정상적인 접근 시 계정이 자동으로 잠길 수 있습니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>모든 관리자 활동은 로그로 기록됩니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>다른 기기에서 로그인 시 기존 세션이 종료됩니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;