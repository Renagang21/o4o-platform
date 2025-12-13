/**
 * AGButton - Antigravity Design System Button
 *
 * Phase 7-A: Core button component
 *
 * Features:
 * - Multiple variants: primary, secondary, outline, danger
 * - Sizes: sm, md, lg
 * - Loading state with spinner
 * - Disabled state
 * - Icon support (left/right)
 * - Full width option
 */

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { tokens } from '../theme/tokens';

export type AGButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type AGButtonSize = 'sm' | 'md' | 'lg';

export interface AGButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AGButtonVariant;
  size?: AGButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const variantStyles: Record<AGButtonVariant, string> = {
  primary: `
    bg-blue-600 text-white border-transparent
    hover:bg-blue-700 active:bg-blue-800
    focus:ring-blue-500
    disabled:bg-blue-300
  `,
  secondary: `
    bg-gray-100 text-gray-700 border-gray-200
    hover:bg-gray-200 active:bg-gray-300
    focus:ring-gray-400
    disabled:bg-gray-50 disabled:text-gray-400
  `,
  outline: `
    bg-transparent text-gray-700 border-gray-300
    hover:bg-gray-50 active:bg-gray-100
    focus:ring-gray-400
    disabled:text-gray-300 disabled:border-gray-200
  `,
  danger: `
    bg-red-600 text-white border-transparent
    hover:bg-red-700 active:bg-red-800
    focus:ring-red-500
    disabled:bg-red-300
  `,
  ghost: `
    bg-transparent text-gray-600 border-transparent
    hover:bg-gray-100 hover:text-gray-900
    focus:ring-gray-400
    disabled:text-gray-300
  `,
};

const sizeStyles: Record<AGButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

const Spinner: React.FC<{ size: AGButtonSize }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export const AGButton = forwardRef<HTMLButtonElement, AGButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      iconLeft,
      iconRight,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-md border
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:cursor-not-allowed
    `;

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

AGButton.displayName = 'AGButton';

export default AGButton;
