/**
 * LoginModalContext - 인증 모달 상태 관리
 * 어디서든 로그인/회원가입 모달을 열 수 있도록 전역 상태 제공
 *
 * WO-O4O-AUTH-MODAL-SIGNUP-ROLE-UPDATE-V1: activeModal 패턴 확장
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 'register' 모달은 은퇴했다.
//   가입은 로그인 모달의 'Google 로 계속하기' 하나가 담당한다(미등록이면 동의 → 가입).
type ModalType = 'login' | null;

interface LoginModalContextType {
  activeModal: ModalType;
  isLoginModalOpen: boolean;
  openLoginModal: (returnUrl?: string) => void;
  openRegisterModal: () => void;
  closeLoginModal: () => void;
  closeModal: () => void;
  loginReturnUrl?: string;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loginReturnUrl, setLoginReturnUrl] = useState<string | undefined>();

  const openLoginModal = useCallback((returnUrl?: string) => {
    // WO-O4O-LOGIN-ONCLICK-EVENT-LEAK-FIX-V1: 비문자열 인자 차단
    setLoginReturnUrl(typeof returnUrl === 'string' ? returnUrl : undefined);
    setActiveModal('login');
  }, []);

  /** 회원가입 진입 — 로그인 모달과 같은 화면이다(Google 로 계속하기가 가입을 겸한다). */
  const openRegisterModal = useCallback(() => {
    setLoginReturnUrl(undefined);
    setActiveModal('login');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setLoginReturnUrl(undefined);
  }, []);

  return (
    <LoginModalContext.Provider
      value={{
        activeModal,
        isLoginModalOpen: activeModal === 'login',
        openLoginModal,
        openRegisterModal,
        closeLoginModal: closeModal,
        closeModal,
        loginReturnUrl,
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (context === undefined) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
