import { useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// This is a simplified version that returns a function to show toasts
// The actual implementation would need to be connected to a toast provider
export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    // In a real implementation, this would dispatch to a toast context
    // For now, we'll just console log
    console.log(`[${type.toUpperCase()}] ${message}`, options);
    
    // You could also emit a custom event that a toast provider could listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type, ...options }
      }));
    }
  }, []);

  return { showToast };
};

// Helper hook for components that need the toast functionality
export const createToastHandler = (onShowToast: (message: string, type: ToastType) => void) => {
  return {
    success: (message: string) => onShowToast(message, 'success'),
    error: (message: string) => onShowToast(message, 'error'),
    warning: (message: string) => onShowToast(message, 'warning'),
    info: (message: string) => onShowToast(message, 'info'),
  };
};