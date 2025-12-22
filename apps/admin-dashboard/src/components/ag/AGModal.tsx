/**
 * AGModal - Modal Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Center/fullscreen modes
 * - Focus trap
 * - ESC key close
 * - Confirm modal variant
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type AGModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface AGModalProps {
  /** Open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal size */
  size?: AGModalSize;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on ESC key */
  closeOnEsc?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Modal content */
  children: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Custom class name */
  className?: string;
  /** Content class name */
  contentClassName?: string;
  /** Centered content */
  centered?: boolean;
}

const sizeClasses: Record<AGModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]',
};

export function AGModal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  children,
  footer,
  className = '',
  contentClassName = '',
  centered = true,
}: AGModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';

      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-gray-900/50 transition-opacity
          ${centered ? 'flex items-center justify-center p-4' : 'pt-16 pb-4 px-4'}
        `}
        onClick={handleOverlayClick}
      >
        {/* Modal panel */}
        <div
          ref={modalRef}
          tabIndex={-1}
          className={`
            relative bg-white rounded-lg shadow-xl
            w-full ${sizeClasses[size]}
            ${size === 'full' ? 'flex flex-col' : ''}
            transform transition-all
            ${className}
          `}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-4 border-b border-gray-200">
              <div>
                {title && (
                  <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`p-4 ${size === 'full' ? 'flex-1 overflow-y-auto' : ''} ${contentClassName}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/**
 * AGConfirmModal - Confirmation Dialog
 */
export interface AGConfirmModalProps {
  /** Open state (preferred) */
  isOpen?: boolean;
  /** Open state (alias for isOpen) */
  open?: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm handler */
  onConfirm: () => void | Promise<void>;
  /** Modal title */
  title: string;
  /** Confirmation message */
  message?: string;
  /** Confirmation message (alias for message) */
  description?: string;
  /** Confirm button text */
  confirmLabel?: string;
  /** Confirm button text (alias for confirmLabel) */
  confirmText?: string;
  /** Cancel button text */
  cancelLabel?: string;
  /** Cancel button text (alias for cancelLabel) */
  cancelText?: string;
  /** Confirm button variant */
  variant?: 'primary' | 'danger' | 'destructive' | string;
  /** Confirm button variant (alias for variant) */
  confirmVariant?: string;
  /** Loading state */
  loading?: boolean;
}

export function AGConfirmModal({
  isOpen,
  open,
  onClose,
  onConfirm,
  title,
  message: messageProp,
  description,
  confirmLabel: confirmLabelProp,
  confirmText,
  cancelLabel: cancelLabelProp,
  cancelText,
  variant: variantProp,
  confirmVariant,
  loading = false,
}: AGConfirmModalProps) {
  // Support alias props
  const isModalOpen = isOpen ?? open ?? false;
  const message = messageProp ?? description ?? '';
  const confirmLabel = confirmLabelProp ?? confirmText ?? '확인';
  const cancelLabel = cancelLabelProp ?? cancelText ?? '취소';
  const rawVariant = variantProp ?? confirmVariant ?? 'primary';
  const variant: 'primary' | 'danger' = rawVariant === 'danger' || rawVariant === 'destructive' ? 'danger' : 'primary';
  const confirmButtonClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <AGModal
      isOpen={isModalOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      centered
    >
      <div className="text-center sm:text-left">
        {/* Icon */}
        <div
          className={`
            mx-auto sm:mx-0 flex items-center justify-center
            w-12 h-12 rounded-full mb-4
            ${variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'}
          `}
        >
          {variant === 'danger' ? (
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-gray-500">{message}</p>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="
            w-full sm:w-auto px-4 py-2 text-sm font-medium
            text-gray-700 bg-white border border-gray-300 rounded-md
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`
            w-full sm:w-auto px-4 py-2 text-sm font-medium
            text-white rounded-md
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
            ${confirmButtonClasses}
          `}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {confirmLabel}
        </button>
      </div>
    </AGModal>
  );
}

export default AGModal;
