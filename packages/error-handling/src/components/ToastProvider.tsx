/**
 * O4O Platform Toast Provider
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Wraps react-hot-toast <Toaster> with platform-standard configuration.
 * Place at the root of each service's component tree.
 */

import { Toaster } from 'react-hot-toast';

export function O4OToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          duration: 2500,
          style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
        },
        error: {
          duration: 4000,
          style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
        },
      }}
    />
  );
}
