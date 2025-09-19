/**
 * React 19 SSR 호환성을 위한 유틸리티
 */

import * as React from 'react';
import { useEffect, useLayoutEffect as useLayoutEffectReact } from 'react';

// SSR 환경에서는 useLayoutEffect 대신 useEffect를 사용
export const useLayoutEffect = typeof window !== 'undefined' ? useLayoutEffectReact : useEffect;

// React 19 호환성을 위한 전역 설정
if (typeof window !== 'undefined') {
  // global 설정 (Node의 global 참조를 사용하는 서드파티 호환)
  if (typeof (globalThis as any).global === 'undefined') {
    (window as any).global = window;
  }
  
  // React를 window에 노출 (vendor 번들 충돌 방지)
  (window as any).React = React;
}
