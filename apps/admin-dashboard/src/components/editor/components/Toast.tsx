/**
 * Toast Component
 * Display toast notifications with different types
 *
 * Extracted from GutenbergBlockEditor to improve reusability
 */

import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import type { Toast as ToastType } from '../hooks/useToast';

interface ToastProps {
  toast: ToastType;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg bg-white ${
        toast.type === 'success' ? 'border-green-200' :
        toast.type === 'error' ? 'border-red-200' :
        'border-blue-200'
      }`}>
        {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
        {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
        {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
        <p className="text-sm font-medium text-gray-900">{toast.message}</p>
      </div>
    </div>
  );
};
