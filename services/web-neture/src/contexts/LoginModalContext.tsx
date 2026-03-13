/**
 * LoginModalContext - 인증 모달 상태 관리
 * 어디서든 로그인/회원가입 모달을 열 수 있도록 전역 상태 제공
 *
 * WO-O4O-AUTH-MODAL-SIGNUP-ROLE-UPDATE-V1: activeModal 패턴 확장
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ModalType = 'login' | 'register' | null;

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
    setLoginReturnUrl(returnUrl);
    setActiveModal('login');
  }, []);

  const openRegisterModal = useCallback(() => {
    setActiveModal('register');
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
