/**
 * LoginModal - 로그인 오버레이 모달
 * 현재 페이지 위에 오버레이로 표시되어 메뉴 등이 보임
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1: 비밀번호 찾기/회원가입 링크 포함
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-AUTH-PASSWORD-SYNC-V1: 비밀번호 동기화 (Password Sync)
 *
 * 표준 기능:
 * - 이메일/비밀번호 입력
 * - 비밀번호 보기/숨기기 토글
 * - 이메일 저장 (Remember Me)
 * - 비밀번호 찾기 링크
 * - 회원가입 링크
 * - 비밀번호 동기화 (PASSWORD_MISMATCH 시)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth, ROUTE_OVERRIDES, useLoginModal } from '../contexts';
import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

const REMEMBER_EMAIL_KEY = 'neture_remember_email';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export default function LoginModal({ isOpen, onClose, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const { login, passwordSync } = useAuth();
  const { openRegisterModal } = useLoginModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Password sync state
  const [syncMode, setSyncMode] = useState(false);
  const [syncToken, setSyncToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1: 전체 roles 기반 대시보드 결정
  const handleLoginSuccess = (role?: string, roles?: string[]) => {
    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    onClose();
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      const dashboardPath = (roles && roles.length > 0)
        ? getPrimaryDashboardRoute(roles, ROUTE_OVERRIDES)
        : role
          ? getPrimaryDashboardRoute([role], ROUTE_OVERRIDES)
          : '/';
      navigate(dashboardPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        if (result.passwordSyncAvailable && result.syncToken) {
          setSyncMode(true);
          setSyncToken(result.syncToken);
          setError('비밀번호가 일치하지 않습니다. 새 비밀번호를 설정해주세요.');
          setLoading(false);
          return;
        }
        throw new Error(result.error || '로그인에 실패했습니다.');
      }

      handleLoginSuccess(result.role, result.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await passwordSync(email, syncToken, newPassword);
      if (!result.success) {
        throw new Error(result.error || '비밀번호 변경에 실패했습니다.');
      }
      handleLoginSuccess(result.role, result.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setSyncMode(false);
    setSyncToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 반투명 배경 - 뒤의 콘텐츠가 보임 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {syncMode ? '비밀번호 재설정' : 'Neture 로그인'}
              </h2>
              <p className="text-xs text-gray-500">
                {syncMode ? '새 비밀번호를 설정합니다' : '공급자 연결 서비스'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {syncMode ? (
            /* 비밀번호 동기화 폼 */
            <form onSubmit={handlePasswordSync} className="space-y-4">
              {error && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">{error}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  이 비밀번호는 O4O 전체 서비스에 적용됩니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력 (6자 이상)"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '변경 중...' : '비밀번호 변경 및 로그인'}
              </button>

              <button
                type="button"
                onClick={resetToLogin}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            </form>
          ) : (
            /* 기존 로그인 폼 */
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력하세요"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      required
                      className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-600">
                    이메일 저장
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </form>

              {/* 비밀번호 찾기/회원가입 링크 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <a
                    href="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      navigate('/forgot-password');
                    }}
                    className="text-gray-500 hover:text-green-600 transition-colors"
                  >
                    비밀번호 찾기
                  </a>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => openRegisterModal()}
                    className="text-green-600 font-medium hover:text-green-700 transition-colors"
                  >
                    회원가입
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
