/**
 * RegisterModalContext - GlycoPharm 가입신청 모달 상태 관리
 *
 * WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1:
 *   /register 페이지 제거에 맞춰 가입신청 모달을 전역에서 관리한다.
 *   상단 메뉴(GlycoGlobalHeader), 로그인 화면(LoginPage / LoginModal), Footer 등
 *   진입 지점이 useRegisterModal().openRegisterModal() 단일 API 로 모달을 연다.
 *
 * 패턴: LoginModalContext 와 동일 (단일 modal 상태 + open/close).
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface RegisterModalContextType {
  isRegisterModalOpen: boolean;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
}

const RegisterModalContext = createContext<RegisterModalContextType | undefined>(undefined);

export function RegisterModalProvider({ children }: { children: ReactNode }) {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const openRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(false);
  }, []);

  return (
    <RegisterModalContext.Provider
      value={{
        isRegisterModalOpen,
        openRegisterModal,
        closeRegisterModal,
      }}
    >
      {children}
    </RegisterModalContext.Provider>
  );
}

export function useRegisterModal() {
  const context = useContext(RegisterModalContext);
  if (!context) {
    throw new Error('useRegisterModal must be used within a RegisterModalProvider');
  }
  return context;
}
