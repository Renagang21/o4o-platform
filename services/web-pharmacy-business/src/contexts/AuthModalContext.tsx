/**
 * AuthModalContext - 인증 모달 통합 상태 관리
 *
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 *
 * 원칙:
 * - 로그인은 모달, 계정 가입은 공통 가입 화면으로 연결
 * - 인증 완료 후 현재 화면 유지
 * - 로그인 모달은 현재 URL 유지
 * - 모달 간 자연스러운 전환
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1: functionGate 제거 (AuthGate 페이지로 대체)
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   'register' · 'forgotPassword' 모달은 은퇴했다. 가입은 로그인 모달의 'Google 로 계속하기'
//   하나가 겸하고(미등록이면 약관 동의 → 가입), 되찾을 비밀번호는 존재하지 않는다.
type ModalType = 'login' | null;

interface AuthModalContextType {
  /** 현재 열린 모달 타입 */
  activeModal: ModalType;
  /** 로그인 모달 열기 */
  openLoginModal: () => void;
  /** 공통 계정 가입 화면으로 이동한다. 서비스 가입 신청·승인과는 별개다. */
  openRegisterModal: () => void;
  /** 모달 닫기 */
  closeModal: () => void;
  /** 로그인 성공 후 실행할 콜백 */
  onLoginSuccess?: () => void;
  setOnLoginSuccess: (callback?: () => void) => void;
  /** Survives modal close so the fallback cannot replace a completed login destination. */
  loginNavigationHandled: boolean;
  markLoginNavigationHandled: () => void;

  // 하위호환성 유지
  isLoginModalOpen: boolean;
  closeLoginModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [onLoginSuccess, setOnLoginSuccessState] = useState<(() => void) | undefined>();
  const [loginNavigationHandled, setLoginNavigationHandled] = useState(false);
  const markLoginNavigationHandled = useCallback(() => setLoginNavigationHandled(true), []);

  const openLoginModal = useCallback(() => {
    setLoginNavigationHandled(false);
    setActiveModal('login');
  }, []);

  const openRegisterModal = useCallback(() => {
    window.location.assign('https://neture.co.kr/signup');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setOnLoginSuccessState(undefined);
  }, []);

  const setOnLoginSuccess = useCallback((callback?: () => void) => {
    setOnLoginSuccessState(() => callback);
  }, []);

  // 하위호환성
  const isLoginModalOpen = activeModal === 'login';
  const closeLoginModal = closeModal;

  return (
    <AuthModalContext.Provider
      value={{
        activeModal,
        openLoginModal,
        openRegisterModal,
        closeModal,
        onLoginSuccess,
        setOnLoginSuccess,
        loginNavigationHandled,
        markLoginNavigationHandled,
        // 하위호환성
        isLoginModalOpen,
        closeLoginModal,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

// 하위호환성: useLoginModal은 useAuthModal의 별칭
export const useLoginModal = useAuthModal;

// 하위호환성: LoginModalProvider는 AuthModalProvider의 별칭
export const LoginModalProvider = AuthModalProvider;
