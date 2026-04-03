/**
 * LoginModal - KPA Society 로그인 모달
 *
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 *
 * 원칙:
 * - 로그인은 항상 모달로만 수행
 * - 로그인 성공 후 현재 화면 유지 (navigate 없음)
 * - 회원가입 클릭 시 RegisterModal로 전환 (페이지 이동 없음)
 *
 * 표준 기능:
 * - 이메일/비밀번호 입력
 * - 비밀번호 보기/숨기기 토글
 * - 이메일 저장 (Remember Me)
 * - 비밀번호 찾기 링크
 * - 회원가입 링크
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

const REMEMBER_EMAIL_KEY = 'kpasociety_remember_email';

export default function LoginModal() {
  const { login } = useAuth();
  const { activeModal, closeModal, openRegisterModal, onLoginSuccess } = useAuthModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingError, setIsPendingError] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOpen = activeModal === 'login';

  // ESC 키로 닫기 + 배경 스크롤 방지
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // 모달 열릴 때 입력 초기화 (저장된 이메일 유지)
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (!savedEmail) {
        setEmail('');
      }
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPendingError(false);
    setLoading(true);

    try {
      await login(email, password);

      // 이메일 저장 처리
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // 로그인 성공: 모달 닫고 현재 화면 유지
      // 원칙: 로그인 후 navigate 없음 — 사용자가 보고 있던 화면을 유지
      closeModal();

      // 선택적 콜백 실행 (예: 글 작성 재시도)
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      // 에러 상세 정보 추출
      let errorMessage = '로그인에 실패했습니다.';

      if (err?.response) {
        // 서버 응답이 있는 경우 (4xx, 5xx)
        const serverError = err.response.data?.error || err.response.data?.message;
        const errorCode = err.response.data?.code;

        // 에러 코드/메시지별 한글화
        if (errorCode === 'INVALID_USER') {
          errorMessage = '등록되지 않은 이메일입니다.';
        } else if (errorCode === 'INVALID_CREDENTIALS') {
          errorMessage = '비밀번호가 올바르지 않습니다.';
        } else if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
          errorMessage = '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.';
          setIsPendingError(true);
        } else if (errorCode === 'ACCOUNT_LOCKED') {
          errorMessage = '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.';
        } else if (err.response.status === 429) {
          errorMessage = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
        } else {
          errorMessage = serverError || `서버 오류 (${err.response.status})`;
        }
      } else if (err?.request) {
        // 요청이 전송됐지만 응답이 없는 경우 (네트워크 오류)
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        console.error('[Login] Network error - request sent but no response:', err.request);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error('[Login] Error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: ForgotPasswordModal로 전환
    // 현재는 페이지 이동 유지 (추후 모달로 전환)
    closeModal();
    window.location.href = '/forgot-password';
  };

  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    // 페이지 이동 대신 RegisterModal로 전환
    openRegisterModal();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                KPA Society 로그인
              </h2>
              <p className="text-xs text-gray-500">
                약사/약대생 커뮤니티
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-lg border ${isPendingError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm ${isPendingError ? 'text-amber-700' : 'text-red-600'}`}>{error}</p>
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
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
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
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-600">
                이메일 저장
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 테스트 계정 자동입력 */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {[
              { label: '관리자', email: 'kpa-a-admin@o4o.com' },
              { label: '운영자', email: 'kpa-a-operator@o4o.com' },
            ].map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => { setEmail(acct.email); setPassword('O4oTestPass'); setError(null); }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {acct.label}
              </button>
            ))}
          </div>

          {/* 아이디·비밀번호 찾기 */}
          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              onClick={handleForgotPassword}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              아이디 · 비밀번호 찾기
            </a>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 회원가입 */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              아직 계정이 없으신가요?{' '}
              <a
                href="#"
                onClick={handleRegister}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                회원가입
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
