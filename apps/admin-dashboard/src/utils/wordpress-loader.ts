/**
 * WordPress Lazy Loader
 * 
 * WordPress 모듈을 필요한 시점에만 로드하는 유틸리티
 * 로그인 페이지 등 불필요한 곳에서 WordPress 모듈이 로드되는 것을 방지
 */

let isWordPressInitialized = false;

export async function ensureWordPressLoaded() {
  if (isWordPressInitialized) {
    return;
  }

  // WordPress hooks shim 로드
  await import('./wordpress-hooks-shim');
  
  // WordPress polyfill 로드 및 초기화
  const { default: initWordPress } = await import('./wordpress-polyfill');
  initWordPress();
  
  isWordPressInitialized = true;
}

export function isWordPressLoaded() {
  return isWordPressInitialized;
}