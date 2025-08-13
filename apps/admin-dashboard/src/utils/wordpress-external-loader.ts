/**
 * WordPress External Module Loader
 * 
 * WordPress 패키지가 외부화되었을 때 사용하는 로더
 * CDN이나 로컬 스크립트로 WordPress 모듈을 로드
 */

// Global interface declaration for WordPress
declare global {
  interface Window {
    wp?: any;
    React?: any;
  }
}

// WordPress 모듈 로드 상태 관리
let wordPressLoadPromise: Promise<void> | null = null;
let isWordPressLoaded = false;

/**
 * WordPress 스크립트 동적 로드
 */
export async function loadWordPressScripts(): Promise<void> {
  // 이미 로드 중이거나 로드되었으면 기존 Promise 반환
  if (wordPressLoadPromise) {
    return wordPressLoadPromise;
  }

  if (isWordPressLoaded) {
    return Promise.resolve();
  }

  wordPressLoadPromise = new Promise((resolve) => {
    // WordPress가 이미 로드되었는지 확인
    if (window.wp?.element && window.wp?.blocks) {
      isWordPressLoaded = true;
      resolve();
      return;
    }

    // WordPress polyfill 초기화
    initializeWordPressPolyfill();

    // 실제 WordPress 사용 시에는 CDN이나 로컬 스크립트 로드
    // 현재는 polyfill만 사용
    isWordPressLoaded = true;
    resolve();
  });

  return wordPressLoadPromise;
}

/**
 * WordPress Polyfill 초기화
 * 외부 스크립트를 로드하지 않고 기본 구조만 제공
 */
function initializeWordPressPolyfill() {
  if (!window.wp) {
    window.wp = {};
  }

  // React 19와 호환되는 element polyfill
  if (!window.wp.element) {
    window.wp.element = {
      createElement: window.React?.createElement,
      createContext: window.React?.createContext,
      useContext: window.React?.useContext,
      useState: window.React?.useState,
      useEffect: window.React?.useEffect,
      useCallback: window.React?.useCallback,
      useMemo: window.React?.useMemo,
      useRef: window.React?.useRef,
      Component: window.React?.Component,
      Fragment: window.React?.Fragment,
    };
  }

  // i18n polyfill
  if (!window.wp.i18n) {
    window.wp.i18n = {
      __: (text: string) => text,
      _x: (text: string) => text,
      _n: (single: string, plural: string, number: number) => number === 1 ? single : plural,
      _nx: (single: string, plural: string, number: number) => number === 1 ? single : plural,
      sprintf: (format: string, ...args: any[]) => {
        let i = 0;
        return format.replace(/%[sdjf]/g, () => String(args[i++]));
      },
      isRTL: () => false,
      setLocaleData: () => {},
      getLocaleData: () => ({}),
      hasTranslation: () => false,
    };
  }

  // hooks polyfill
  if (!window.wp.hooks) {
    const filters: Record<string, Function[]> = {};
    const actions: Record<string, Function[]> = {};
    
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
      removeFilter: () => 0,
      removeAction: () => 0,
      hasFilter: () => false,
      hasAction: () => false,
    };
  }

  // data polyfill
  if (!window.wp.data) {
    window.wp.data = {
      select: () => ({}),
      dispatch: () => ({}),
      subscribe: () => () => {},
      registerStore: () => {},
    };
  }

  // blocks polyfill
  if (!window.wp.blocks) {
    window.wp.blocks = {
      registerBlockType: () => {},
      getCategories: () => [],
      setCategories: () => {},
      getBlockType: () => null,
      getBlockTypes: () => [],
      hasBlockSupport: () => false,
      isReusableBlock: () => false,
    };
  }

  // blockEditor polyfill
  if (!window.wp.blockEditor) {
    window.wp.blockEditor = {
      InspectorControls: () => null,
      BlockControls: () => null,
      useBlockProps: () => ({}),
      RichText: () => null,
      MediaUpload: () => null,
      ColorPalette: () => null,
    };
  }

  // components polyfill
  if (!window.wp.components) {
    window.wp.components = {
      Panel: () => null,
      PanelBody: () => null,
      PanelRow: () => null,
      TextControl: () => null,
      SelectControl: () => null,
      CheckboxControl: () => null,
      RadioControl: () => null,
      RangeControl: () => null,
      Button: () => null,
      Spinner: () => null,
    };
  }

  // domReady polyfill
  if (!window.wp.domReady) {
    window.wp.domReady = (callback: Function) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback as EventListener);
      } else {
        callback();
      }
    };
  }
}

/**
 * WordPress 모듈이 로드되었는지 확인
 */
export function isWordPressReady(): boolean {
  return isWordPressLoaded && !!window.wp?.element;
}

/**
 * WordPress 모듈 로드 대기
 */
export async function ensureWordPressReady(): Promise<void> {
  if (!isWordPressReady()) {
    await loadWordPressScripts();
  }
}