import React from 'react';
import { twMerge } from 'tailwind-merge';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarVariant = 'circle' | 'square' | 'rounded';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  icon?: ReactNode;
  size?: AvatarSize;
  variant?: AvatarVariant;
  className?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  onClick?: () => void;
}

const Avatar: FC<AvatarProps> = ({
  src,
  alt,
  initials,
  icon,
  size = 'md',
  variant = 'circle',
  className,
  status,
  onClick,
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const variantStyles = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const statusStyles = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const statusSizeStyles = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const baseStyles = 'relative inline-flex items-center justify-center bg-gray-200 text-gray-600 overflow-hidden';

  const content = () => {
    if (src) {
      return (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full object-cover"
        />
      );
    }

    if (initials) {
      return (
        <span className="font-medium">
          {initials.toUpperCase()}
        </span>
      );
    }

    if (icon) {
      return icon;
    }

    return (
      <svg
        className="w-1/2 h-1/2 text-gray-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div
      className={twMerge(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content()}
      {status && (
        <span
          className={twMerge(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            statusStyles[status],
            statusSizeStyles[size]
          )}
        />
      )}
    </div>
  );
};

export default Avatar; 