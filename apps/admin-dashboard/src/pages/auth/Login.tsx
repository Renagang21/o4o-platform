import { useState, useEffect, FC } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await login({ email, password });
      
      toast.success('관리자 로그인 성공!');
    } catch (error) {
      console.error('Admin login failed:', error);
      
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
    <div className="min-h-screen bg-wp-bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div>
          <div className="mx-auto h-16 w-16 bg-admin-blue rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-wp-text-primary">
            O4O Admin
          </h2>
          <p className="mt-2 text-center text-sm text-wp-text-secondary">
            관리자 계정으로 로그인하세요
          </p>
        </div>

        {/* SSO 시스템 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <p className="text-blue-800 text-sm font-medium">새로운 SSO 인증 시스템</p>
          </div>
          <div className="text-blue-700 text-xs space-y-1">
            <div>🔐 관리자 전용 보안 강화</div>
            <div>⚡ 자동 토큰 갱신 (15분 Access + 7일 Refresh)</div>
            <div>🛡️ 역할 기반 접근 제어</div>
            <div>📊 실시간 세션 모니터링</div>
          </div>
        </div>

        {/* 프로덕션 환경에서는 테스트 계정 정보 숨김 */}

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
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-wp-text-primary mb-1">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-wp-text-secondary" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  className="wp-input pl-10"
                  placeholder="admin@neture.co.kr"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-wp-text-primary mb-1">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-wp-text-secondary" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="wp-input pl-10 pr-10"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-wp-text-secondary hover:text-wp-text-primary"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 옵션 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e: any) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-admin-blue focus:ring-admin-blue border border-gray-200 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-wp-text-primary">
                30일간 로그인 상태 유지
              </label>
            </div>

            <div className="text-sm">
              <a 
                href="mailto:admin@neture.co.kr?subject=비밀번호 재설정 요청" 
                className="font-medium text-admin-blue hover:text-admin-blue-dark"
              >
                비밀번호를 잊으셨나요?
              </a>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="loading-spinner" />
                  <span>로그인 중...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>관리자 로그인</span>
                </div>
              )}
            </button>
          </div>

          {/* 추가 정보 */}
          <div className="text-center space-y-2">
            <p className="text-xs text-wp-text-secondary">
              관리자 계정이 필요하신가요?{' '}
              <a 
                href="mailto:admin@neture.co.kr?subject=관리자 계정 요청" 
                className="font-medium text-admin-blue hover:text-admin-blue-dark"
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
        <div className="mt-8 p-4 bg-wp-bg-tertiary rounded-lg border">
          <h3 className="text-sm font-medium text-wp-text-primary mb-2">🔒 보안 안내</h3>
          <ul className="text-xs text-wp-text-secondary space-y-1">
            <li>• 세션은 8시간 후 자동 만료됩니다</li>
            <li>• 비정상적인 접근 시 계정이 자동으로 잠길 수 있습니다</li>
            <li>• 모든 관리자 활동은 로그로 기록됩니다</li>
            <li>• 다른 기기에서 로그인 시 기존 세션이 종료됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;