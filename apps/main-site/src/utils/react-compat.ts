/**
 * React 19 SSR 호환성을 위한 유틸리티
 */

import { useEffect, useLayoutEffect as useLayoutEffectReact } from 'react';

// SSR 환경에서는 useLayoutEffect 대신 useEffect를 사용
export const useLayoutEffect = typeof window !== 'undefined' ? useLayoutEffectReact : useEffect;

// React 19 호환성을 위한 전역 설정
// Node의 `global`을 참조하는 서드파티 호환을 위해 브라우저에서 window.global을 보장
if (typeof window !== 'undefined' && typeof (globalThis as any).global === 'undefined') {
  (window as any).global = window;
}
