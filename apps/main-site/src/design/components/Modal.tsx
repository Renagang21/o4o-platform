/**
 * Design System - Modal Component
 *
 * Modal dialog for overlays and popups
 */

import { forwardRef, useEffect } from 'react';
import { cn } from '../utils/classnames';

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      size = 'md',
      closeOnEscape = true,
      closeOnBackdropClick = true,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };

    useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose?.();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, onClose]);

    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeOnBackdropClick ? onClose : undefined}
        />

        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            'relative bg-white rounded-lg shadow-2xl w-full mx-4',
            sizeStyles[size],
            className
          )}
          {...rest}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export const ModalHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('border-b border-neutral-200 px-6 py-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
});

ModalHeader.displayName = 'ModalHeader';

export const ModalBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <div ref={ref} className={cn('px-6 py-4', className)} {...rest}>
      {children}
    </div>
  );
});

ModalBody.displayName = 'ModalBody';

export const ModalFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'border-t border-neutral-200 px-6 py-4 flex items-center justify-end gap-2',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

ModalFooter.displayName = 'ModalFooter';
