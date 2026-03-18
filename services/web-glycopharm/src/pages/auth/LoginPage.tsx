/**
 * LoginPage — GlycoPharm 로그인
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 *
 * - type 쿼리 파라미터로 환자/약사 구분
 * - 아이디 기억하기 (localStorage)
 * - 아이디 찾기 / 비밀번호 찾기 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'glycopharm_remember_email';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const returnUrl = (location.state as any)?.from;
  const rawType = searchParams.get('type'); // 'patient' | 'pharmacy' | 'pharmacist' | 'operator' | null
  const loginType = (rawType === 'pharmacist' ? 'pharmacy' : rawType)
    || (location.pathname.startsWith('/admin') ? 'operator' : null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 이메일 복원
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email, password);

      // 아이디 기억하기
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // Post-login 라우팅
      if (returnUrl) {
        navigate(returnUrl);
      } else if (loginType === 'patient') {
        navigate('/patient');
      } else if (loginType === 'pharmacy') {
        navigate('/care/patients');
      } else if (loginType === 'operator') {
        navigate('/operator');
      } else {
        navigate(getPrimaryDashboardRoute(loggedInUser.roles ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setIsSubmitting(false);
    }
  };

  const subtitle = loginType === 'patient'
    ? '환자용 시스템 로그인'
    : loginType === 'pharmacy'
      ? '약국용 시스템 로그인'
      : loginType === 'operator'
        ? '운영자 로그인'
        : 'GlycoPharm에 오신 것을 환영합니다';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-white">
      <div className="w-full max-w-md">
        {/* 홈으로 돌아가기 */}
        <NavLink to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </NavLink>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">로그인</h1>
          <p className="text-slate-500 mt-2">{subtitle}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                아이디 (이메일)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">아이디 기억하기</span>
              </label>
              <div className="flex items-center gap-3 text-sm">
                <NavLink to="/forgot-password" className="text-slate-500 hover:text-slate-700">
                  아이디 찾기
                </NavLink>
                <span className="text-slate-300">|</span>
                <NavLink to="/forgot-password" className="text-slate-500 hover:text-slate-700">
                  비밀번호 찾기
                </NavLink>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-sm text-slate-500">
              계정이 없으신가요?{' '}
              <NavLink to="/register" className="text-blue-600 font-medium hover:text-blue-700">
                가입 신청
              </NavLink>
            </p>
          </div>

          {/* 테스트 계정 입력 보조 버튼 */}
          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <p className="text-center text-xs text-slate-400 mb-3">테스트 계정</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setEmail('patient_test@glycopharm.co.kr');
                  setPassword('O4oTestPass@1');
                  setError('');
                }}
                className="flex-1 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                테스트 환자
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setEmail('pharmacist_test@glycopharm.co.kr');
                  setPassword('O4oTestPass@1');
                  setError('');
                }}
                className="flex-1 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                테스트 약국
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
