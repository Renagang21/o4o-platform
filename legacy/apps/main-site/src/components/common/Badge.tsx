import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'vip'
  | 'premium'
  | 'member'
  | 'b2b';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const Badge: FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  dot = false,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variantStyles = {
    primary: 'bg-primary text-white',
    secondary: 'bg-primary-light text-primary',
    success: 'bg-success text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    info: 'bg-info text-white',
    vip: 'bg-gradient-to-r from-vip-gold to-vip-orange text-white',
    premium: 'bg-gradient-to-r from-premium-silver to-premium-blue text-white',
    member: 'bg-member-gray text-white',
    b2b: 'bg-gradient-to-r from-b2b-dark to-b2b-blue text-white'
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

export default Badge; 