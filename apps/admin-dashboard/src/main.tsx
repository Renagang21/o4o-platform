import './react-shim'; // React 19 compatibility - MUST be first
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import * as ReactDOMClient from 'react-dom/client'
import * as ReactAll from 'react';

// Replace placeholder React with real React
if (typeof window !== 'undefined') {
  // Ensure React has all necessary properties
  const ReactWithAll = Object.assign({}, React, ReactAll);
  
  // Override the placeholder with real React
  window.React = ReactWithAll;
  window.ReactDOM = ReactDOMClient as any;
  
  // Also update wp.element if it exists
  if (window.wp?.element) {
    Object.assign(window.wp.element, {
      createElement: ReactWithAll.createElement,
      createContext: ReactWithAll.createContext,
      useContext: ReactWithAll.useContext,
      useState: ReactWithAll.useState,
      useEffect: ReactWithAll.useEffect,
      useCallback: ReactWithAll.useCallback,
      useMemo: ReactWithAll.useMemo,
      useRef: ReactWithAll.useRef,
      Component: ReactWithAll.Component,
      Fragment: ReactWithAll.Fragment,
      Children: ReactWithAll.Children,
    });
  }
}
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MultiThemeProvider } from '@/shared/components/theme/MultiThemeContext'
import App from './App'
import './styles/globals.css'
import './styles/wordpress-dashboard.css'
import './styles/dashboard-simple.css'
import './styles/bulk-actions.css'
import './styles/quick-edit.css'
import './styles/help-tab.css'
import './styles/media-upload.css'
import './styles/ui-improvements.css'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 errors
        if (error?.response?.status === 404 || error?.response?.status === 401) {
          return false;
        }
        // Retry up to 1 time for other errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes (gcTime replaced cacheTime in v5)
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

// WordPress 초기화는 필요한 페이지에서만 수행하도록 변경
// initWordPress는 블록 에디터 관련 페이지에서 호출

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MultiThemeProvider defaultTheme="light">
          <App />
          <Toaster position="top-center" reverseOrder={false} />
        </MultiThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)