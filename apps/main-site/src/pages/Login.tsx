import { FC, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowRight, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authProviderService } from '../services/authProviderService';
import { OAuthProviders, SocialLoginConfig } from '../types/auth';
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
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  // 로그인 후 리다이렉트할 경로
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  // OAuth 제공자 설정
  const socialLoginConfig: SocialLoginConfig = {
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

  // OAuth 제공자 정보 가져오기
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await authProviderService.getEnabledProviders();
        setOauthProviders(response.providers);
      } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      
      const userName = state.user?.name || state.user?.email || '사용자';
      toast.success(`${userName}님, 로그인 성공! ${isSSO ? '🔐 SSO' : '🔑 레거시'}`);

      if (state.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    window.location.href = `${API_BASE_URL}/v1/auth/${provider}`;
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

  const enabledProviders = Object.entries(socialLoginConfig).filter(
    ([_, config]) => config.enabled
  );

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-6">O4O Platform</h1>
            <p className="text-xl mb-8 leading-relaxed">
              차세대 전자상거래 플랫폼으로<br />
              비즈니스의 성장을 가속화하세요
            </p>
            <div className="flex items-center text-blue-200">
              <Shield className="w-5 h-5 mr-2" />
              <span>안전하고 신뢰할 수 있는 로그인</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">로그인</h2>
              <p className="mt-2 text-sm text-gray-600">
                계정에 접속하여 서비스를 이용하세요
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </motion.div>
            )}

            {/* Social Login Buttons */}
            {!providersLoading && enabledProviders.length > 0 && (
              <div className="mb-6">
                <div className="space-y-3">
                  {enabledProviders.map(([provider, config]) => (
                    <motion.button
                      key={provider}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSocialLogin(provider as 'google' | 'kakao' | 'naver')}
                      disabled={loading}
                      className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${config.color} ${config.hoverColor} ${config.textColor} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {renderSocialIcon(config.icon)}
                      {config.name}
                    </motion.button>
                  ))}
                </div>

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
              </div>
            )}

            {/* Loading state for providers */}
            {providersLoading && (
              <div className="mb-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {/* Email/Password Form */}
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

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
              </div>

              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              </div>
            </form>

            <div className="mt-6">
              <div className="text-center">
                <span className="text-sm text-gray-600">
                  아직 계정이 없으신가요?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    회원가입
                  </Link>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;