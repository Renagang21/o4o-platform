/**
 * Store Mode Context
 * 스토어 표시 모드 관리 (consumer | kiosk | tablet)
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Store Mode Types
export type StoreMode = 'consumer' | 'kiosk' | 'tablet';
export type OrderChannel = 'web' | 'kiosk' | 'tablet';

interface StoreModeContextType {
  mode: StoreMode;
  orderChannel: OrderChannel;
  storeSlug: string | null;

  // Kiosk 전용: 자동 리셋 타이머
  resetTimer: number; // seconds remaining
  resetKiosk: () => void;

  // 모드별 설정
  isKioskMode: boolean;
  isTabletMode: boolean;
  isConsumerMode: boolean;

  // UI 힌트
  showLoginUI: boolean;
  showSearchUI: boolean;
  showFooter: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';

  // 경로 헬퍼
  getStorePath: (path?: string) => string;
}

const StoreModeContext = createContext<StoreModeContextType | null>(null);

// 키오스크 자동 리셋 시간 (초)
const KIOSK_RESET_TIMEOUT = 180; // 3분

interface StoreModeProviderProps {
  children: ReactNode;
  mode: StoreMode;
  storeSlug: string;
}

export function StoreModeProvider({ children, mode, storeSlug }: StoreModeProviderProps) {
  const [resetTimer, setResetTimer] = useState(KIOSK_RESET_TIMEOUT);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // 모드별 플래그
  const isKioskMode = mode === 'kiosk';
  const isTabletMode = mode === 'tablet';
  const isConsumerMode = mode === 'consumer';

  // Order Channel 매핑
  const orderChannel: OrderChannel = mode === 'consumer' ? 'web' : mode;

  // UI 설정
  const showLoginUI = isConsumerMode; // 키오스크/태블릿은 비로그인
  const showSearchUI = !isKioskMode; // 키오스크는 검색 숨김
  const showFooter = isConsumerMode; // 키오스크/태블릿은 푸터 최소화
  const fontSize = isKioskMode ? 'xlarge' : isTabletMode ? 'large' : 'normal';

  // 키오스크 리셋
  const resetKiosk = useCallback(() => {
    setResetTimer(KIOSK_RESET_TIMEOUT);
    setLastActivity(Date.now());
    // TODO: 장바구니 초기화, 화면 초기화 등
  }, []);

  // 키오스크 자동 리셋 타이머
  useEffect(() => {
    if (!isKioskMode) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity) / 1000);
      const remaining = Math.max(0, KIOSK_RESET_TIMEOUT - elapsed);
      setResetTimer(remaining);

      if (remaining === 0) {
        resetKiosk();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isKioskMode, lastActivity, resetKiosk]);

  // 사용자 활동 감지 (키오스크)
  useEffect(() => {
    if (!isKioskMode) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isKioskMode]);

  // 경로 헬퍼
  const getStorePath = useCallback((path?: string) => {
    const basePath = `/store/${storeSlug}`;
    const modePath = isKioskMode ? '/kiosk' : isTabletMode ? '/tablet' : '';
    const subPath = path ? `/${path}` : '';
    return `${basePath}${modePath}${subPath}`;
  }, [storeSlug, isKioskMode, isTabletMode]);

  const value: StoreModeContextType = {
    mode,
    orderChannel,
    storeSlug,
    resetTimer,
    resetKiosk,
    isKioskMode,
    isTabletMode,
    isConsumerMode,
    showLoginUI,
    showSearchUI,
    showFooter,
    fontSize,
    getStorePath,
  };

  return (
    <StoreModeContext.Provider value={value}>
      {children}
    </StoreModeContext.Provider>
  );
}

export function useStoreMode() {
  const context = useContext(StoreModeContext);
  if (!context) {
    throw new Error('useStoreMode must be used within a StoreModeProvider');
  }
  return context;
}

// 선택적 사용 (Provider 외부에서 사용 가능)
export function useStoreModeOptional() {
  return useContext(StoreModeContext);
}

// URL에서 모드 감지 헬퍼
export function detectStoreModeFromPath(pathname: string): StoreMode {
  if (pathname.includes('/kiosk')) return 'kiosk';
  if (pathname.includes('/tablet')) return 'tablet';
  return 'consumer';
}
