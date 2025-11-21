/**
 * Toast Notification Type Definitions
 * HP-1: Toast System 전역화
 */

/**
 * Toast notification variants
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast position options
 */
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

/**
 * Toast notification options
 */
export interface ToastOptions {
  /**
   * Unique identifier for the toast (auto-generated if not provided)
   */
  id?: string;

  /**
   * Main message to display
   */
  message: string;

  /**
   * Optional description/detail text
   */
  description?: string;

  /**
   * Visual variant of the toast
   * @default 'info'
   */
  variant?: ToastVariant;

  /**
   * Duration in milliseconds before auto-dismiss
   * @default 5000 (5 seconds)
   * Set to 0 or Infinity to disable auto-dismiss
   */
  durationMs?: number;

  /**
   * Position on screen
   * @default 'top-right'
   */
  position?: ToastPosition;

  /**
   * Whether the toast can be manually dismissed
   * @default true
   */
  dismissible?: boolean;

  /**
   * Optional icon component or icon name
   */
  icon?: React.ReactNode | string;

  /**
   * Optional action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Internal toast data structure with metadata
 */
export interface Toast extends Required<Omit<ToastOptions, 'description' | 'icon' | 'action'>> {
  description?: string;
  icon?: React.ReactNode | string;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

/**
 * Toast Context API
 */
export interface ToastContextValue {
  /**
   * Show a toast notification with custom options
   */
  showToast: (options: ToastOptions) => void;

  /**
   * Show a success toast
   */
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => void;

  /**
   * Show an error toast
   */
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => void;

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => void;

  /**
   * Show an info toast
   */
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => void;

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (id: string) => void;

  /**
   * Clear all toasts
   */
  clearAll: () => void;

  /**
   * Current active toasts (for debugging/testing)
   */
  toasts: Toast[];
}
