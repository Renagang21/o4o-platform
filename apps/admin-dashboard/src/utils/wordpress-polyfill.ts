/**
 * WordPress Polyfill
 * 
 * WordPress 모듈들을 React 환경에서 사용하기 위한 초기화 설정
 * WordPress 패키지들이 기대하는 전역 객체들을 미리 설정
 */

// Global interface declaration for WordPress
declare global {
  interface Window {
    wp?: any;
  }
}

// WordPress i18n polyfill - 다국어 지원
export function initWordPressI18n() {
  if (typeof window === 'undefined') return;
  
  window.wp = window.wp || {};
  
  // i18n 기본 구현 (나중에 실제 다국어 지원 시 교체 가능)
  window.wp.i18n = {
    // 기본 번역 함수
    __: (text: string, _domain?: string) => text,
    _x: (text: string, _context: string, _domain?: string) => text,
    _n: (single: string, plural: string, number: number, _domain?: string) => 
      number === 1 ? single : plural,
    _nx: (single: string, plural: string, number: number, _context: string, _domain?: string) => 
      number === 1 ? single : plural,
    
    // sprintf 구현
    sprintf: (format: string, ...args: any[]) => {
      let i = 0;
      return format.replace(/%[sdjf]/g, () => String(args[i++]));
    },
    
    // 기타 유틸리티
    isRTL: () => false,
    setLocaleData: (_data: any, _domain?: string) => {},
    getLocaleData: (_domain?: string) => ({}),
    hasTranslation: (_text: string, _context?: string, _domain?: string) => false,
    subscribe: (_callback: () => void) => () => {},
  };
}

// WordPress 데이터 저장소 polyfill
export function initWordPressData() {
  if (typeof window === 'undefined') return;
  
  window.wp = window.wp || {};
  
  // 기본 데이터 저장소 (필요시 Redux나 Zustand로 교체 가능)
  window.wp.data = window.wp.data || {
    select: (_storeName: string) => ({}),
    dispatch: (_storeName: string) => ({}),
    subscribe: (_callback: () => void) => () => {},
    registerStore: (_name: string, _config: any) => {},
  };
}

// WordPress hooks polyfill (React hooks와 별개)
export function initWordPressHooks() {
  if (typeof window === 'undefined') return;
  
  window.wp = window.wp || {};
  
  const filters: Record<string, Function[]> = {};
  const actions: Record<string, Function[]> = {};
  
  // 완전한 hooks 구현
  window.wp.hooks = {
    addFilter: (hookName: string, _namespace: string, callback: Function, _priority = 10) => {
      filters[hookName] = filters[hookName] || [];
      filters[hookName].push(callback);
    },
    applyFilters: (hookName: string, value: any, ...args: any[]) => {
      const callbacks = filters[hookName] || [];
      return callbacks.reduce((val, callback) => callback(val, ...args), value);
    },
    addAction: (hookName: string, _namespace: string, callback: Function, _priority = 10) => {
      actions[hookName] = actions[hookName] || [];
      actions[hookName].push(callback);
    },
    doAction: (hookName: string, ...args: any[]) => {
      const callbacks = actions[hookName] || [];
      callbacks.forEach(callback => callback(...args));
    },
    removeFilter: (_hookName: string, _namespace: string) => {
      // 구현 필요시 추가
      return 0;
    },
    removeAction: (_hookName: string, _namespace: string) => {
      // 구현 필요시 추가
      return 0;
    },
    hasFilter: (_hookName: string, _namespace?: string) => false,
    hasAction: (_hookName: string, _namespace?: string) => false,
    removeAllFilters: (_hookName: string) => 0,
    removeAllActions: (_hookName: string) => 0,
    currentFilter: () => null,
    currentAction: () => null,
    doingFilter: (_hookName?: string) => false,
    doingAction: (_hookName?: string) => false,
    didFilter: (_hookName: string) => 0,
    didAction: (_hookName: string) => 0,
  };
}

// WordPress 전체 초기화
export function initWordPress() {
  // console.log('[WordPress Polyfill] Initializing WordPress global objects...');
  
  // Only initialize if not already present (hooks-shim may have already done this)
  if (!window.wp?.i18n) {
    initWordPressI18n();
  }
  
  initWordPressData();
  
  // Only initialize hooks if not already present
  if (!window.wp?.hooks) {
    initWordPressHooks();
  }
  
  // 추가 WordPress 전역 객체들
  window.wp = window.wp || {};
  
  // DOM Ready polyfill
  window.wp.domReady = (callback: () => void) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  };
  
  // Element 관련 (React 래퍼)
  window.wp.element = window.wp.element || {
    createElement: (..._args: any[]) => null, // React.createElement로 교체 가능
    render: (..._args: any[]) => null, // ReactDOM.render로 교체 가능
  };
  
  // blocks API 추가 (블록 에디터 지원)
  window.wp.blocks = window.wp.blocks || {
    registerBlockType: (_name: string, _config: any) => {},
    getCategories: () => [],
    setCategories: (_categories: any[]) => {},
  };
  
  // console.log('[WordPress Polyfill] WordPress global objects initialized:', window.wp);
}

// TypeScript types for Window.wp are defined in vite-env.d.ts

export default initWordPress;