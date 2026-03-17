/**
 * Toast Hook
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Re-exports react-hot-toast for direct use.
 * Also provides useToast() convenience hook matching admin-dashboard API.
 */

import hotToast from 'react-hot-toast';

/**
 * Extended toast with .info() and .warning() methods.
 * react-hot-toast only has .success() and .error() natively.
 */
export const toast = Object.assign(
  (message: string, opts?: Parameters<typeof hotToast>[1]) => hotToast(message, opts),
  {
    success: hotToast.success,
    error: hotToast.error,
    loading: hotToast.loading,
    dismiss: hotToast.dismiss,
    remove: hotToast.remove,
    promise: hotToast.promise,
    custom: hotToast.custom,
    info: (message: string) => hotToast(message, { icon: '\u2139\uFE0F' }),
    warning: (message: string) => hotToast(message, { icon: '\u26A0\uFE0F' }),
  },
);

export function useToast() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    warning: (message: string) => toast.warning(message),
    info: (message: string) => toast.info(message),
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: string) => toast.dismiss(id),
  };
}
