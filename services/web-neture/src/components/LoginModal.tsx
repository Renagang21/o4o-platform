/**
 * LoginModal - 로그인 오버레이 모달
 * 현재 페이지 위에 오버레이로 표시되어 메뉴 등이 보임
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1: 비밀번호 찾기/회원가입 링크 포함
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * 표준 기능:
 * - 이메일/비밀번호 입력
 * - 비밀번호 보기/숨기기 토글
 * - 이메일 저장 (Remember Me)
 * - 비밀번호 찾기 링크
 * - 회원가입 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth, useLoginModal } from '../contexts';

const REMEMBER_EMAIL_KEY = 'neture_remember_email';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export default function LoginModal({ isOpen, onClose, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { openRegisterModal } = useLoginModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
  //   서비스 미가입(SERVICE_NOT_MEMBER) 차단을 비밀번호 오류와 시각적으로 구분하기 위한 분기 state.
  const [isNotMember, setIsNotMember] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // WO-O4O-NETURE-POSTLOGINREDIRECT-CANONICAL-ALIGNMENT-V1:
  // returnUrl만 LoginModal에서 처리. 역할 기반 redirect는 App.tsx PostLoginRedirect 담당.
  const handleLoginSuccess = () => {
    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    if (returnUrl && !returnUrl.startsWith('/workspace/')) {
      navigate(returnUrl);
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNotMember(false);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
        //   SERVICE_NOT_MEMBER 는 별도 안내(가입 신청 링크 포함)로 노출한다.
        if (result.code === 'SERVICE_NOT_MEMBER') {
          setIsNotMember(true);
          setError('이 계정은 Neture 서비스 이용 권한이 없습니다. Neture 이용 신청 후 승인되면 로그인할 수 있습니다.');
        } else {
          // WO-AUTH-ERROR-MESSAGE-SANITIZATION-V1: AuthContext.login()이 이미 한국어 메시지를 반환
          setError(result.error || '로그인에 실패했습니다.');
        }
        return;
      }

      handleLoginSuccess();
    } catch (err) {
      // WO-AUTH-ERROR-MESSAGE-SANITIZATION-V1: 내부 오류(TypeError 등) 사용자 노출 차단
      console.error('[LoginModal] Login error:', err);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToApply = () => {
    onClose();
    navigate('/o4o/apply');
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
              <h2 className="text-lg font-bold text-gray-900">Neture 로그인</h2>
              <p className="text-xs text-gray-500">공급자 연결 서비스</p>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && !isNotMember && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {/* WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내 + 신청 링크 */}
                {isNotMember && error && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    <p className="text-sm text-amber-800">{error}</p>
                    <button
                      type="button"
                      onClick={handleGoToApply}
                      className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Neture 이용 신청하기
                    </button>
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
        </div>
      </div>
    </div>
  );
}
