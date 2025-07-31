/**
 * React 19 SSR 호환성을 위한 유틸리티
 */

import { useEffect, useLayoutEffect as useLayoutEffectReact } from 'react';
import * as ReactExports from 'react';

// SSR 환경에서는 useLayoutEffect 대신 useEffect를 사용
export const useLayoutEffect = typeof window !== 'undefined' ? useLayoutEffectReact : useEffect;

// React 19 호환성을 위한 전역 설정
if (typeof window !== 'undefined') {
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
  
  // recharts 등을 위한 React namespace 호환성
  (window as any).React = {
    ...ReactExports,
    Children: ReactExports.Children,
    Component: ReactExports.Component,
    Fragment: ReactExports.Fragment,
    Profiler: ReactExports.Profiler,
    PureComponent: ReactExports.PureComponent,
    StrictMode: ReactExports.StrictMode,
    Suspense: ReactExports.Suspense,
    cloneElement: ReactExports.cloneElement,
    createContext: ReactExports.createContext,
    createElement: ReactExports.createElement,
    createFactory: (ReactExports as any).createFactory,
    createRef: ReactExports.createRef,
    forwardRef: ReactExports.forwardRef,
    isValidElement: ReactExports.isValidElement,
    lazy: ReactExports.lazy,
    memo: ReactExports.memo,
    useCallback: ReactExports.useCallback,
    useContext: ReactExports.useContext,
    useDebugValue: ReactExports.useDebugValue,
    useEffect: ReactExports.useEffect,
    useImperativeHandle: ReactExports.useImperativeHandle,
    useLayoutEffect: ReactExports.useLayoutEffect,
    useMemo: ReactExports.useMemo,
    useReducer: ReactExports.useReducer,
    useRef: ReactExports.useRef,
    useState: ReactExports.useState,
    version: ReactExports.version,
  };
}