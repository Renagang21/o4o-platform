/**
 * LoginModal - GlycoPharm 로그인 모달
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 *
 * 중앙화된 로그인 모달 컴포넌트
 * - 이메일/비밀번호 로그인
 * - 로그인 성공 시 현재 페이지 유지
 * - 비밀번호 찾기/회원가입 링크 제공
 *
 * 표준 기능:
 * - 이메일/비밀번호 입력
 * - 비밀번호 보기/숨기기 토글
 * - 이메일 저장 (Remember Me)
 * - 비밀번호 찾기 링크
 * - 회원가입 링크
 */

import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { getDefaultRouteByRole } from '@/lib/auth-utils';

const REMEMBER_EMAIL_KEY = 'glycopharm_remember_email';

export default function LoginModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isLoginModalOpen, closeLoginModal, onLoginSuccess } = useLoginModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email, password);

      // 이메일 저장 처리
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // 로그인 성공
      setEmail('');
      setPassword('');
      closeLoginModal();

      // WO-GLYCOPHARM-ROLE-BASED-LANDING-V1: 홈(/) 또는 /login에서 로그인한 경우 역할 기반 이동
      if (location.pathname === '/' || location.pathname === '/login') {
        navigate(getDefaultRouteByRole(loggedInUser.role));
      }

      onLoginSuccess?.();
    } catch (err: any) {
      setError(err.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    closeLoginModal();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">로그인</h2>
              <p className="text-xs text-slate-500">GlycoPharm</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="example@email.com"
                autoComplete="email"
                required
                autoFocus
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
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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

          {/* 이메일 저장 체크박스 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberEmail"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="rememberEmail" className="ml-2 text-sm text-slate-600">
              이메일 저장
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
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

        {/* Footer Links */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              to="/forgot-password"
              className="text-slate-500 hover:text-primary-600 transition-colors"
              onClick={handleClose}
            >
              비밀번호 찾기
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/register"
              className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
              onClick={handleClose}
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
