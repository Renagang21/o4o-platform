/**
 * LoginModalContext - 로그인 모달 상태 관리
 *
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 *
 * 원칙:
 * - 로그인은 항상 모달로만 수행
 * - 로그인 성공 후 현재 화면 유지
 * - URL 변경 없음
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface LoginModalContextType {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  /** 로그인 성공 후 실행할 콜백 (선택적) */
  onLoginSuccess?: () => void;
  setOnLoginSuccess: (callback?: () => void) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [onLoginSuccess, setOnLoginSuccessState] = useState<(() => void) | undefined>();

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
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
  if (context === undefined) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
