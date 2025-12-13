/**
 * AGTag - Antigravity Design System Tag/Badge
 *
 * Phase 7-A: Core tag component for status display
 *
 * Features:
 * - Multiple color variants
 * - Sizes: sm, md
 * - Optional close button
 * - Dot indicator option
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';

export type AGTagColor =
  | 'gray'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'pink'
  | 'indigo';

export type AGTagSize = 'sm' | 'md';

export interface AGTagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: AGTagColor;
  size?: AGTagSize;
  variant?: 'solid' | 'outline' | 'subtle';
  dot?: boolean;
  closable?: boolean;
  onClose?: () => void;
  icon?: ReactNode;
}

const colorStyles: Record<AGTagColor, Record<'solid' | 'outline' | 'subtle', string>> = {
  gray: {
    solid: 'bg-gray-600 text-white',
    outline: 'border-gray-300 text-gray-700 bg-white',
    subtle: 'bg-gray-100 text-gray-700',
  },
  blue: {
    solid: 'bg-blue-600 text-white',
    outline: 'border-blue-300 text-blue-700 bg-white',
    subtle: 'bg-blue-50 text-blue-700',
  },
  green: {
    solid: 'bg-green-600 text-white',
    outline: 'border-green-300 text-green-700 bg-white',
    subtle: 'bg-green-50 text-green-700',
  },
  yellow: {
    solid: 'bg-yellow-500 text-white',
    outline: 'border-yellow-300 text-yellow-700 bg-white',
    subtle: 'bg-yellow-50 text-yellow-700',
  },
  red: {
    solid: 'bg-red-600 text-white',
    outline: 'border-red-300 text-red-700 bg-white',
    subtle: 'bg-red-50 text-red-700',
  },
  purple: {
    solid: 'bg-purple-600 text-white',
    outline: 'border-purple-300 text-purple-700 bg-white',
    subtle: 'bg-purple-50 text-purple-700',
  },
  pink: {
    solid: 'bg-pink-600 text-white',
    outline: 'border-pink-300 text-pink-700 bg-white',
    subtle: 'bg-pink-50 text-pink-700',
  },
  indigo: {
    solid: 'bg-indigo-600 text-white',
    outline: 'border-indigo-300 text-indigo-700 bg-white',
    subtle: 'bg-indigo-50 text-indigo-700',
  },
};

const dotColors: Record<AGTagColor, string> = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
};

const sizeStyles: Record<AGTagSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const AGTag = forwardRef<HTMLSpanElement, AGTagProps>(
  (
    {
      color = 'gray',
      size = 'md',
      variant = 'subtle',
      dot = false,
      closable = false,
      onClose,
      icon,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center gap-1.5
      font-medium rounded-full
      ${variant === 'outline' ? 'border' : ''}
    `;

    const classes = [
      baseStyles,
      colorStyles[color][variant],
      sizeStyles[size],
      className,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <span ref={ref} className={classes} {...props}>
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              variant === 'solid' ? 'bg-current opacity-70' : dotColors[color]
            }`}
          />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {closable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="flex-shrink-0 ml-0.5 hover:opacity-70 transition-opacity"
            aria-label="Remove"
          >
            <svg
              className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
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
      </span>
    );
  }
);

AGTag.displayName = 'AGTag';

export default AGTag;
