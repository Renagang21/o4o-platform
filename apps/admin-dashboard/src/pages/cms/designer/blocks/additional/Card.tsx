/**
 * Additional Block - Card
 *
 * Card container with optional header/footer
 */

import { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  children?: ReactNode;
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export default function Card({
  title,
  subtitle,
  padding = 'md',
  shadow = 'md',
  bordered = true,
  children,
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg ${paddingClasses[padding]} ${shadowClasses[shadow]} ${
        bordered ? 'border border-gray-200' : ''
      }`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      <div>
        {children || (
          <div className="text-gray-500 text-center py-8">
            Card content goes here
          </div>
        )}
      </div>
    </div>
  );
}
