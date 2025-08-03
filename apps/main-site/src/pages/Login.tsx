import { ChangeEvent, FC, FormEvent, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, state, isSSO } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 로그인 후 리다이렉트할 경로
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      
      // 로그인 성공
      const userName = state.user?.name || state.user?.email || '사용자';
      toast.success(`${userName}님, 로그인 성공! ${isSSO ? '🔐 SSO' : '🔑 레거시'}`);

      // 역할에 따라 리다이렉트
      if (state.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }

    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      
      // 에러 메시지 개선
      if (errorMessage.includes('Invalid credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (errorMessage.includes('Account not active')) {
        errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
      } else if (errorMessage.includes('Account is temporarily locked')) {
        errorMessage = '계정이 임시로 잠겼습니다. 잠시 후 다시 시도하세요.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* 로고 */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">🌿 Neture</h1>
          </Link>
          <p className="text-gray-600">로그인</p>
        </div>

        {/* SSO 시스템 안내 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <p className="text-blue-800 text-sm font-medium">새로운 SSO 인증 시스템</p>
          </div>
          <div className="text-blue-700 text-xs space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              토큰 자동 갱신으로 보안 강화
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              15분 Access Token + 7일 Refresh Token
            </div>
          </div>
        </motion.div>

        {/* 개발 환경 테스트 계정 안내 */}
        {import.meta.env.DEV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p className="text-yellow-800 text-sm font-medium mb-2">🔧 개발 환경 - 테스트 계정</p>
            <div className="text-yellow-700 text-xs space-y-1">
              <div>관리자: <code className="bg-yellow-100 px-1 rounded">admin@neture.co.kr</code> / <code className="bg-yellow-100 px-1 rounded">admin123!</code></div>
              <div>일반: <code className="bg-yellow-100 px-1 rounded">user@neture.co.kr</code> / <code className="bg-yellow-100 px-1 rounded">user123!</code></div>
              <div className="text-xs text-yellow-600 mt-1">💡 Phase 1에서 npm run create-admin으로 생성 가능</div>
            </div>
          </motion.div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="비밀번호를 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                로그인
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* 링크들 */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-4 text-sm">
            <Link
              to="/forgot-password"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              비밀번호 확인
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              to="/check-account"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              계정 확인
            </Link>
          </div>
          <p className="text-gray-600">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              회원가입
            </Link>
          </p>
          <Link
            to="/"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
