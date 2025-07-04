import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'destructive'
  | 'warning'
  | 'info'
  | 'vip'
  | 'premium'
  | 'member'
  | 'b2b';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  dot = false,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    destructive: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-500 text-white',
    vip: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
    premium: 'bg-gradient-to-r from-gray-400 to-blue-600 text-white',
    member: 'bg-gray-600 text-white',
    b2b: 'bg-gradient-to-r from-gray-800 to-blue-800 text-white'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  const badgeStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  return (
    <span className={badgeStyles}>
      {dot && (
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
};

export { Badge, type BadgeProps, type BadgeVariant, type BadgeSize };
export default Badge; 