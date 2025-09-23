/**
 * WordPress Runtime Environment Setup
 * WordPress 패키지들이 external로 처리되어 있으므로,
 * 런타임에 필요한 전역 wp 객체를 생성합니다.
 */

// WordPress 전역 객체 타입 정의
declare global {
  interface Window {
    wp?: {
      blocks?: any;
      blockEditor?: any;
      components?: any;
      element?: any;
      data?: any;
      i18n?: any;
      hooks?: any;
      compose?: any;
      keycodes?: any;
      richText?: any;
      formatLibrary?: any;
      editor?: any;
      coreData?: any;
      domReady?: any;
      apiFetch?: any;
      icons?: any;
      privateApis?: any;
      _initialized?: boolean;
      [key: string]: any;
    };
    React?: any;
    ReactDOM?: any;
  }
}

/**
 * WordPress가 사용 가능한지 확인
 */
export const isWordPressAvailable = () => {
  return typeof window !== 'undefined' && window.wp && window.wp.blocks;
};

/**
 * WordPress 런타임 환경 초기화
 */
const initializeWordPressRuntime = async () => {
  // 이미 초기화되었으면 스킵
  if (isWordPressAvailable()) {
    return;
  }

  // WordPress 초기화는 wordpress-initializer.ts에서 처리
  // 여기서는 아무것도 하지 않음
};

/**
 * WordPress 환경 초기화 헬퍼
 */
export const setupWordPressEnvironment = async () => {
  // DOM이 준비될 때까지 대기
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // WordPress 런타임 초기화
  await initializeWordPressRuntime();
  
  return isWordPressAvailable();
};