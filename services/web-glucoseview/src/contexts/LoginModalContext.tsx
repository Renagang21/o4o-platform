/**
 * LoginModalContext - GlucoseView 로그인 모달 상태 관리
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 *
 * 중앙화된 로그인 모달 상태 관리를 위한 Context
 * - Layout/Navigation에서 모달 열기
 * - 로그인 성공 후 페이지 유지 (리다이렉트 없음)
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoginModalContextType {
  isLoginModalOpen: boolean;
  openLoginModal: (returnUrl?: string) => void;
  closeLoginModal: () => void;
  returnUrl?: string;
  onLoginSuccess?: () => void;
  setOnLoginSuccess: (callback?: () => void) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | undefined>();
  const [onLoginSuccess, setOnLoginSuccessState] = useState<(() => void) | undefined>();

  const openLoginModal = useCallback((url?: string) => {
    setReturnUrl(url);
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setReturnUrl(undefined);
    setOnLoginSuccessState(undefined);
  }, []);

  const setOnLoginSuccess = useCallback((callback?: () => void) => {
    setOnLoginSuccessState(() => callback);
  }, []);

  return (
    <LoginModalContext.Provider
      value={{
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        returnUrl,
        onLoginSuccess,
        setOnLoginSuccess,
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
