/**
 * LoginPage — GlycoPharm 로그인
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 *
 * - type 쿼리 파라미터로 당뇨인/약사 구분
 * - 아이디 기억하기 (localStorage)
 * - 아이디 찾기 / 비밀번호 찾기 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'glycopharm_remember_email';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const returnUrl = (location.state as any)?.from;
  // WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1:
  //   query param `?type=pharmacist` / `?type=pharmacy` 모두 약사 로그인으로 normalize.
  //   내부 표준은 'pharmacy' (loginType용), 실제 role은 glycopharm:pharmacist.
  // WO-O4O-GLYCO-CARE-BACKEND-CLEANUP-V1: 'patient' 쿼리 type 미사용 (RegisterPage 에서 patient 옵션 제거).
  // back-compat 호환을 위해 query param 자체 처리는 유지 — 외부 링크가 ?type=patient 로 진입해도 정상 동작.
  const rawType = searchParams.get('type'); // 'pharmacy' | 'pharmacist' (legacy) | 'operator' | null  (※ 'patient' 는 deprecated)
  const loginType = (rawType === 'pharmacist' ? 'pharmacy' : rawType)
    || (location.pathname.startsWith('/admin') ? 'operator' : null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 차단을 비밀번호 오류와 분리 표시
  const [isNotMember, setIsNotMember] = useState(false);
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
    setIsNotMember(false);
    setIsSubmitting(true);

    try {
      await login(email, password);

      // 아이디 기억하기
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // Post-login 라우팅
      // loginType override / returnUrl만 LoginPage에서 처리.
      // WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 일반 역할 redirect는 App.tsx PostLoginRedirect 담당.
      if (returnUrl) {
        navigate(returnUrl);
      } else if (loginType === 'pharmacy') {
        navigate('/store/hub');
      } else if (loginType === 'operator') {
        navigate('/operator');
      }
    } catch (err: any) {
      // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
      //   AuthContext 가 Error.code 로 SERVICE_NOT_MEMBER 를 전달한다.
      if (err?.code === 'SERVICE_NOT_MEMBER') {
        setIsNotMember(true);
        setError('이 계정은 GlycoPharm 서비스 이용 권한이 없습니다. 서비스 가입 또는 이용 신청 후 로그인할 수 있습니다.');
      } else {
        setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      }
      setIsSubmitting(false);
    }
  };

  const subtitle = loginType === 'pharmacy'
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
            {error && !isNotMember && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {/* WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내 + 가입 링크 */}
            {isNotMember && error && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2 text-amber-800 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <NavLink
                  to="/register"
                  className="block w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 text-center transition-colors"
                >
                  GlycoPharm 가입 신청하기
                </NavLink>
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
        </div>
      </div>
    </div>
  );
}
