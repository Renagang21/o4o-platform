import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type ChipVariant = 'filled' | 'outlined' | 'soft';
export type ChipColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
export type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  label: ReactNode;
  variant?: ChipVariant;
  color?: ChipColor;
  size?: ChipSize;
  className?: string;
  icon?: ReactNode;
  onDelete?: () => void;
  onClick?: () => void;
  disabled?: boolean;
}

const Chip: FC<ChipProps> = ({
  label,
  variant = 'filled',
  color = 'primary',
  size = 'md',
  className,
  icon,
  onDelete,
  onClick,
  disabled = false,
}) => {
  const sizeStyles = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };

  const colorStyles = {
    primary: {
      filled: 'bg-primary text-white',
      outlined: 'border border-primary text-primary',
      soft: 'bg-primary/10 text-primary',
    },
    secondary: {
      filled: 'bg-gray-500 text-white',
      outlined: 'border border-gray-500 text-gray-500',
      soft: 'bg-gray-100 text-gray-700',
    },
    success: {
      filled: 'bg-green-500 text-white',
      outlined: 'border border-green-500 text-green-500',
      soft: 'bg-green-50 text-green-700',
    },
    danger: {
      filled: 'bg-red-500 text-white',
      outlined: 'border border-red-500 text-red-500',
      soft: 'bg-red-50 text-red-700',
    },
    warning: {
      filled: 'bg-yellow-500 text-white',
      outlined: 'border border-yellow-500 text-yellow-500',
      soft: 'bg-yellow-50 text-yellow-700',
    },
    info: {
      filled: 'bg-blue-500 text-white',
      outlined: 'border border-blue-500 text-blue-500',
      soft: 'bg-blue-50 text-blue-700',
    },
  };

  const iconSizeStyles = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={twMerge(
        'inline-flex items-center rounded-full font-medium',
        sizeStyles[size],
        colorStyles[color][variant],
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={!disabled && onClick ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && (
        <span className={twMerge('mr-1', iconSizeStyles[size])}>
          {icon}
        </span>
      )}
      <span>{label}</span>
      {onDelete && !disabled && (
        <button
          type="button"
          className={twMerge(
            'ml-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
            iconSizeStyles[size]
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <span className="sr-only">삭제</span>
          <svg
            className="w-full h-full"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Chip; 