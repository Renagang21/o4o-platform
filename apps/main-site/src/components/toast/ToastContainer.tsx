/**
 * ToastContainer Component
 * HP-1: Toast System 전역화
 *
 * Renders toast notifications grouped by position
 */

import React, { useMemo } from 'react';
import { useToastContext } from '@/contexts/ToastProvider';
import { ToastItem } from './ToastItem';
import { Toast, ToastPosition } from '@/types/toast';
import { cn } from '@/lib/utils';

/**
 * Get positioning classes for toast container
 */
function getPositionClasses(position: ToastPosition): string {
  switch (position) {
    case 'top-right':
      return 'top-4 right-4 items-end';
    case 'top-left':
      return 'top-4 left-4 items-start';
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2 items-center';
    case 'bottom-right':
      return 'bottom-4 right-4 items-end';
    case 'bottom-left':
      return 'bottom-4 left-4 items-start';
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2 items-center';
    default:
      return 'top-4 right-4 items-end';
  }
}

/**
 * ToastContainer Component
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToastContext();

  /**
   * Group toasts by position
   */
  const toastsByPosition = useMemo(() => {
    const grouped = new Map<ToastPosition, Toast[]>();

    toasts.forEach(toast => {
      const position = toast.position;
      if (!grouped.has(position)) {
        grouped.set(position, []);
      }
      grouped.get(position)!.push(toast);
    });

    return grouped;
  }, [toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      {Array.from(toastsByPosition.entries()).map(([position, positionToasts]) => (
        <div
          key={position}
          className={cn(
            "fixed z-50 flex flex-col gap-2 pointer-events-none",
            "w-full max-w-md px-4",
            getPositionClasses(position)
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {positionToasts.map(toast => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
            />
          ))}
        </div>
      ))}
    </>
  );
};
