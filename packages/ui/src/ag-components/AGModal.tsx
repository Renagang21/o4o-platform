/**
 * AGModal - Antigravity Design System Modal
 *
 * Phase 7-A: Core modal/dialog component
 *
 * Features:
 * - Open/close control
 * - Header/body/footer slots
 * - Confirm/cancel actions
 * - Overlay click behavior (close on click outside)
 * - Multiple sizes
 * - Escape key to close
 */

import React, { useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type AGModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface AGModalProps {
  /** Open state (preferred) */
  open?: boolean;
  /** Open state (alias for open) */
  isOpen?: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AGModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeStyles: Record<AGModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function AGModal({
  open: openProp,
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}: AGModalProps) {
  // Support both open and isOpen
  const open = openProp ?? isOpen ?? false;
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Content */}
        <div
          className={`
            relative w-full ${sizeStyles[size]}
            bg-white rounded-lg shadow-xl
            transform transition-all
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors ml-auto"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

// Convenience components for common patterns
export interface AGConfirmModalProps {
  /** Open state (preferred) */
  open?: boolean;
  /** Open state (alias for open) */
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  /** Message content */
  message?: ReactNode;
  /** Message content (alias for message) */
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Confirm button variant (preferred) */
  confirmVariant?: 'primary' | 'danger' | string;
  /** Confirm button variant (alias for confirmVariant) */
  variant?: string;
  loading?: boolean;
}

export function AGConfirmModal({
  open: openProp,
  isOpen,
  onClose,
  onConfirm,
  title = '확인',
  message: messageProp,
  description,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant: confirmVariantProp,
  variant,
  loading = false,
}: AGConfirmModalProps) {
  // Support alias props
  const open = openProp ?? isOpen ?? false;
  const message = messageProp ?? description ?? '';
  const rawVariant = confirmVariantProp ?? variant ?? 'primary';
  const confirmVariant: 'primary' | 'danger' = rawVariant === 'danger' ? 'danger' : 'primary';
  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <AGModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${confirmButtonClass}`}
          >
            {loading ? '처리 중...' : confirmText}
          </button>
        </div>
      }
    >
      <p className="text-gray-600">{message}</p>
    </AGModal>
  );
}

export default AGModal;
