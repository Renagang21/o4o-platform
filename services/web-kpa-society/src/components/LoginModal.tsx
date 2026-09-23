/**
 * LoginModal - KPA Society 로그인 모달
 *
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 "Google 로 계속하기" 하나다. 이메일/비밀번호 입력 · 이메일 저장 ·
 *   비밀번호 찾기 · 별도 회원가입 모달은 은퇴했다(미등록 Google 계정은 같은 버튼에서 약관 동의 → 가입).
 *
 * 원칙:
 * - 로그인은 항상 모달로만 수행
 * - 로그인 성공 후 역할 기반 진입 화면 또는 콜백(현재 화면 유지)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type User } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { getKpaPostLoginRoute } from '../config/dashboard';

export default function LoginModal() {
  const navigate = useNavigate();
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const { activeModal, closeModal, onLoginSuccess } = useAuthModal();
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 차단은 일반 오류와 분리 표시
  const [isNotMember, setIsNotMember] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsNotMember(false);
    }
  }, [isOpen]);

  /** 로그인 성공 후처리: 모달 닫기 → 콜백 또는 역할 기반 진입 화면. */
  const finishLogin = (loggedInUser: User) => {
    try {
      closeModal();
      if (onLoginSuccess) {
        onLoginSuccess();
        return;
      }
      // WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1: 역할 기반 기본 진입 화면
      // 매핑 SSOT: config/dashboard.ts (getKpaPostLoginRoute / KPA_DASHBOARD_MAP).
      const redirectTo = getKpaPostLoginRoute(loggedInUser);
      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      console.error('[Login] Post-login error:', err);
      setError('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
          {error && !isNotMember && (
            <div className="mb-4 p-3 rounded-lg border bg-red-50 border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {/* WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1: 서비스 미가입 안내 */}
          {isNotMember && error && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 로그인 진입은 이 버튼 하나다. */}
          <GoogleContinue<User>
            getConfig={getGoogleAuthConfig}
            loginWithGoogle={loginWithGoogle}
            signupWithGoogle={signupWithGoogle}
            onSuccess={({ user: loggedInUser }) => { setError(null); setIsNotMember(false); finishLogin(loggedInUser); }}
            onStart={() => { setError(null); setIsNotMember(false); }}
            onError={({ message, code }) => {
              const notMember = code === 'SERVICE_NOT_MEMBER';
              setIsNotMember(notMember);
              setError(
                notMember
                  ? '이 계정은 KPA-Society 서비스에 가입되어 있지 않습니다. 서비스 이용 절차를 진행해 주세요.'
                  : message,
              );
            }}
            termsHref="/policy"
            privacyHref="/privacy"
          />

          <p className="mt-6 text-center text-sm text-gray-500">
            처음이신가요? 같은 버튼으로 약관 동의 후 계정이 만들어집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
