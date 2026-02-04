/**
 * AuthModalContext - 인증 모달 통합 상태 관리
 *
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 *
 * 원칙:
 * - 로그인/가입/비밀번호찾기 모두 모달로만 수행
 * - 인증 완료 후 현재 화면 유지
 * - URL 변경 없음
 * - 모달 간 자연스러운 전환
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ModalType = 'login' | 'register' | 'forgotPassword' | null;

interface AuthModalContextType {
  /** 현재 열린 모달 타입 */
  activeModal: ModalType;
  /** 로그인 모달 열기 */
  openLoginModal: () => void;
  /** 가입 모달 열기 */
  openRegisterModal: () => void;
  /** 비밀번호 찾기 모달 열기 */
  openForgotPasswordModal: () => void;
  /** 모달 닫기 */
  closeModal: () => void;
  /** 로그인 성공 후 실행할 콜백 */
  onLoginSuccess?: () => void;
  setOnLoginSuccess: (callback?: () => void) => void;

  // 하위호환성 유지
  isLoginModalOpen: boolean;
  closeLoginModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [onLoginSuccess, setOnLoginSuccessState] = useState<(() => void) | undefined>();

  const openLoginModal = useCallback(() => {
    setActiveModal('login');
  }, []);

  const openRegisterModal = useCallback(() => {
    setActiveModal('register');
  }, []);

  const openForgotPasswordModal = useCallback(() => {
    setActiveModal('forgotPassword');
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
        openForgotPasswordModal,
        closeModal,
        onLoginSuccess,
        setOnLoginSuccess,
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
