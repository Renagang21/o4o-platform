/**
 * ToastItem Component
 * HP-1: Toast System 전역화
 *
 * Individual toast notification with animations and styling
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Toast, ToastVariant } from '@/types/toast';
import { cn } from '@/lib/utils';

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * Get icon component for toast variant
 */
function getVariantIcon(variant: ToastVariant): React.ReactNode {
  const iconClass = "w-5 h-5 flex-shrink-0";

  switch (variant) {
    case 'success':
      return <CheckCircle className={cn(iconClass, "text-green-600")} />;
    case 'error':
      return <XCircle className={cn(iconClass, "text-red-600")} />;
    case 'warning':
      return <AlertCircle className={cn(iconClass, "text-amber-600")} />;
    case 'info':
    default:
      return <Info className={cn(iconClass, "text-blue-600")} />;
  }
}

/**
 * Get toast variant styling classes
 */
function getVariantClasses(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-900';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-900';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'info':
    default:
      return 'bg-blue-50 border-blue-200 text-blue-900';
  }
}

/**
 * ToastItem Component
 */
export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for exit animation before actually dismissing
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  // Auto-dismiss on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toast.dismissible) {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [toast.dismissible]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-md rounded-lg border-2 shadow-lg transition-all duration-300",
        "animate-in slide-in-from-right-full",
        isExiting && "animate-out slide-out-to-right-full opacity-0",
        getVariantClasses(toast.variant)
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex w-full items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {toast.icon
            ? typeof toast.icon === 'string'
              ? <span className="text-xl">{toast.icon}</span>
              : toast.icon
            : getVariantIcon(toast.variant)
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {toast.message}
          </div>
          {toast.description && (
            <div className="mt-1 text-xs opacity-90">
              {toast.description}
            </div>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={cn(
                "mt-2 px-3 py-1 text-xs font-medium rounded transition-colors",
                toast.variant === 'success' && "bg-green-600 text-white hover:bg-green-700",
                toast.variant === 'error' && "bg-red-600 text-white hover:bg-red-700",
                toast.variant === 'warning' && "bg-amber-600 text-white hover:bg-amber-700",
                toast.variant === 'info' && "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
