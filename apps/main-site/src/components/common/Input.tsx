import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Input: FC<InputProps> = ({
  variant = 'default',
  size = 'md',
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    default: 'border-gray-300 focus:border-primary focus:ring-primary',
    outlined: 'border-2 border-primary focus:ring-primary',
    filled: 'bg-gray-50 border-gray-200 focus:border-primary focus:ring-primary'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const stateStyles = {
    error: 'border-danger focus:border-danger focus:ring-danger',
    disabled: 'bg-gray-100 text-gray-500 cursor-not-allowed'
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  const inputStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    error ? stateStyles.error : '',
    disabled ? stateStyles.disabled : '',
    widthStyles,
    className
  );

  return (
    <div className={`space-y-1 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={twMerge(
            inputStyles,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10'
          )}
          disabled={disabled}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={`text-sm ${error ? 'text-danger' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input; 