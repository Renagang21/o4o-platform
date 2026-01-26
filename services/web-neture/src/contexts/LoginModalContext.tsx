/**
 * LoginModalContext - 로그인 모달 상태 관리
 * 어디서든 로그인 모달을 열 수 있도록 전역 상태 제공
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoginModalContextType {
  isLoginModalOpen: boolean;
  openLoginModal: (returnUrl?: string) => void;
  closeLoginModal: () => void;
  loginReturnUrl?: string;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginReturnUrl, setLoginReturnUrl] = useState<string | undefined>();

  const openLoginModal = (returnUrl?: string) => {
    setLoginReturnUrl(returnUrl);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginReturnUrl(undefined);
  };

  return (
    <LoginModalContext.Provider
      value={{
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
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
