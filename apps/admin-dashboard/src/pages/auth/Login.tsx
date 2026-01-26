import { FC, FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertTriangle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto space-y-6 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>
        {/* 헤더 */}
        <div className="relative text-center">
          <div className="inline-flex h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl items-center justify-center shadow-lg mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            O4O Admin
          </h2>
          <p className="mt-2 text-sm text-blue-200">
            관리자 계정으로 로그인하세요
          </p>
          <p className="mt-1 text-xs text-green-400 font-bold">
            ✅ 배포 테스트 v3.0 - {new Date().toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 로그인 폼 */}
        <form className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                이메일 주소
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white/90 border border-gray-300 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                  placeholder="admin@neture.co.kr"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-white/90 border border-gray-300 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-600 hover:text-gray-900 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-600 hover:text-gray-900 transition-colors" />
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
                className="h-4 w-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-blue-200">
                로그인 상태 유지
              </label>
            </div>

            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-300 hover:text-white transition-colors"
            >
              비밀번호 찾기
            </Link>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 px-4 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 테스트 계정 정보 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-300 mb-3 font-medium">로그인 계정</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@neture.co.kr');
                setPassword('TestPassword');
              }}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors border border-white/10"
            >
              Super Admin
            </button>
          </div>
          <div className="mt-3 text-xs text-blue-200/60 space-y-1">
            <div>📧 admin@neture.co.kr / TestPassword</div>
          </div>
        </div>

        {/* 하단 링크 */}
        <div className="text-center">
          <a 
            href="/"
            className="text-sm text-blue-300 hover:text-white transition-colors"
          >
            메인 사이트로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;