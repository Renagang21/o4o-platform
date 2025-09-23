/**
 * WordPress External Module Loader
 * 
 * WordPress 패키지가 외부화되었을 때 사용하는 로더
 * CDN이나 로컬 스크립트로 WordPress 모듈을 로드
 */

// Type declaration is in wordpress-runtime-setup.ts and vite-env.d.ts

// WordPress 모듈 로드 상태 관리
let wordPressLoadPromise: Promise<void> | null = null;
let isWordPressLoaded = false;

/**
 * React가 로드될 때까지 대기
 */
async function waitForReact(): Promise<void> {
  // React가 이미 로드되었는지 확인
  if (window.React && typeof window.React.createElement === 'function' && typeof window.React.createContext === 'function') {
    return;
  }

  // React 로드 대기 (최대 5초)
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (window.React && typeof window.React.createElement === 'function' && typeof window.React.createContext === 'function') {
      return;
    }
  }

  // Warning log removed
}

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
    // React 로드 대기 후 WordPress 초기화
    waitForReact().then(() => {
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
    // React가 로드될 때까지 지연된 접근자 사용
    window.wp.element = {
      get createElement() { return window.React?.createElement; },
      get createContext() { return window.React?.createContext; },
      get useContext() { return window.React?.useContext; },
      get useState() { return window.React?.useState; },
      get useEffect() { return window.React?.useEffect; },
      get useCallback() { return window.React?.useCallback; },
      get useMemo() { return window.React?.useMemo; },
      get useRef() { return window.React?.useRef; },
      get Component() { return window.React?.Component; },
      get Fragment() { return window.React?.Fragment; },
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

  // blocks polyfill - preserve existing implementation if present
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
  } else {
    // Only add missing functions, don't overwrite existing ones
    if (!window.wp.blocks.hasBlockSupport) {
      window.wp.blocks.hasBlockSupport = () => false;
    }
    if (!window.wp.blocks.isReusableBlock) {
      window.wp.blocks.isReusableBlock = () => false;
    }
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

  // privateApis polyfill - WordPress의 private API 시스템
  if (!window.wp.privateApis) {
    window.wp.privateApis = {
      lock: (_key: string, _module: string) => {
        // Private API lock 메커니즘
        return (target: any) => target;
      },
      unlock: (_key: string) => {
        // Private API unlock 메커니즘
        return (target: any) => target;
      }
    };
  }

  // compose polyfill
  if (!window.wp.compose) {
    window.wp.compose = {
      compose: (...funcs: Function[]) => (component: any) => 
        funcs.reduceRight((acc, func) => func(acc), component),
      withState: () => (component: any) => component,
      withInstanceId: () => (component: any) => component,
      createHigherOrderComponent: (mapComponent: Function) => mapComponent,
    };
  }

  // apiFetch polyfill
  if (!window.wp.apiFetch) {
    window.wp.apiFetch = (options: any) => {
      return fetch(options.url || options.path, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body ? JSON.stringify(options.body) : undefined,
      }).then(res => res.json());
    };
    window.wp.apiFetch.use = () => {};
    window.wp.apiFetch.setFetchHandler = () => {};
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