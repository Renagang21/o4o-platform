/**
 * Toast Provider
 * HP-1: Toast System 전역화
 *
 * Provides global toast notification system with queue management
 */

import React, { createContext, useCallback, useContext, useReducer, useRef, useEffect } from 'react';
import { Toast, ToastOptions, ToastContextValue } from '@/types/toast';

/**
 * Toast Context
 */
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Toast State
 */
interface ToastState {
  toasts: Toast[];
}

/**
 * Toast Actions
 */
type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_ALL' };

/**
 * Toast Reducer
 */
function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
}

/**
 * Toast Provider Props
 */
interface ToastProviderProps {
  children: React.ReactNode;
  /**
   * Maximum number of toasts to show at once
   * @default 5
   */
  maxToasts?: number;
}

/**
 * Generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Toast Provider Component
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxToasts = 5 }) => {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Clear timer for a specific toast
   */
  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  /**
   * Dismiss a toast
   */
  const dismiss = useCallback((id: string) => {
    clearTimer(id);
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, [clearTimer]);

  /**
   * Set auto-dismiss timer for a toast
   */
  const setAutoTimer = useCallback((id: string, durationMs: number) => {
    if (durationMs > 0 && durationMs !== Infinity) {
      const timer = setTimeout(() => {
        dismiss(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    }
  }, [dismiss]);

  /**
   * Show a toast notification
   */
  const showToast = useCallback((options: ToastOptions) => {
    const id = options.id || generateToastId();

    const toast: Toast = {
      id,
      message: options.message,
      description: options.description,
      variant: options.variant || 'info',
      durationMs: options.durationMs ?? 5000,
      position: options.position || 'top-right',
      dismissible: options.dismissible ?? true,
      icon: options.icon,
      action: options.action,
      createdAt: Date.now(),
    };

    // Remove oldest toast if max limit reached
    if (state.toasts.length >= maxToasts) {
      const oldestToast = state.toasts[0];
      if (oldestToast) {
        dismiss(oldestToast.id);
      }
    }

    dispatch({ type: 'ADD_TOAST', payload: toast });
    setAutoTimer(id, toast.durationMs);
  }, [state.toasts, maxToasts, dismiss, setAutoTimer]);

  /**
   * Show success toast
   */
  const success = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => {
    showToast({ ...options, message, variant: 'success' });
  }, [showToast]);

  /**
   * Show error toast
   */
  const error = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => {
    showToast({ ...options, message, variant: 'error' });
  }, [showToast]);

  /**
   * Show warning toast
   */
  const warning = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => {
    showToast({ ...options, message, variant: 'warning' });
  }, [showToast]);

  /**
   * Show info toast
   */
  const info = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => {
    showToast({ ...options, message, variant: 'info' });
  }, [showToast]);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value: ToastContextValue = {
    showToast,
    success,
    error,
    warning,
    info,
    dismiss,
    clearAll,
    toasts: state.toasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to access toast context
 * Must be used within ToastProvider
 */
export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
